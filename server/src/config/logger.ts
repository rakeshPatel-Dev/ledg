import { pino } from "pino";

const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  base: isProd ? undefined : { pid: process.pid },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['set-cookie']",
      "req.headers['x-api-key']",
      "*.password",
      "*.token",
      "*.secret",
      "*.apiKey",
      "*.sessionToken",
      "*.headers",
    ],
    censor: "[REDACTED]",
  },
});