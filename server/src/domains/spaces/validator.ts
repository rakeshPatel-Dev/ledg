import {
  spaceSchema,
  spaceUpdateSchema,
  spaceDeleteSchema,
  idParamsSchema,
  spaceMemberInviteSchema,
  spaceTransferOwnershipSchema,
} from "../../shared/index.js";

import { BadRequestError } from "../../common/errors/index.js";

export function validateCreateSpace(input: unknown) {
  const result = spaceSchema.safeParse(input);

  if (!result.success) {
    throw new BadRequestError(result.error.issues[0]?.message || "Invalid space payload");
  }

  return result.data;
}

export function validateUpdateSpace(input: unknown) {
  const result = spaceUpdateSchema.safeParse(input);

  if (!result.success) {
    throw new BadRequestError(result.error.issues[0]?.message || "Invalid space payload");
  }

  return result.data;
}

export function validateSpaceId(param: unknown) {
  const result = idParamsSchema.safeParse(param);

  if (!result.success) {
    throw new BadRequestError("Invalid space id");
  }

  return result.data.id;
}

export function validateDeleteSpace(input: unknown) {
  const result = spaceDeleteSchema.safeParse(input);

  if (!result.success) {
    throw new BadRequestError(
      result.error.issues[0]?.message || "Type the space name to confirm deletion"
    );
  }

  return result.data;
}

export function validateMemberInvite(input: unknown) {
  const result = spaceMemberInviteSchema.safeParse(input);
  if (!result.success) {
    throw new BadRequestError(
      result.error.issues[0]?.message || "Invalid email address or username"
    );
  }
  return result.data;
}

export function validateTransferOwnership(input: unknown) {
  const result = spaceTransferOwnershipSchema.safeParse(input);
  if (!result.success) {
    throw new BadRequestError(result.error.issues[0]?.message || "Invalid user id");
  }
  return result.data;
}
