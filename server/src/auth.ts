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
      },
      deleteUser: {
        enabled: true,
      },
    },

    plugins: [
      customSession(async ({ user, session }) => {
        let username = (user as unknown as { username?: string | null }).username;
        if (!username) {
          // Look up in UserModel first
          const domainUser = await UserModel.findOne({ betterAuthId: user.id })
            .select("username")
            .lean() as { username?: string } | null;

          if (domainUser?.username) {
            username = domainUser.username;
          } else {
            const emailPrefix = (user.email ?? "").split("@")[0] || user.name || "user";
            username = await generateUsername(emailPrefix);
            await UserModel.updateOne(
              { betterAuthId: user.id },
              { $set: { username } }
            ).catch(() => null);
          }

          // Backfill to Better Auth user collection
          const db = mongoose.connection.getClient().db(process.env.MONGODB_DB_NAME);
          await db
            .collection("user")
            .updateOne(authUserFilter(user.id), { $set: { username } })
            .catch(() => null);
        }

        return {
          user: {
            ...user,
            username,
          },
          session,
        };
      }),
    ],

    session: {
      freshAge: 0,
    },

    trustedOrigins: getTrustedOrigins(),

    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            try {
              await upsertUserFromAuth(user as unknown as AuthUser & { username?: string | null });
            } catch (error) {
              logger.error({ error }, "Failed to sync app user on create");
            }
          },
        },
        update: {
          after: async (user) => {
            try {
              await upsertUserFromAuth(user as unknown as AuthUser & { username?: string | null });
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
