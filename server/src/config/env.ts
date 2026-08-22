import { config } from "dotenv";

config({ path: ".env.local" });

const PRODUCTION_REQUIRED = [
  "NODE_ENV",
  "MONGODB_URI",
  "MONGODB_DB_NAME",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "CORS_ORIGIN",
  "RESEND_FROM_EMAIL",
];

/**
 * Fails fast when required environment variables are missing in production.
 * In development, sensible localhost defaults are used instead.
 */
export function validateEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const missing = PRODUCTION_REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables in production: ${missing.join(", ")}`
    );
  }
}