import { Router } from "express";

import spaceRoutes from "./domains/spaces/routes.js";
import transactionRoutes from "./domains/transactions/routes.js";
import analyticsRoutes from "./domains/analytics/routes.js";
import userRoutes from "./domains/users/routes.js";

const router = Router();

router.use("/spaces", spaceRoutes);
router.use("/spaces/:spaceId/transactions", transactionRoutes);
router.use("/spaces/:spaceId/analytics", analyticsRoutes);
router.use("/me", userRoutes);

export default router;