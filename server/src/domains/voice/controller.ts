import type { Response } from "express";

import { asyncHandler } from "../../common/utils/async-handler.js";
import type { AuthRequest } from "../../common/middlewares/authenticate.js";
import { handleVoiceAudioTurn, handleVoiceTurn } from "./service.js";
import { validateVoiceAudioTurn, validateVoiceTurn } from "./validator.js";

export const turn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = validateVoiceTurn(req.body);
  const data = await handleVoiceTurn(input);

  res.json({ success: true, data });
});

export const audio = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = validateVoiceAudioTurn(req.body);
  const data = await handleVoiceAudioTurn(input);

  res.json({ success: true, data });
});
