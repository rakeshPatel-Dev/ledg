import mongoose, { Schema, model, type Types } from "mongoose";

import {
  PAYMENT_METHODS,
  TRANSACTION_TYPES,
  type PaymentMethod,
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
    tags: {
      type: [String],
      default: [],
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ spaceId: 1, date: -1 });
transactionSchema.index({ spaceId: 1, type: 1, date: -1 });

export interface TransactionDoc {
  _id: Types.ObjectId;
  spaceId: Types.ObjectId;
  category: string;
  type: TransactionType;
  amount: number;
  note: string;
  date: Date;
  tags: string[];
  paymentMethod: PaymentMethod | null;
  createdAt: Date;
  updatedAt: Date;
}

export const TransactionModel = mongoose.models.Transaction || model("Transaction", transactionSchema);
