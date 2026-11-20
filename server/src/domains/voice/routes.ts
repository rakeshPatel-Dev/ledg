import { Router } from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import {
  voiceLiveTokenLimiter,
  voiceSpeechLimiter,
  voiceTurnLimiter,
} from "../../common/middlewares/rate-limit.js";
import * as voiceController from "./controller.js";

const router = Router();

router.use(authenticate);
router.post("/live-token", voiceLiveTokenLimiter, voiceController.liveToken);
router.post("/turn", voiceTurnLimiter, voiceController.turn);
router.post("/audio", voiceTurnLimiter, voiceController.audio);
router.post("/speak", voiceSpeechLimiter, voiceController.speak);

export default router;
