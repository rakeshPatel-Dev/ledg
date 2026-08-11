import { Router } from "express";

import spaceRoutes from "./domains/spaces/routes.js";
import transactionRoutes from "./domains/transactions/routes.js";

const router = Router();

router.use("/spaces", spaceRoutes);
router.use("/spaces/:spaceId/transactions", transactionRoutes);

export default router;