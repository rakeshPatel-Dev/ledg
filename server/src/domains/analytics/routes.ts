import { Router } from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import * as analyticsController from "./controller.js";

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get("/summary", analyticsController.getSummary);
router.get("/trends", analyticsController.getTrends);
router.get("/recurring", analyticsController.getRecurring);

export default router;
