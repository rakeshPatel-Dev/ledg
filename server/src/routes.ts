import { Router } from "express";

import spaceRoutes from "./domains/spaces/routes.js";
import transactionRoutes, { allTransactionsRouter } from "./domains/transactions/routes.js";
import analyticsRoutes, { dashboardRouter } from "./domains/analytics/routes.js";
import userRoutes from "./domains/users/routes.js";

const router = Router();

router.use("/transactions", allTransactionsRouter);
router.use("/spaces", spaceRoutes);
router.use("/spaces/:spaceId/transactions", transactionRoutes);
router.use("/spaces/:spaceId/analytics", analyticsRoutes);
router.use("/dashboard", dashboardRouter);
router.use("/me", userRoutes);

export default router;