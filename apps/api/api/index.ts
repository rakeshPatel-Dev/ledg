import "./config/env.js";

import app from "../src/app.js";
import { connectDatabase } from "../src/database/index.js";

// Cache the DB connection across serverless warm invocations
let isConnected = false;

export default async function handler(req: Request, res: Response) {
  if (!isConnected) {
    await connectDatabase();
    isConnected = true;
  }

  // @ts-expect-error — Vercel passes Node-style IncomingMessage/ServerResponse
  return app(req, res);
}
