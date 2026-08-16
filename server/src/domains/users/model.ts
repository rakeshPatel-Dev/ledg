import mongoose, { Schema, model } from "mongoose";

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

export const UserModel = mongoose.models.User || model("User", userSchema);