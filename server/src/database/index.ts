import mongoose from "mongoose";

let cached: Promise<typeof mongoose> | null = null;

export function connectDatabase() {
  const ready = mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2;
  if (ready && cached) {
    return cached;
  }

  const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/ledg";

  cached = mongoose
    .connect(uri, { dbName: process.env.MONGODB_DB_NAME })
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