import express from "express";
import cors from "cors";

import apiRoutes from "./routes.js";
import {
  errorHandler,
  notFoundHandler,
} from "./common/middlewares/error-handler.js";

// CORS_ORIGIN accepts a comma-separated list of allowed origins.
// Example: "https://ledg-web.vercel.app,https://www.ledg.app"
// Leave unset in dev to allow all origins.
const rawOrigins = process.env.CORS_ORIGIN;
const allowedOrigins = rawOrigins
  ? rawOrigins.split(",").map((o) => o.trim())
  : null;

const app = express();

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
      : "*",
    credentials: true,
  })
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/v1", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;