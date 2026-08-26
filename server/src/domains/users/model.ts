import mongoose, { Schema, model } from "mongoose";

import { RESERVED_USERNAMES } from "../../shared/index.js";

const userSchema = new Schema(
  {
    betterAuthId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_]+$/,
      validate: {
        validator: (v: string) => !RESERVED_USERNAMES.has(v.toLowerCase()),
        message: "Username is reserved",
      },
    },
    image: {
      type: String,
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 }, { sparse: true });

export const UserModel = mongoose.models.User || model("User", userSchema);