import { createRequire } from "node:module";
import type { RequestHandler } from "express";

// express-rate-limit is dual ESM/CJS and its type declarations resolve
// differently per module resolution mode; loading the CJS entry via
// createRequire is unambiguous (same pattern as app.ts for helmet).
const require = createRequire(import.meta.url);
type MiddlewareFactory = (options?: Record<string, unknown>) => RequestHandler;
const rateLimit = require("express-rate-limit") as MiddlewareFactory;

// Stricter budget for sensitive account mutations (password/email/username
// changes) than the general 600/15min API limiter.
export const sensitiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts, please try again later.",
    errors: [],
  },
});

// Public read endpoints that touch the DB but require no auth (e.g. invitation
// preview by token). More generous than the mutation limiter but still caps
// automated abuse / DoS volume.
export const publicReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
    errors: [],
  },
});
