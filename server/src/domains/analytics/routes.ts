import { Router } from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import * as analyticsController from "./controller.js";

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get("/summary", analyticsController.getSummary);
router.get("/recurring", analyticsController.getRecurring);

// Dashboard summary — aggregates across all user spaces
const dashboardRouter = Router();
dashboardRouter.use(authenticate);
dashboardRouter.get("/summary", analyticsController.getDashboardSummary);

export { dashboardRouter };
export default router;
