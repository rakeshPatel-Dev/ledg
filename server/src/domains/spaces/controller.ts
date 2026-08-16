import type { Response } from "express";

import { asyncHandler } from "../../common/utils/async-handler.js";
import type { AuthRequest } from "../../common/middlewares/authenticate.js";
import * as spaceService from "./service.js";
import {
  validateCreateSpace,
  validateSpaceId,
  validateUpdateSpace,
} from "./validator.js";

export const createSpace = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const data = validateCreateSpace(req.body);
    const space = await spaceService.createUserSpace(req.userId!, data);

    res.status(201).json({ success: true, data: { space } });
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