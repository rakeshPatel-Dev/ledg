import type { Response } from "express";

import { asyncHandler } from "../../common/utils/async-handler.js";
import type { AuthRequest } from "../../common/middlewares/authenticate.js";
import * as spaceService from "./service.js";
import {
  validateCreateSpace,
  validateSpaceId,
  validateUpdateSpace,
  validateMemberInvite,
  validateTransferOwnership,
} from "./validator.js";
import { UserModel } from "../users/model.js";
import { NotFoundError } from "../../common/errors/index.js";
import { listPendingForSpace } from "../invitations/service.js";
import {
  getCachedResponse,
  acquireLease,
  finalizeLease,
  releaseLease,
  validateIdempotencyKey,
} from "./idempotency.js";
import { ConflictError } from "../../common/errors/index.js";

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

/** Poll interval (ms) when waiting for a concurrent request to finish. */
const LEASE_POLL_MS = 100;
const LEASE_POLL_MAX_ATTEMPTS = 50; // ~5 seconds total

export const createSpace = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const data = validateCreateSpace(req.body);
    const idempotencyKey = req.header("Idempotency-Key");

    if (idempotencyKey) {
      validateIdempotencyKey(idempotencyKey);
      // Check for a completed cached response first (fast path).
      const cached = await getCachedResponse(req.userId!, idempotencyKey);
      if (cached) {
        res.status(cached.statusCode).json(cached.responseBody);
        return;
      }

      // Try to acquire a lease (blocks concurrent duplicates).
      const lease = await acquireLease(req.userId!, idempotencyKey);
      if (lease === "completed") {
        // Another request finished while we were acquiring — return its result.
        const result = await getCachedResponse(req.userId!, idempotencyKey);
        if (result) {
          res.status(result.statusCode).json(result.responseBody);
          return;
        }
        throw new ConflictError(
          "A request with this idempotency key already completed"
        );
      }
      if (lease === "pending") {
        // Another request is still in-flight — poll until it finishes.
        for (let i = 0; i < LEASE_POLL_MAX_ATTEMPTS; i++) {
          await new Promise((r) => setTimeout(r, LEASE_POLL_MS));
          const polled = await getCachedResponse(req.userId!, idempotencyKey);
          if (polled) {
            res.status(polled.statusCode).json(polled.responseBody);
            return;
          }
        }
        throw new ConflictError(
          "A request with this idempotency key is already in progress"
        );
      }
      // lease === "acquired" — we own the lease, proceed.
    }

    const user = await getAuthUserInfo(req);
    let responseBody: Record<string, unknown>;
    try{
      const result = await spaceService.createUserSpace(user, data);
      responseBody = { success: true, data: result};
    } catch(err){
      if (idempotencyKey) {
        await releaseLease(req.userId!, idempotencyKey);
      }
      throw err;
    }
    if (idempotencyKey) {
      await finalizeLease(req.userId!, idempotencyKey, 201, responseBody);
    }

    res.status(201).json(responseBody);
  }
);

export const listSpaces = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const spaces = await spaceService.getUserSpaces(req.userId!);

    res.json({ success: true, data: { spaces } });
  }
);

export const getSpace = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const spaceId = validateSpaceId(req.params);
    const space = await spaceService.getUserSpace(req.userId!, spaceId);

    res.json({ success: true, data: { space } });
  }
);

export const updateSpace = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const spaceId = validateSpaceId(req.params);
    const data = validateUpdateSpace(req.body);
    const space = await spaceService.updateUserSpace(
      req.userId!,
      spaceId,
      data
    );

    res.json({ success: true, data: { space } });
  }
);

export const deleteSpace = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const spaceId = validateSpaceId(req.params);
    const result = await spaceService.deleteUserSpace(req.userId!, spaceId);

    res.json({ success: true, data: result });
  }
);

export const getMembers = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const spaceId = validateSpaceId(req.params);
    const members = await spaceService.getSpaceMembers(req.userId!, spaceId);

    res.json({ success: true, data: { members } });
  }
);

export const getSpaceInvitations = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const spaceId = validateSpaceId(req.params);
    const invitations = await listPendingForSpace(spaceId, req.userId!);

    res.json({ success: true, data: { invitations } });
  }
);

export const inviteMember = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const spaceId = validateSpaceId(req.params);
    const { identifier } = validateMemberInvite(req.body);
    const user = await getAuthUserInfo(req);
    const result = await spaceService.addMemberByInvite(user, spaceId, identifier);

    res.status(201).json({ success: true, data: result });
  }
);

export const removeMember = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const spaceId = validateSpaceId(req.params);
    const targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const user = await getAuthUserInfo(req);
    const result = await spaceService.removeMember(user, spaceId, String(targetUserId));

    res.json({ success: true, data: result });
  }
);


export const transferOwnership = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const spaceId = validateSpaceId(req.params);
    const { userId: newOwnerUserId } = validateTransferOwnership(req.body);
    const user = await getAuthUserInfo(req);
    const space = await spaceService.transferOwnership(
      user,
      spaceId,
      newOwnerUserId
    );

    res.json({ success: true, data: { space } });
  }
);

export const leaveSpace = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const spaceId = validateSpaceId(req.params);
    const user = await getAuthUserInfo(req);
    const result = await spaceService.leaveSpace(user, spaceId);

    res.json({ success: true, data: result });
  }
);