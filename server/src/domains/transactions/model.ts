import mongoose, { Schema, model, type Types } from "mongoose";

import {
  PAYMENT_METHODS,
  TRANSACTION_SOURCES,
  TRANSACTION_TYPES,
  type PaymentMethod,
  type TransactionSource,
  type TransactionType,
} from "../../shared/index.js";

const transactionSchema = new Schema(
  {
    spaceId: {
      type: Schema.Types.ObjectId,
      ref: "Space",
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: null,
    },
    source: {
      type: String,
      enum: TRANSACTION_SOURCES,
      default: "manual",
      index: true,
    },
    createdBy: {
      userId: {
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
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },
      username: {
        type: String,
        default: null,
        lowercase: true,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ spaceId: 1, date: -1 });
transactionSchema.index({ spaceId: 1, type: 1, date: -1 });
transactionSchema.index({ spaceId: 1, source: 1, date: -1 });
transactionSchema.index({ type: 1, date: -1 });

export interface TransactionCreatedByDoc {
  userId: Types.ObjectId;
  name: string;
  email: string;
  username?: string | null;
}

export interface TransactionDoc {
  _id: Types.ObjectId;
  id?: string;
  spaceId: Types.ObjectId;
  category: string;
  type: TransactionType;
  amount: number;
  note: string;
  date: Date;
  paymentMethod: PaymentMethod | null;
  source: TransactionSource;
  createdBy?: TransactionCreatedByDoc;
  createdAt: Date;
  updatedAt: Date;
}


export const TransactionModel =
  mongoose.models.Transaction ||
  model<TransactionDoc>("Transaction", transactionSchema);

