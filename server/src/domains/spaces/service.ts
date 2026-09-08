import { Types } from "mongoose";

import {
  ConflictError,
  NotFoundError,
  BadRequestError,
} from "../../common/errors/index.js";
import { SpaceModel, type SpaceDoc } from "./model.js";
import * as spaceRepository from "./repository.js";
import { assertSpaceAccess, assertSpaceOwner } from "./access.js";
import { UserModel } from "../users/model.js";
import { inviteMember } from "../invitations/service.js";
import * as notificationService from "../notifications/service.js";
import { logger } from "../../config/logger.js";

export interface UserContext {
  userId: Types.ObjectId;
  email: string;
  name: string;
  username?: string | null;
}

export async function createUserSpace(
  owner: UserContext,
  data: { name: string; type: string; monthlyBudget?: number | null; inviteeIdentifiers?: string[] }
) {
  const count = await spaceRepository.countUserSpaces(owner.userId);

  if (count >= 10) {
    throw new ConflictError("Space limit reached (maximum 10 spaces per user)");
  }

  const space = await spaceRepository.createSpace(owner, {
    name: data.name,
    type: data.type,
    monthlyBudget: data.monthlyBudget,
  });

  const spaceId = String(space._id);
  const invitationResults: Array<{ identifier: string; status: "invited" | "failed"; error?: string }> = [];

  if (data.inviteeIdentifiers && data.inviteeIdentifiers.length > 0) {
    const invitePromises = data.inviteeIdentifiers.map(async (identifier) => {
      try {
        await inviteMember(owner, spaceId, identifier);
        return { identifier, status: "invited" as const };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Failed to invite";
        return { identifier, status: "failed" as const, error: errorMsg };
      }
    });

    const settled = await Promise.allSettled(invitePromises);
    for (const result of settled) {
      if (result.status === "fulfilled") {
        invitationResults.push(result.value);
      }
    }
  }

  // Refresh space to include updated isShared or members
  const freshSpace = await spaceRepository.findSpaceById(spaceId, owner.userId);


  return {
    space: freshSpace || space,
    invitations: invitationResults,
  };
}

export async function getUserSpaces(userId: Types.ObjectId) {
  const user = await UserModel.findById(userId).lean();
  if (user) {
    await spaceRepository.ensureDefaultSpace({
      userId: user._id,
      email: user.email,
      name: user.name || "Ledg User",
      username: user.username ?? null,
    });
  }

  return spaceRepository.findSpacesForUser(userId);
}

export async function getUserSpace(userId: Types.ObjectId, spaceId: string) {
  const access = await assertSpaceAccess(spaceId, userId);
  return { 
    ...access.space,
    role: access.role,
  };
}

export async function updateUserSpace(
  ownerId: Types.ObjectId,
  spaceId: string,
  data: Record<string, unknown>
) {
  await assertSpaceOwner(spaceId, ownerId);

  const space = await spaceRepository.updateSpace(spaceId, ownerId, data);

  if (!space) {
    throw new NotFoundError("Space");
  }

  return space;
}

export async function deleteUserSpace(ownerId: Types.ObjectId, spaceId: string) {
  const space = await assertSpaceOwner(spaceId, ownerId);

  // 1. Lease deletion state
  await spaceRepository.setSpaceDeletingLease(spaceId, ownerId);

  try {
    // 2. Cascade delete transactions
    await spaceRepository.deleteTransactionsBySpace(spaceId);

    // 3. Cancel outstanding invitations
    await spaceRepository.deleteInvitationsBySpace(spaceId);

    // 4. Notify remaining members
    const otherMembers = (space.members || []).filter(
      (m) => m.userId.toString() !== ownerId.toString()
    );

    if (otherMembers.length > 0) {
      await notificationService.notifyMembers({
        recipientIds: otherMembers.map((m) => m.userId),
        type: "space_deleted",
        data: {
          spaceId,
          spaceName: space.name,
        },
      }).catch((e) => logger.error({ error: e }, "Failed to notify members of space deletion"));
    }

    // 5. Delete notifications referencing this space
    await spaceRepository.deleteNotificationsBySpace(spaceId);

    // 6. Delete Space document
    const deleted = await spaceRepository.deleteSpace(spaceId, ownerId);

    if (!deleted) {
      throw new NotFoundError("Space");
    }
  } catch (err) {
    // Restore the space so the owner can access and retry deletion
    await spaceRepository.clearSpaceDeletingLease(spaceId, ownerId).catch((e) =>
      logger.error({ error: e }, "Failed to clear space deleting lease")
    );
    throw err;
  }

  return { id: spaceId };
}

export async function getSpaceMembers(userId: Types.ObjectId, spaceId: string) {
  const access = await assertSpaceAccess(spaceId, userId);
  return access.space.members || [];
}

export async function addMemberByInvite(
  owner: UserContext,
  spaceId: string,
  identifier: string
) {
  await assertSpaceOwner(spaceId, owner.userId);
  return inviteMember(owner, spaceId, identifier);
}

export async function removeMember(
  owner: UserContext,
  spaceId: string,
  targetUserId: string
) {
  const space = await assertSpaceOwner(spaceId, owner.userId);

  if (owner.userId.toString() === targetUserId) {
    throw new BadRequestError(
      "Space owner cannot be removed. Transfer ownership or delete the space."
    );
  }

  const targetMember = (space.members || []).find(
    (m) => m.userId.toString() === targetUserId
  );

  if (!targetMember) {
    throw new NotFoundError("Member not found in this space");
  }

  await SpaceModel.updateOne(
    { _id: space._id },
    { $pull: { members: { userId: targetMember.userId } } }
  );

  const freshSpace = await spaceRepository.findSpaceById(String(space._id));
  const isShared = (freshSpace?.members || []).some((m) => m.role === "member");
  await SpaceModel.updateOne(
    { _id: space._id },
    { $set: { isShared } }
  );

  // Notify the removed member
  await notificationService.notify({
    userId: targetMember.userId,
    type: "member_removed",
    data: {
      spaceId: String(space._id),
      spaceName: space.name,
      actorId: String(owner.userId),
      actorName: owner.name,
    },
  }).catch((e) => logger.error({ error: e }, "Failed to notify removed member"));

  return { success: true, memberId: targetUserId };
}

export async function transferOwnership(
  owner: UserContext,
  spaceId: string,
  newOwnerUserId: string
) {
  const space = await assertSpaceOwner(spaceId, owner.userId);

  if (owner.userId.toString() === newOwnerUserId) {
    throw new BadRequestError("You are already the owner of this space");
  }

  const newOwnerMember = (space.members || []).find(
    (m) => m.userId.toString() === newOwnerUserId
  );

  if (!newOwnerMember) {
    throw new BadRequestError("Target user must be an active member of this space");
  }

  // Atomically update single document
  const updatedMembers = space.members.map((m) => {
    if (m.userId.toString() === owner.userId.toString()) {
      return { ...m, role: "member" as const };
    }
    if (m.userId.toString() === newOwnerUserId) {
      return { ...m, role: "owner" as const };
    }
    return m;
  });

  const updated = await SpaceModel.findOneAndUpdate(
    { _id: space._id, ownerId: owner.userId },
    {
      $set: {
        ownerId: new Types.ObjectId(newOwnerUserId),
        members: updatedMembers,
        isShared: true,
      },
    },
    { returnDocument: "after" }
  ).lean();

  if (!updated) {
    throw new NotFoundError("Space");
  }

  // Notify new owner and former owner only
  await Promise.allSettled([
    notificationService.notify({
      userId: new Types.ObjectId(newOwnerUserId),
      type: "ownership_transferred",
      variant: "to_new_owner",
      data: {
        spaceId: String(space._id),
        spaceName: space.name,
        actorId: String(owner.userId),
        actorName: owner.name,
      },
    }),
    notificationService.notify({
      userId: owner.userId,
      type: "ownership_transferred",
      variant: "to_former_owner",
      data: {
        spaceId: String(space._id),
        spaceName: space.name,
        actorId: String(newOwnerUserId),
        actorName: newOwnerMember.name,
        recipientName: newOwnerMember.name,
      },
    }),
  ]);

  return {
    ...updated,
    id: String(updated._id),
    role: "member",
  } as unknown as SpaceDoc;
}

export async function leaveSpace(user: UserContext, spaceId: string) {
  const access = await assertSpaceAccess(spaceId, user.userId);

  if (access.role === "owner") {
    throw new ConflictError(
      "Space owner cannot leave without transferring ownership or deleting the space"
    );
  }

  const space = access.space;

  await SpaceModel.updateOne(
    { _id: space._id },
    { $pull: { members: { userId: user.userId } } }
  );

  const freshSpace = await spaceRepository.findSpaceById(String(space._id));
  const isShared = (freshSpace?.members || []).some((m) => m.role === "member");
  await SpaceModel.updateOne(
    { _id: space._id },
    { $set: { isShared } }
  );

  // Notify owner and remaining members
  const recipientIds = (freshSpace?.members || []).map((m) => m.userId);
  if (recipientIds.length > 0) {
    await notificationService.notifyMembers({
      recipientIds,
      type: "member_left",
      data: {
        spaceId: String(space._id),
        spaceName: space.name,
        actorId: String(user.userId),
        actorName: user.name,
      },
    }).catch((e) => logger.error({ error: e }, "Failed to notify members of departure"));
  }

  return { success: true, spaceId };
}