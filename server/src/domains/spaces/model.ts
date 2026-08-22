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
    // Phase 2: per-category monthly budget limits (category -> amount)
    budget: {
      type: Map,
      of: Number,
      default: {},
    },
    // Phase 2: savings goal amount
    savingsGoal: {
      type: Number,
      default: null,
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
  budget?: Map<string, number>;
  savingsGoal?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export const SpaceModel = mongoose.models.Space || model("Space", spaceSchema);

