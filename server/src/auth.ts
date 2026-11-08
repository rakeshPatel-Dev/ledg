import { betterAuth } from "better-auth";
import { customSession } from "better-auth/plugins";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import mongoose from "mongoose";

import { connectDatabase } from "./database/index.js";
import { logger } from "./config/logger.js";
import {
  deleteUserWithData,
  upsertUserFromAuth,
  generateUsername,
  authUserFilter,
  type AuthUser,
} from "./domains/users/repository.js";
import { UserModel } from "./domains/users/model.js";
import { ensureDefaultSpace } from "./domains/spaces/repository.js";
import { sendVerificationEmail } from "./lib/email.js";

function getTrustedOrigins(): string[] {
  const origins = new Set<string>();

  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    corsOrigin
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
      .forEach((origin) => origins.add(origin));
  }

  if (process.env.FRONTEND_ORIGIN) {
    origins.add(process.env.FRONTEND_ORIGIN);
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:5173");
  }

  return [...origins];
}

/**
 * Write fields onto the Better Auth `user` document. These are the fields the
 * cookie cache serialises, so keeping them in sync is what lets `customSession`
 * avoid a Mongo lookup on every request.
 */
async function syncAuthUserFields(
  betterAuthId: string,
  fields: Record<string, unknown>
): Promise<void> {
  try {
    const db = mongoose.connection
      .getClient()
      .db(process.env.MONGODB_DB_NAME);
    await db
      .collection("user")
      .updateOne(authUserFilter(betterAuthId), { $set: fields });
  } catch (error) {
    logger.warn({ error }, "Failed to sync auth user fields");
  }
}

/**
 * Generate a unique username, persist it on the app User, and mirror it onto
 * the auth user so subsequent sessions can read it from the cookie cache.
 */
async function allocateAndPersistUsername(
  user: { id: string; email?: string | null; name?: string | null },
  domainUserId?: mongoose.Types.ObjectId
): Promise<string> {
  const emailPrefix =
    (user.email ?? "").split("@")[0] || user.name || "user";
  const username = await generateUsername(emailPrefix);

  if (domainUserId) {
    await UserModel.updateOne(
      { _id: domainUserId },
      { $set: { username } }
    ).catch(() => null);
  }

  await syncAuthUserFields(user.id, { username });

  return username;
}

async function createAuth() {
  await connectDatabase();

  const client = mongoose.connection.getClient();
  const db = client.db(process.env.MONGODB_DB_NAME);

  const isProd = process.env.NODE_ENV === "production";

  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    database: mongodbAdapter(db, { client, transaction: false }),

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      requireEmailVerification: true,
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 3600,
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerificationEmail({ email: user.email, url });
      },
    },

    socialProviders:
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              scope: ["openid", "email", "profile"],
              mapProfileToUser: (profile) => {
                // Google's OIDC profile includes `picture` for the avatar.
                // BetterAuth's GoogleProfile type doesn't declare it, so we
                // access it safely via the raw profile object.
                const raw = profile as unknown as { picture?: string; given_name?: string };
                logger.info(
                  { picture: raw.picture, name: profile.name },
                  "Google profile mapped to user"
                );
                return {
                  image: raw.picture ?? undefined,
                  name: profile.name ?? raw.given_name ?? "",
                };
              },
            },
          }
        : {},

    user: {
      additionalFields: {
        username: {
          type: "string",
          required: false,
          defaultValue: null,
          input: true,
        },
        // The app User `_id` that transactions and spaces reference. Written by
        // the database hooks below, never accepted from the client. Keeping it
        // on the auth user means the cookie cache carries it, so `customSession`
        // can skip a DB lookup on the hot path.
        userId: {
          type: "string",
          required: false,
          defaultValue: null,
          input: false,
        },
      },
      deleteUser: {
        enabled: true,
      },
    },

    plugins: [
      customSession(async ({ user, session }) => {
        // The app's User `_id` is what transactions and spaces reference, so the
        // session carries it next to the Better Auth id; the client needs it to
        // tell "my" transactions from a member's.
        //
        // Both fields are additional fields on the auth user, so once they are
        // populated the cookie cache supplies them and this callback never
        // touches Mongo. The lookup below is the self-healing fallback for
        // users created before those fields existed.
        const sessionUser = user as unknown as {
          username?: string | null;
          userId?: string | null;
        };

        let username = sessionUser.username ?? null;
        let userId = sessionUser.userId ?? null;

        if (!username || !userId) {
          const domainUser = await UserModel.findOne({ betterAuthId: user.id })
            .select("_id username")
            .lean() as {
            _id: mongoose.Types.ObjectId;
            username?: string | null;
          } | null;

          if (!username) {
            username =
              domainUser?.username ??
              (await allocateAndPersistUsername(user, domainUser?._id));
          }

          if (!userId && domainUser?._id) {
            userId = domainUser._id.toString();
            await syncAuthUserFields(user.id, { userId });
          }
        }

        return {
          user: {
            ...user,
            username,
            userId,
          },
          session,
        };
      }),
    ],

    session: {
      freshAge: 0,
      // Serve the session from a signed cookie for 5 minutes instead of
      // hitting Mongo on every request. Revocations become visible within the
      // cache window, which is an acceptable trade for the latency win.
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
        strategy: "compact",
      },
    },

    trustedOrigins: getTrustedOrigins(),

    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            try {
              const domainUserId = await upsertUserFromAuth(
                user as unknown as AuthUser & { username?: string | null }
              );
              await syncAuthUserFields(user.id, {
                userId: String(domainUserId),
              });
              await ensureDefaultSpace({
                userId: domainUserId,
                email: user.email ?? "",
                name: user.name ?? "Ledg User",
                username:
                  (user as unknown as { username?: string | null }).username ??
                  null,
              });
            } catch (error) {
              logger.error({ error }, "Failed to sync app user on create");
            }
          },
        },
        update: {
          after: async (user) => {
            try {
              const domainUserId = await upsertUserFromAuth(
                user as unknown as AuthUser & { username?: string | null }
              );
              await syncAuthUserFields(user.id, {
                userId: String(domainUserId),
              });
            } catch (error) {
              logger.error({ error }, "Failed to sync app user on update");
            }
          },
        },
        delete: {
          before: async (user) => {
            const domainUser = await UserModel.findOne({ betterAuthId: user.id }).select("_id").lean();
            if (domainUser) {
              const ownedShared = await mongoose.model("Space").countDocuments({
                ownerId: domainUser._id,
                isShared: true,
              });
              if (ownedShared > 0) {
                throw new Error(
                  "Cannot delete account while you own shared spaces with other members. Please transfer ownership or delete those spaces first."
                );
              }
            }
          },
          after: async (user) => {
            try {
              await deleteUserWithData(user.id);
            } catch (error) {
              logger.error({ error }, "Failed to delete app user data");
            }
          },
        },

      },
    },

    advanced: {
      defaultCookieAttributes: {
        sameSite: isProd ? "none" : "lax",
        secure: isProd,
        httpOnly: true,
      },
      cookiePrefix: "ledg",
    },
  });
}

type Auth = Awaited<ReturnType<typeof createAuth>>;

let authPromise: Promise<Auth> | null = null;

export function getAuth(): Promise<Auth> {
  if (!authPromise) {
    authPromise = createAuth().catch((error) => {
      authPromise = null;
      throw error;
    });
  }
  return authPromise;
}
