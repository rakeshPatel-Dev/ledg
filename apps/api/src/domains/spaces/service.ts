import { Types } from "mongoose";

import { ConflictError, NotFoundError } from "../../common/errors/index.js";
import { findOrCreateUser } from "../users/repository.js";
import * as spaceRepository from "./repository.js";

export async function createUserSpace(
  clerkId: string,
  data: { name: string; type: string }
) {
  const ownerId = await findOrCreateUser(clerkId);
  const count = await spaceRepository.countUserSpaces(ownerId);

  if (count >= 10) {
    throw new ConflictError("Space limit reached");
  }

  const space = await spaceRepository.createSpace(ownerId, data);
  return space;
}

export async function getUserSpaces(clerkId: string) {
  const ownerId = await findOrCreateUser(clerkId);
  await spaceRepository.ensureDefaultSpace(ownerId);
  return spaceRepository.findSpacesByOwner(ownerId);
}

export async function getUserSpace(clerkId: string, spaceId: string) {
  const ownerId = await findOrCreateUser(clerkId);
  const space = await spaceRepository.findSpaceById(spaceId, ownerId);

  if (!space) {
    throw new NotFoundError("Space");
  }

  return space;
}

export async function updateUserSpace(
  clerkId: string,
  spaceId: string,
  data: Record<string, unknown>
) {
  const ownerId = await findOrCreateUser(clerkId);
  const space = await spaceRepository.updateSpace(spaceId, ownerId, data);

  if (!space) {
    throw new NotFoundError("Space");
  }

  return space;
}

export async function deleteUserSpace(clerkId: string, spaceId: string) {
  const ownerId = await findOrCreateUser(clerkId);
  const deleted = await spaceRepository.deleteSpace(spaceId, ownerId);

  // check if there are any transactions associated with this space
  const hasTransactions = await spaceRepository.hasTransactions(spaceId);

  if (hasTransactions) {
    throw new ConflictError("Cannot delete space with transactions");
  }

  if (!deleted) {
    throw new NotFoundError("Space");
  }

  return { id: spaceId };
}

export async function getSpaceOwnerId(clerkId: string): Promise<Types.ObjectId> {
  return findOrCreateUser(clerkId);
}