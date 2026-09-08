import { Router } from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import {
  sensitiveActionLimiter,
  publicReadLimiter,
} from "../../common/middlewares/rate-limit.js";
import * as invitationController from "./controller.js";

const router = Router();

// Public preview route (no auth) — rate-limited to prevent abuse/DoS
router.get(
  "/by-token/:token",
  publicReadLimiter,
  invitationController.getPreviewByToken
);

// Protected routes
router.use(authenticate);

router.get("/pending", invitationController.getPendingForUser);
router.post(
  "/by-token/accept",
  sensitiveActionLimiter,
  invitationController.acceptByToken
);

router.post("/by-token/reject", sensitiveActionLimiter, invitationController.rejectByToken);
router.post("/:id/accept", sensitiveActionLimiter, invitationController.acceptById);
router.post("/:id/reject", sensitiveActionLimiter, invitationController.rejectById);
router.post("/:id/resend", sensitiveActionLimiter, invitationController.resendById);
router.delete("/:id", invitationController.cancelById);

export default router;
