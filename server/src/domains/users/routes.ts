import { Router } from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import * as userController from "./controller.js";

const router = Router();

router.use(authenticate);

router.patch("/email", userController.updateEmail);

export default router;