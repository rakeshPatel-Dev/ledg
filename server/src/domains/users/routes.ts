import { Router } from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import * as userController from "./controller.js";

const router = Router();

router.use(authenticate);

router.patch("/email", userController.updateEmail);
router.post("/password", userController.changePassword);
router.get("/provider", userController.getProvider);

export default router;