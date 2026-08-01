import { Schema, model, type Types } from "mongoose";

import { CATEGORY_TYPES, type CategoryType } from "@ledg/shared";

const categorySchema = new Schema(
  {
    spaceId: {
      type: Schema.Types.ObjectId,
      ref: "Space",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      default: null,
    },
    color: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      enum: CATEGORY_TYPES,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export interface CategoryDoc {
  _id: Types.ObjectId;
  spaceId: Types.ObjectId;
  name: string;
  icon: string | null;
  color: string | null;
  type: CategoryType;
  createdAt: Date;
  updatedAt: Date;
}

export const CategoryModel = model("Category", categorySchema);
