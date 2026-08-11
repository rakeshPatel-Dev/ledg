import express from "express";
import cors from "cors";

import apiRoutes from "./routes.js";
import {
  errorHandler,
  notFoundHandler,
} from "./common/middlewares/error-handler.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/v1", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;