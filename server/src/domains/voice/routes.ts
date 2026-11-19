import { Router } from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { voiceTurnLimiter } from "../../common/middlewares/rate-limit.js";
import * as voiceController from "./controller.js";

const router = Router();

router.use(authenticate);
router.post("/turn", voiceTurnLimiter, voiceController.turn);
router.post("/audio", voiceTurnLimiter, voiceController.audio);

export default router;
