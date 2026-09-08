import { Router } from "express";

import spaceRoutes from "./domains/spaces/routes.js";
import transactionRoutes, { allTransactionsRouter } from "./domains/transactions/routes.js";
import analyticsRoutes, { dashboardRouter } from "./domains/analytics/routes.js";
import duesRoutes from "./domains/dues/routes.js";
import userRoutes from "./domains/users/routes.js";
import invitationRoutes from "./domains/invitations/routes.js";
import notificationRoutes, {
  notificationPreferencesRouter,
} from "./domains/notifications/routes.js";

const router = Router();

router.use("/transactions", allTransactionsRouter);
router.use("/spaces", spaceRoutes);
router.use("/spaces/:spaceId/transactions", transactionRoutes);
router.use("/spaces/:spaceId/analytics", analyticsRoutes);
router.use("/dashboard", dashboardRouter);
router.use("/dues", duesRoutes);
router.use("/invitations", invitationRoutes);
router.use("/notifications", notificationRoutes);
router.use("/me/notification-preferences", notificationPreferencesRouter);
router.use("/me", userRoutes);

export default router;