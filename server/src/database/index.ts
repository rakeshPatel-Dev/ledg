import mongoose from "mongoose";

let cached: Promise<typeof mongoose> | null = null;

export function connectDatabase() {
  const ready = mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2;
  if (ready && cached) {
    return cached;
  }

  const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/ledg";

  // Explicit pool settings matter on serverless: warm instances should reuse
  // connections instead of opening a new handshake per invocation, and idle
  // sockets should not linger past the platform's freeze window.
  cached = mongoose
    .connect(uri, {
      dbName: process.env.MONGODB_DB_NAME,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 60_000,
      connectTimeoutMS: 10_000,
      serverSelectionTimeoutMS: 5_000,
    })
    .catch((error) => {
      cached = null;
      throw error;
    });

  return cached;
}

export function disconnectDatabase(): Promise<void> {
  cached = null;
  return mongoose.disconnect();
}