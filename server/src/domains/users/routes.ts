import { Router } from "express";

import { authenticate, optionalAuthenticate } from "../../common/middlewares/authenticate.js";
import { sensitiveActionLimiter } from "../../common/middlewares/rate-limit.js";
import * as userController from "./controller.js";

const router = Router();

// Fast public / guest / authenticated username availability check
router.get("/username/check", optionalAuthenticate, userController.checkUsernameAvailable);

router.use(authenticate);

router.get("/profile", userController.getProfile);
router.patch("/profile", userController.updateProfile);
// Sensitive account mutations get a strict rate limit on top of the API limiter
router.patch("/username", sensitiveActionLimiter, userController.updateUsername);
router.patch("/email", sensitiveActionLimiter, userController.updateEmail);
router.post("/password", sensitiveActionLimiter, userController.changePassword);
router.get("/provider", userController.getProvider);

export default router;