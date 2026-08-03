import mongoose, { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ clerkId: 1 });

export const UserModel = mongoose.models.User || model("User", userSchema);
