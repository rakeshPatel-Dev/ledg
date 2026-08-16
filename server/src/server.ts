import "./config/env.js";
import { validateEnv } from "./config/env.js";
import { logger } from "./config/logger.js";

import { APP_NAME } from "./shared/index.js";

import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./database/index.js";

export default app;

async function startLocalServer() {
  validateEnv();
  await connectDatabase();
  logger.info("Database connected successfully");

  const port = Number(process.env.PORT ?? 3000);
  const server = app.listen(port, () => {
    logger.info({ port }, `${APP_NAME} API listening`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down gracefully");
    server.close(async () => {
      try {
        await disconnectDatabase();
        logger.info("Database connection closed");
      } catch (error) {
        logger.error({ error }, "Error closing database connection");
      } finally {
        process.exit(0);
      }
    });

    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

if (!process.env.VERCEL) {
  startLocalServer().catch((error) => {
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  });
}