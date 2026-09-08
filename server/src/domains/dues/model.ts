import mongoose, { Schema, model, type Types } from "mongoose";

import {
  DEBT_DIRECTIONS,
  DEBT_STATUSES,
  PAYMENT_METHODS,
  type DebtDirection,
  type DebtStatus,
  type PaymentMethod,
} from "../../shared/index.js";

const debtSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    spaceId: {
      type: Schema.Types.ObjectId,
      ref: "Space",
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: DEBT_DIRECTIONS,
      required: true,
      index: true,
    },
    counterparty: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
        default: null,
      },
      linkedUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    principal: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    status: {
      type: String,
      enum: DEBT_STATUSES,
      default: "open",
      index: true,
    },
    settledAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

debtSchema.index({ userId: 1, status: 1 });
debtSchema.index({ userId: 1, "counterparty.name": 1 });
debtSchema.index({ userId: 1, dueDate: 1 });
debtSchema.index({ userId: 1, date: -1 });

export interface DebtDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  spaceId: Types.ObjectId;
  direction: DebtDirection;
  counterparty: {
    name: string;
    phone?: string | null;
    linkedUserId?: Types.ObjectId | null;
  };
  principal: number;
  date: Date;
  dueDate?: Date | null;
  note: string;
  transactionId?: Types.ObjectId | null;
  status: DebtStatus;
  settledAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export const DebtModel = mongoose.models.Debt || model("Debt", debtSchema);

const debtSettlementSchema = new Schema(
  {
    debtId: {
      type: Schema.Types.ObjectId,
      ref: "Debt",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    spaceId: {
      type: Schema.Types.ObjectId,
      ref: "Space",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

debtSettlementSchema.index({ debtId: 1, date: -1 });

export interface DebtSettlementDoc {
  _id: Types.ObjectId;
  debtId: Types.ObjectId;
  userId: Types.ObjectId;
  spaceId: Types.ObjectId;
  amount: number;
  date: Date;
  paymentMethod: PaymentMethod | null;
  note: string;
  transactionId?: Types.ObjectId | null;
  createdAt: Date;
}

export const DebtSettlementModel =
  mongoose.models.DebtSettlement || model("DebtSettlement", debtSettlementSchema);
