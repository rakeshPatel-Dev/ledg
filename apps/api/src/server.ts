import "./config/env.js";

import { APP_NAME } from "@ledg/shared";

import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./database/index.js";

export default app;

async function startLocalServer() {
  await connectDatabase();
  console.log("Database connected successfully");

  const port = Number(process.env.PORT ?? 3000);
  const server = app.listen(port, () => {
    console.log(`${APP_NAME} API listening on port ${port}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      try {
        await disconnectDatabase();
        console.log("Database connection closed");
      } catch (error) {
        console.error("Error closing database connection", error);
      } finally {
        process.exit(0);
      }
    });

    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

if (!process.env.VERCEL) {
  startLocalServer().catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
}
