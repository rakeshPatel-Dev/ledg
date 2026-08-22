import type { Types } from "mongoose";

import { ConflictError, NotFoundError } from "../../common/errors/index.js";
import * as spaceRepository from "./repository.js";

export async function createUserSpace(
  ownerId: Types.ObjectId,
  data: { name: string; type: string }
) {
  const count = await spaceRepository.countUserSpaces(ownerId);

  if (count >= 10) {
    throw new ConflictError("Space limit reached");
  }

  const space = await spaceRepository.createSpace(ownerId, data);
  return space;
}

export async function getUserSpaces(ownerId: Types.ObjectId) {
  await spaceRepository.ensureDefaultSpace(ownerId);
  return spaceRepository.findSpacesByOwner(ownerId);
}

export async function getUserSpace(ownerId: Types.ObjectId, spaceId: string) {
  const space = await spaceRepository.findSpaceById(spaceId, ownerId);

  if (!space) {
    throw new NotFoundError("Space");
  }

  return space;
}

export async function updateUserSpace(
  ownerId: Types.ObjectId,
  spaceId: string,
  data: Record<string, unknown>
) {
  const space = await spaceRepository.updateSpace(spaceId, ownerId, data);

  if (!space) {
    throw new NotFoundError("Space");
  }

  return space;
}

export async function deleteUserSpace(ownerId: Types.ObjectId, spaceId: string) {
  // Verify ownership BEFORE any destructive operation
  const space = await spaceRepository.findSpaceById(spaceId, ownerId);

  if (!space) {
    throw new NotFoundError("Space");
  }

  // cascade delete: remove transactions first, then the space itself
  await spaceRepository.deleteTransactionsBySpace(spaceId);

  const deleted = await spaceRepository.deleteSpace(spaceId, ownerId);

  if (!deleted) {
    throw new NotFoundError("Space");
  }

  return { id: spaceId };
}