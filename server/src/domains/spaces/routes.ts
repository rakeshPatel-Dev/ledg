import { Router } from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { sensitiveActionLimiter } from "../../common/middlewares/rate-limit.js";
import * as spaceController from "./controller.js";

const router = Router();

router.use(authenticate);

router.post("/", spaceController.createSpace);
router.get("/", spaceController.listSpaces);
router.get("/:id", spaceController.getSpace);
router.put("/:id", spaceController.updateSpace);
router.delete("/:id", spaceController.deleteSpace);

// Member management routes
router.get("/:id/members", spaceController.getMembers);
router.get("/:id/invitations", spaceController.getSpaceInvitations);
router.post(
  "/:id/members/invite",
  sensitiveActionLimiter,
  spaceController.inviteMember
);
router.delete("/:id/members/:userId", spaceController.removeMember);
router.post(
  "/:id/transfer-ownership",
  sensitiveActionLimiter,
  spaceController.transferOwnership
);
router.post("/:id/leave", spaceController.leaveSpace);

export default router;