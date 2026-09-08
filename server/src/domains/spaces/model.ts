import mongoose, { Schema, model, type Types } from "mongoose";

import { SPACE_TYPES, type SpaceRole, type SpaceType } from "../../shared/index.js";

export interface SpaceMemberDoc {
  userId: Types.ObjectId;
  email: string;
  name: string;
  username?: string | null;
  role: SpaceRole;
  joinedAt: Date;
}

const spaceMemberSchema = new Schema<SpaceMemberDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["owner", "member"],
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const spaceSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: SPACE_TYPES,
      default: "personal",
    },
    monthlyBudget: {
      type: Number,
      default: null,
      min: 0,
    },
    isShared: {
      type: Boolean,
      default: false,
      index: true,
    },
    members: {
      type: [spaceMemberSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "deleting"],
      default: "active",
      index: true,
    },
    deletingAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

spaceSchema.index({ ownerId: 1, type: 1 });
spaceSchema.index({ "members.userId": 1 });

export interface SpaceDoc {
  _id: Types.ObjectId;
  id?: string;
  ownerId: Types.ObjectId;
  name: string;
  type: SpaceType;
  monthlyBudget?: number | null;
  isShared: boolean;
  members: SpaceMemberDoc[];
  role?: SpaceRole;
  status?: "active" | "deleting";
  deletingAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}


export const SpaceModel =
  mongoose.models.Space || model<SpaceDoc>("Space", spaceSchema);


