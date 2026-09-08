import { Types } from "mongoose";

import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../common/errors/index.js";

import { SpaceModel } from "../spaces/model.js";
import { UserModel } from "../users/model.js";
import { SpaceInvitationModel, type SpaceInvitationDoc } from "./model.js";
import * as invitationRepo from "./repository.js";
import * as notificationService from "../notifications/service.js";
import { sendInvitationEmail, getFrontendBaseUrl } from "../../lib/email.js";
import { logger } from "../../config/logger.js";

const MAX_MEMBERS_PER_SPACE = 10;
const MAX_PENDING_PER_OWNER = 20;
const INVITE_EXPIRY_DAYS = 7;

export interface InviterContext {
  userId: Types.ObjectId;
  name: string;
  email: string;
  username?: string | null;
}

export interface InviteeContext {
  userId: Types.ObjectId;
  name: string;
  email: string;
  username?: string | null;
}

export interface ResolvedInvitee {
  email: string;
  username: string | null;
  userId: Types.ObjectId | null;
}

/**
 * Resolves an email or @username identifier to a normalized email address and,
 * when the identifier maps to a known account, that account's username + id.
 */
export async function resolveInviteeIdentifier(
  rawInput: string,
  inviter: InviterContext
): Promise<ResolvedInvitee> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new BadRequestError("Email or username is required");
  }

  const isExplicitUsername = trimmed.startsWith("@");
  const hasAt = trimmed.includes("@");

  // If it starts with '@' or has no '@' inside, resolve as username
  if (isExplicitUsername || !hasAt) {
    const cleanUsername = (isExplicitUsername ? trimmed.slice(1) : trimmed).toLowerCase();

    if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
      throw new BadRequestError(
        `Invalid username "@${cleanUsername}". Usernames must be 3-30 characters (letters, numbers, underscores).`
      );
    }

    const user = await UserModel.findOne({ username: cleanUsername }).lean();
    if (!user || !user.email) {
      throw new NotFoundError(`User with username "@${cleanUsername}"`);
    }

    if (user._id.toString() === inviter.userId.toString()) {
      throw new ConflictError("You cannot invite yourself to your space");
    }

    return {
      email: user.email.toLowerCase(),
      username: user.username ?? null,
      userId: user._id,
    };
  }

  // Otherwise validate and normalize email
  const normalizedEmail = trimmed.toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new BadRequestError("Please provide a valid email address or @username");
  }

  if (normalizedEmail === inviter.email.toLowerCase()) {
    throw new ConflictError("You cannot invite yourself to your space");
  }

  return { email: normalizedEmail, username: null, userId: null };
}

/**
 * Invites a single email or username to a space. Called during space creation or member invite.
 */
export async function inviteMember(
  inviter: InviterContext,
  spaceId: string,
  inviteeIdentifier: string
): Promise<{ invitation: SpaceInvitationDoc; emailSent: boolean }> {
  const resolved = await resolveInviteeIdentifier(inviteeIdentifier, inviter);
  const normalizedEmail = resolved.email;

  // Load space and verify ownership
  const space = await SpaceModel.findOne({
    _id: spaceId,
    ownerId: inviter.userId,
    status: { $ne: "deleting" },
  });

  if (!space) {
    throw new NotFoundError("Space");
  }

  // Check member cap
  if (space.members.length >= MAX_MEMBERS_PER_SPACE) {
    throw new ConflictError(
      `Space has reached the maximum of ${MAX_MEMBERS_PER_SPACE} members`
    );
  }

  // Check if already a member
  const alreadyMember = space.members.some(
    (m: { email: string; userId: Types.ObjectId }) =>
      m.email.toLowerCase() === normalizedEmail ||
      (resolved.userId != null &&
        m.userId.toString() === resolved.userId.toString())
  );
  if (alreadyMember) {
    throw new ConflictError("User is already a member of this space");
  }

  // Check if pending invitation already exists for this space + email.
  // A refresh consumes no new slot, so it bypasses the booking cap below.
  let invitation = await SpaceInvitationModel.findOne({
    spaceId: space._id,
    inviteeEmail: normalizedEmail,
    status: "pending",
  });

  // Reserve slots for outstanding pending invites so an owner can't book more
  // invitations than the space can ever accept (soft limiter — no atomic
  // reservation, but combined with the atomic accept cap it prevents
  // over-booking).
  if (!invitation) {
    const pendingCount = await invitationRepo.countPendingInvitationsBySpace(
      space._id
    );
    if (space.members.length + pendingCount >= MAX_MEMBERS_PER_SPACE) {
      throw new ConflictError(
        `Space is full or has outstanding invitations covering the remaining ${MAX_MEMBERS_PER_SPACE - space.members.length} slot(s)`
      );
    }
  }

  // Check owner abuse ceiling
  const ownerPendingCount = await invitationRepo.countPendingInvitationsByOwner(
    inviter.userId
  );
  if (ownerPendingCount >= MAX_PENDING_PER_OWNER) {
    throw new ConflictError(
      "You have reached the maximum number of outstanding invitations"
    );
  }

  // Mint fresh single-use token & 7-day expiry
  const { rawToken, tokenHash } = invitationRepo.generateInviteToken();
  const expiresAt = new Date(
    Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  if (invitation) {
    // Refresh token, expiry and identity snapshots
    invitation.tokenHash = tokenHash;
    invitation.expiresAt = expiresAt;
    invitation.inviterName = inviter.name;
    invitation.inviterUsername = inviter.username ?? invitation.inviterUsername;
    invitation.inviteeUsername = resolved.username ?? invitation.inviteeUsername;
    if (resolved.userId) {
      invitation.inviteeId = resolved.userId;
    }
    invitation.spaceName = space.name;
    await invitation.save();
  } else {
    invitation = await SpaceInvitationModel.create({
      spaceId: space._id,
      spaceName: space.name,
      inviterId: inviter.userId,
      inviterName: inviter.name,
      inviterUsername: inviter.username ?? null,
      inviterEmail: inviter.email,
      inviteeEmail: normalizedEmail,
      inviteeId: resolved.userId,
      inviteeUsername: resolved.username,
      role: "member",
      status: "pending",
      tokenHash,
      expiresAt,
    });
  }

  const acceptUrl = `${getFrontendBaseUrl()}/invite/${rawToken}`;
  let emailSent = false;

  try {
    await sendInvitationEmail({
      to: normalizedEmail,
      spaceName: space.name,
      inviterName: inviter.name,
      acceptUrl,
    });
    emailSent = true;
  } catch (err) {
    logger.error(
      { error: err, email: normalizedEmail, spaceId },
      "Failed to dispatch invitation email via Resend"
    );
  }

  // Check if invitee is an existing registered user and create in-app notification
  const existingUser = resolved.userId
    ? await UserModel.findById(resolved.userId).lean()
    : await UserModel.findOne({ email: normalizedEmail }).lean();

  if (existingUser) {
    // Email-only invites of registered users have no username snapshot until now.
    if (existingUser.username && invitation.inviteeUsername !== existingUser.username) {
      invitation.inviteeUsername = existingUser.username;
      if (!invitation.inviteeId) invitation.inviteeId = existingUser._id;
      await invitation.save();
    }

    await notificationService.notify({
      userId: existingUser._id,
      type: "space_invite",
      data: {
        spaceId: String(space._id),
        spaceName: space.name,
        invitationId: String(invitation._id),
        actorId: String(inviter.userId),
        actorName: inviter.name,
      },
    }).catch((e) => logger.error({ error: e }, "In-app invite notify failed"));
  }

  return {
    invitation: {
      ...invitation.toObject(),
      id: String(invitation._id),
    } as unknown as SpaceInvitationDoc,
    emailSent,
  };
}

/**
 * Preview an invitation by raw token (Public endpoint without authentication).
 */
export async function getInvitationPreviewByToken(rawToken: string) {
  const tokenHash = invitationRepo.hashToken(rawToken);
  const invitation = await invitationRepo.findInvitationByTokenHash(tokenHash);

  if (!invitation) {
    // 410 Gone / Invalid
    throw new NotFoundError(
      "This invitation link is invalid, expired, or has already been used"
    );
  }

  return {
    spaceName: invitation.spaceName,
    inviterName: invitation.inviterName,
    inviterUsername: invitation.inviterUsername ?? null,
    inviteeEmail: invitation.inviteeEmail,
    inviteeEmailMasked: invitation.inviteeEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + "*".repeat(b.length)),
    inviteeId: invitation.inviteeId ? String(invitation.inviteeId) : null,
    inviteeUsername: invitation.inviteeUsername ?? null,
    expiresAt: invitation.expiresAt.toISOString(),
  };
}

/**
 * Accepts an invitation using a raw token.
 */
export async function acceptInvitationByToken(
  rawToken: string,
  user: InviteeContext
) {
  const tokenHash = invitationRepo.hashToken(rawToken);
  const invitation = await SpaceInvitationModel.findOne({
    tokenHash,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });

  if (!invitation) {
    throw new NotFoundError(
      "This invitation link is invalid, expired, or has already been used"
    );
  }

  // Recipient authorization check
  if (
    invitation.inviteeEmail.toLowerCase() !== user.email.toLowerCase() &&
    (!invitation.inviteeId ||
      invitation.inviteeId.toString() !== user.userId.toString())
  ) {
    throw new ForbiddenError(
      `This invitation was sent to ${invitation.inviteeEmail}. Please log in with that account to accept.`
    );
  }

  return executeAcceptance(invitation, user);
}

/**
 * Accepts an invitation by invitation ID (from in-app notifications/pending list).
 */
export async function acceptInvitationById(
  invitationId: string,
  user: InviteeContext
) {
  const invitation = await SpaceInvitationModel.findOne({
    _id: invitationId,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });

  if (!invitation) {
    throw new NotFoundError(
      "This invitation is invalid, expired, or has already been used"
    );
  }

  // Recipient authorization check
  if (
    invitation.inviteeEmail.toLowerCase() !== user.email.toLowerCase() &&
    (!invitation.inviteeId ||
      invitation.inviteeId.toString() !== user.userId.toString())
  ) {
    throw new ForbiddenError(
      `This invitation was sent to ${invitation.inviteeEmail}. Please log in with that account to accept.`
    );
  }

  return executeAcceptance(invitation, user);
}

/**
 * Shared atomic acceptance transition, membership update, and notifications.
 */
async function executeAcceptance(
  invitation: SpaceInvitationDoc,
  user: InviteeContext
) {
  // Check member cap on space atomically
  const space = await SpaceModel.findOne({
    _id: invitation.spaceId,
    status: { $ne: "deleting" },
  });

  if (!space) {
    throw new NotFoundError("The space for this invitation no longer exists");
  }

  if (space.members.length >= MAX_MEMBERS_PER_SPACE) {
    throw new ConflictError(
      `This space has already reached the maximum capacity of ${MAX_MEMBERS_PER_SPACE} members`
    );
  }

  // Check if already in space
  const isAlreadyIn = space.members.some(
    (m: { userId: Types.ObjectId }) => m.userId.toString() === user.userId.toString()
  );

  if (!isAlreadyIn) {
    // Atomically enforce the member cap and dedupe membership so concurrent
    // accepts can never push a space past its limit (decision #12).
    const pushResult = await SpaceModel.updateOne(
      {
        _id: space._id,
        status: { $ne: "deleting" },
        "members.userId": { $ne: user.userId },
        $expr: { $lt: [{ $size: "$members" }, MAX_MEMBERS_PER_SPACE] },
      },
      {
        $push: {
          members: {
            userId: user.userId,
            email: user.email.toLowerCase(),
            name: user.name,
            username: user.username ?? null,
            role: "member",
            joinedAt: new Date(),
          },
        },
        $set: { isShared: true },
      }
    );

    if (pushResult.matchedCount === 0) {
      // Either a concurrent accept already added the user, or the space is full.
      const current = await SpaceModel.findById(space._id).lean();
      const nowMember =
        current &&
        current.members.some(
          (m: { userId: Types.ObjectId }) =>
            m.userId.toString() === user.userId.toString()
        );

      if (!nowMember) {
        throw new ConflictError(
          `This space has already reached the maximum capacity of ${MAX_MEMBERS_PER_SPACE} members`
        );
      }
    }
  }

  // Atomic state transition on invitation
  await SpaceInvitationModel.updateOne(
    { _id: invitation._id },
    {
      $set: {
        status: "accepted",
        inviteeId: user.userId,
      },
      $unset: { tokenHash: "" },
    }
  );

  // Notify owner
  await notificationService.notify({
    userId: invitation.inviterId,
    type: "invite_accepted",
    data: {
      spaceId: String(space._id),
      spaceName: space.name,
      invitationId: String(invitation._id),
      actorId: String(user.userId),
      actorName: user.name,
    },
  }).catch((e) => logger.error({ error: e }, "Failed to notify owner on accept"));

  // Notify other existing members
  const otherMemberIds = space.members
    .filter(
      (m: { userId: Types.ObjectId }) =>
        m.userId.toString() !== user.userId.toString() &&
        m.userId.toString() !== invitation.inviterId.toString()
    )
    .map((m: { userId: Types.ObjectId }) => m.userId);

  if (otherMemberIds.length > 0) {
    await notificationService.notifyMembers({
      recipientIds: otherMemberIds,
      type: "member_joined",
      data: {
        spaceId: String(space._id),
        spaceName: space.name,
        actorId: String(user.userId),
        actorName: user.name,
      },
    }).catch((e) => logger.error({ error: e }, "Failed to notify members on join"));
  }

  return {
    success: true,
    spaceId: String(space._id),
    spaceName: space.name,
  };
}

/**
 * Rejects an invitation by ID.
 */
export async function rejectInvitation(
  invitationId: string,
  user: InviteeContext
) {
  const invitation = await SpaceInvitationModel.findOne({
    _id: invitationId,
    status: "pending",
  });

  if (!invitation) {
    throw new NotFoundError("Invitation");
  }

  return executeRejection(invitation, user);
}

/**
 * Rejects an invitation by its token (used from the token invite page).
 * Mirrors acceptInvitationByToken: only a pending, unexpired invitation is
 * eligible.
 */
export async function rejectInvitationByToken(
  rawToken: string,
  user: InviteeContext
) {
  const tokenHash = invitationRepo.hashToken(rawToken);
  const invitation = await SpaceInvitationModel.findOne({
    tokenHash,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });

  if (!invitation) {
    throw new NotFoundError("Invitation");
  }

  return executeRejection(invitation, user);
}

async function executeRejection(
  invitation: SpaceInvitationDoc,
  user: InviteeContext
) {
  if (
    invitation.inviteeEmail.toLowerCase() !== user.email.toLowerCase() &&
    (!invitation.inviteeId ||
      invitation.inviteeId.toString() !== user.userId.toString())
  ) {
    throw new ForbiddenError("You are not authorized to decline this invitation");
  }

  await SpaceInvitationModel.updateOne(
    { _id: invitation._id },
    {
      $set: { status: "rejected", inviteeId: user.userId },
      $unset: { tokenHash: "" },
    }
  );

  // Notify owner
  await notificationService.notify({
    userId: invitation.inviterId,
    type: "invite_rejected",
    data: {
      spaceId: String(invitation.spaceId),
      spaceName: invitation.spaceName,
      invitationId: String(invitation._id),
      actorId: String(user.userId),
      actorName: user.name,
    },
  }).catch((e) => logger.error({ error: e }, "Failed to notify owner on reject"));

  return { success: true };
}

/**
 * Owner resends invitation (re-mints token, rotates hash, sends email inline).
 */
export async function resendInvitation(
  invitationId: string,
  ownerId: Types.ObjectId
) {
  const invitation = await SpaceInvitationModel.findOne({
    _id: invitationId,
  });

  if (!invitation) {
    throw new NotFoundError("Invitation");
  }

  // Authorize by the CURRENT owner of the space, not the original inviter:
  // after an ownership transfer the previous owner must not be able to mint
  // fresh tokens, and the new owner must be able to manage old invitations.
  const space = await SpaceModel.findOne({
    _id: invitation.spaceId,
    ownerId,
  });
  if (!space) {
    throw new ForbiddenError(
      "Only the current space owner can resend invitations"
    );
  }

  if (invitation.status !== "pending") {
    throw new ConflictError("Only pending invitations can be resent");
  }

  const { rawToken, tokenHash } = invitationRepo.generateInviteToken();
  const expiresAt = new Date(
    Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  invitation.tokenHash = tokenHash;
  invitation.expiresAt = expiresAt;
  await invitation.save();

  const acceptUrl = `${getFrontendBaseUrl()}/invite/${rawToken}`;
  let emailSent = false;

  try {
    await sendInvitationEmail({
      to: invitation.inviteeEmail,
      spaceName: invitation.spaceName,
      inviterName: invitation.inviterName,
      acceptUrl,
    });
    emailSent = true;
  } catch (err) {
    logger.error(
      { error: err, email: invitation.inviteeEmail },
      "Resend invitation email failed"
    );
  }

  return {
    invitation: {
      ...invitation.toObject(),
      id: String(invitation._id),
    } as unknown as SpaceInvitationDoc,
    emailSent,
  };
}

/**
 * Owner cancels / revokes invitation.
 */
export async function cancelInvitation(
  invitationId: string,
  ownerId: Types.ObjectId
) {
  const invitation = await SpaceInvitationModel.findOne({
    _id: invitationId,
  });

  if (!invitation) {
    throw new NotFoundError("Invitation");
  }

  // Authorize by the CURRENT owner of the space, not the original inviter
  // (same rationale as resendInvitation — ownership may have been transferred
  // after the invite was sent).
  const space = await SpaceModel.findOne({
    _id: invitation.spaceId,
    ownerId,
  });
  if (!space) {
    throw new ForbiddenError(
      "Only the current space owner can cancel invitations"
    );
  }

  await SpaceInvitationModel.updateOne(
    { _id: invitation._id, status: "pending" },
    {
      $set: { status: "canceled" },
      $unset: { tokenHash: "" },
    }
  );

  return { success: true, id: invitationId };
}

export async function listPendingInvitationsForEmail(
  inviteeEmail: string,
  userId?: Types.ObjectId
) {
  return invitationRepo.findPendingInvitationsByEmail(inviteeEmail, userId);
}

export async function listPendingForSpace(
  spaceId: string,
  ownerId: Types.ObjectId
) {
  const space = await SpaceModel.findOne({
    _id: spaceId,
    ownerId,
    status: { $ne: "deleting" },
  });

  if (!space) {
    throw new NotFoundError("Space");
  }

  return invitationRepo.findPendingInvitationsBySpace(spaceId);
}
