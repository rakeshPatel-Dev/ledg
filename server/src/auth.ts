import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import mongoose from "mongoose";

import { connectDatabase } from "./database/index.js";
import { logger } from "./config/logger.js";
import {
  deleteUserWithData,
  upsertUserFromAuth,
} from "./domains/users/repository.js";
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
            },
          }
        : {},

    user: {
      deleteUser: {
        enabled: true,
      },
    },

    session: {
      freshAge: 0,
    },

    trustedOrigins: getTrustedOrigins(),

    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            try {
              await upsertUserFromAuth(user);
            } catch (error) {
              logger.error({ error }, "Failed to sync app user on create");
            }
          },
        },
        update: {
          after: async (user) => {
            try {
              await upsertUserFromAuth(user);
            } catch (error) {
              logger.error({ error }, "Failed to sync app user on update");
            }
          },
        },
        delete: {
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
