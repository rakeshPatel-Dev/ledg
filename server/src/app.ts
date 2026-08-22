import "./config/env.js";
import { validateEnv } from "./config/env.js";

import { createRequire } from "node:module";
import type { RequestHandler } from "express";
import express from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { toNodeHandler } from "better-auth/node";

import apiRoutes from "./routes.js";
import { getAuth } from "./auth.js";
import { logger } from "./config/logger.js";
import {
  errorHandler,
  notFoundHandler,
} from "./common/middlewares/error-handler.js";
import { connectDatabase } from "./database/index.js";
import { csrfProtection } from "./common/middlewares/csrf.js";

validateEnv();

// helmet and express-rate-limit are dual ESM/CJS packages whose type
// declarations resolve to different files depending on the module
// resolution mode; default-importing them can bind the module namespace
// instead of the middleware factory (TS2349). Loading the CJS entry via
// createRequire is unambiguous and stable across build environments.
const require = createRequire(import.meta.url);
type MiddlewareFactory = (options?: Record<string, unknown>) => RequestHandler;
const helmet = require("helmet") as MiddlewareFactory;
const rateLimit = require("express-rate-limit") as MiddlewareFactory;

const isProd = process.env.NODE_ENV === "production";

// CORS_ORIGIN accepts a comma-separated list of allowed origins.
// Example: "https://ledg-web.vercel.app,https://www.ledg.app"
// In development, leave unset to allow all origins (reflects the request
// origin, so credentialed/cookie requests work). In production it is
// required by validateEnv().
const rawOrigins = process.env.CORS_ORIGIN;
const allowedOrigins = rawOrigins
  ? rawOrigins.split(",").map((o) => o.trim())
  : null;

const app = express();

// Trust the first proxy hop (Vercel, ALB, nginx) so req.ip reflects the
// real client IP — required for secure cookies and rate limiting.
if (isProd) {
  app.set("trust proxy", 1);
}

// Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.
app.use(helmet());

// Structured request logging. Custom serializers keep sensitive fields
// (headers, query strings) out of the logs.
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: String(req.url ?? "").split("?")[0],
          remoteAddress: req.remoteAddress,
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

// CORS must be configured before rate limiting so blocked origins don't
// consume rate-limit budget.
app.use(
  cors({
    origin: allowedOrigins
      ? (origin, cb) => {
          // Allow server-to-server calls (origin undefined) and listed origins
          if (!origin || allowedOrigins.includes(origin)) {
            cb(null, true);
          } else {
            cb(new Error(`CORS: origin '${origin}' not allowed`));
          }
        }
      : true, // dev only: reflect any request origin (required for credentials)
    credentials: true,
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
    errors: [],
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
    errors: [],
  },
});

// BetterAuth — mounted BEFORE express.json() so it can read the raw request
// body (it parses the stream itself).
app.all(
  "/api/auth/*splat",
  authLimiter,
  async (req, res, next) => {
    try {
      const auth = await getAuth();
      await toNodeHandler(auth)(req, res);
    } catch (error) {
      next(error);
    }
  }
);

app.use(express.json({ limit: "1mb" }));

// Reuse the Mongo connection across serverless invocations.
app.use(async (_req, _res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/v1", apiLimiter, csrfProtection, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;