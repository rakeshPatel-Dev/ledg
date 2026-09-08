import { Router } from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import * as notificationController from "./controller.js";

const router = Router();

router.use(authenticate);

router.get("/", notificationController.getNotifications);
router.patch("/:id/read", notificationController.markNotificationRead);
router.post("/read-all", notificationController.markAllRead);

export const notificationPreferencesRouter = Router();
notificationPreferencesRouter.use(authenticate);
notificationPreferencesRouter.get("/", notificationController.getPreferences);
notificationPreferencesRouter.put("/", notificationController.updatePreferences);

export default router;
