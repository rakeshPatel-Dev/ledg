import type { Request, Response } from "express";

import { asyncHandler } from "../../common/utils/async-handler.js";
import type { AuthRequest } from "../../common/middlewares/authenticate.js";
import * as invitationService from "./service.js";
import { UserModel } from "../users/model.js";
import { NotFoundError } from "../../common/errors/index.js";

async function getAuthUserInfo(req: AuthRequest) {
  const user = await UserModel.findById(req.userId).lean();
  if (!user) throw new NotFoundError("User");
  return {
    userId: user._id,
    name: user.name || "Ledg User",
    email: user.email,
    username: user.username ?? null,
  };
}

export const getPendingForUser = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = await getAuthUserInfo(req);
    const invitations = await invitationService.listPendingInvitationsForEmail(
      user.email,
      user.userId
    );

    res.json({ success: true, data: { invitations } });
  }
);

export const getPreviewByToken = asyncHandler(
  async (req: Request, res: Response) => {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    const preview = await invitationService.getInvitationPreviewByToken(String(token));

    res.json({ success: true, data: { preview } });
  }
);

export const acceptByToken = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      res.status(400).json({ success: false, message: "Token is required" });
      return;
    }

    const user = await getAuthUserInfo(req);
    const result = await invitationService.acceptInvitationByToken(token, user);

    res.json({ success: true, data: result });
  }
);

export const rejectByToken = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      res.status(400).json({ success: false, message: "Token is required" });
      return;
    }

    const user = await getAuthUserInfo(req);
    const result = await invitationService.rejectInvitationByToken(token, user);

    res.json({ success: true, data: result });
  }
);

export const acceptById = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await getAuthUserInfo(req);
    const result = await invitationService.acceptInvitationById(String(id), user);

    res.json({ success: true, data: result });
  }
);

export const rejectById = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await getAuthUserInfo(req);
    const result = await invitationService.rejectInvitation(String(id), user);

    res.json({ success: true, data: result });
  }
);

export const resendById = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await invitationService.resendInvitation(String(id), req.userId!);

    res.json({ success: true, data: result });
  }
);

export const cancelById = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await invitationService.cancelInvitation(String(id), req.userId!);

    res.json({ success: true, data: result });
  }
);

