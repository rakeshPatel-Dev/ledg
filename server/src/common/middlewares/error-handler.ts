import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

import { AppError } from "../errors/index.js";
import { logger } from "../../config/logger.js";
import { captureException } from "../../config/error-tracking.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: "Route not found",
    errors: [],
  });
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    });
    return;
  }

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      captureException(error, { method: req.method, path: req.originalUrl });
    }
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: [],
    });
    return;
  }

  // Log the error with pino (sensitive fields redacted via logger config).
  logger.error({ error }, "Unhandled error");
  captureException(error, { method: req.method, path: req.originalUrl });
  res.status(500).json({
    success: false,
    message: "Internal server error",
    errors: [],
  });
}
