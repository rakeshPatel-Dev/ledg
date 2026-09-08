import mongoose, { Schema, model, type Types } from "mongoose";

import {
  INVITATION_STATUSES,
  type InvitationStatus,
} from "../../shared/index.js";

export interface SpaceInvitationDoc {
  _id: Types.ObjectId;
  spaceId: Types.ObjectId;
  spaceName: string;
  inviterId: Types.ObjectId;
  inviterName: string;
  inviterUsername?: string | null;
  inviterEmail: string;
  inviteeEmail: string;
  inviteeId?: Types.ObjectId | null;
  inviteeUsername?: string | null;
  role: "member";
  status: InvitationStatus;
  tokenHash?: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const spaceInvitationSchema = new Schema<SpaceInvitationDoc>(
  {
    spaceId: {
      type: Schema.Types.ObjectId,
      ref: "Space",
      required: true,
      index: true,
    },
    spaceName: {
      type: String,
      required: true,
      trim: true,
    },
    inviterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    inviterName: {
      type: String,
      required: true,
      trim: true,
    },
    inviterUsername: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    inviterEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    inviteeEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    inviteeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    inviteeUsername: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["member"],
      default: "member",
    },
    status: {
      type: String,
      enum: INVITATION_STATUSES,
      default: "pending",
      index: true,
    },
    tokenHash: {
      type: String,
      default: null,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// One active pending invitation per space and normalized invitee email
spaceInvitationSchema.index(
  { spaceId: 1, inviteeEmail: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

spaceInvitationSchema.index({ inviteeEmail: 1, status: 1 });

export const SpaceInvitationModel =
  mongoose.models.SpaceInvitation ||
  model<SpaceInvitationDoc>("SpaceInvitation", spaceInvitationSchema);
