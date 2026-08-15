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
  },
  {
    timestamps: true,
  }
);

export interface SpaceDoc {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  type: SpaceType;
  createdAt: Date;
  updatedAt: Date;
}

export const SpaceModel = mongoose.models.Space || model("Space", spaceSchema);
