import type { NextFunction, Request, Response } from "express";

import { UnauthorizedError } from "../errors/index.js";

/**
 * CSRF protection via Origin/Referer header verification.
 *
 * For cookie-based auth, SameSite cookies are the primary defence.
 * This middleware adds a second layer by verifying that state-changing
 * requests (POST, PUT, PATCH, DELETE) originate from a trusted origin.
 *
 * GET/HEAD/OPTIONS are never blocked.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();

  // Safe methods are never CSRF targets
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // If no Origin or Referer is present, the request is likely server-to-server
  // or from a non-browser client — allow it (auth middleware handles auth).
  if (!origin && !referer) {
    return next();
  }

  const trustedOrigins = getTrustedOrigins();

  // Check Origin header first (most reliable)
  if (origin) {
    try {
      const originHost = new URL(origin).origin;
      if (trustedOrigins.includes(originHost)) {
        return next();
      }
    } catch {
      // Malformed origin — reject
    }
  }

  // Fall back to Referer header
  if (referer) {
    try {
      const refererHost = new URL(referer).origin;
      if (trustedOrigins.includes(refererHost)) {
        return next();
      }
    } catch {
      // Malformed referer — reject
    }
  }

  next(new UnauthorizedError("Request origin not trusted"));
}

function getTrustedOrigins(): string[] {
  const origins: string[] = [];

  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    origins.push(
      ...corsOrigin
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    );
  }

  const frontendOrigin = process.env.FRONTEND_ORIGIN;
  if (frontendOrigin) {
    origins.push(frontendOrigin);
  }

  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:5173");
  }

  return origins;
}
