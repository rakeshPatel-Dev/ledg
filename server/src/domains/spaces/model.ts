import mongoose, { Schema, model, type Types } from "mongoose";

import { SPACE_TYPES, type SpaceType } from "../../shared/index.js";

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
  },
  {
    timestamps: true,
  }
);

spaceSchema.index({ ownerId: 1, type: 1 });

export interface SpaceDoc {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  type: SpaceType;
  monthlyBudget?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export const SpaceModel = mongoose.models.Space || model("Space", spaceSchema);

