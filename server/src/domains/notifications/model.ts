import mongoose, { Schema, model, type Types } from "mongoose";

import {
  NOTIFICATION_TYPES,
  TRANSACTION_ACTIVITY_MODES,
  type NotificationType,
  type TransactionActivityMode,
} from "../../shared/index.js";

export interface NotificationDataDoc {
  spaceId?: string;
  spaceName?: string;
  invitationId?: string;
  actorId?: string;
  actorName?: string;
  transactionId?: string;
  transactionType?: string;
  amount?: number;
  recipientName?: string;
}

export interface NotificationDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data: NotificationDataDoc;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    data: {
      spaceId: { type: String },
      spaceName: { type: String },
      invitationId: { type: String },
      actorId: { type: String },
      actorName: { type: String },
      transactionId: { type: String },
      transactionType: { type: String },
      amount: { type: Number },
      recipientName: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
// 90-day TTL index (90 * 24 * 60 * 60 = 7,776,000 seconds)
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export const NotificationModel =
  mongoose.models.Notification ||
  model<NotificationDoc>("Notification", notificationSchema);

export interface NotificationPreferenceDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  transactionActivity: TransactionActivityMode;
  inviteEvents: boolean;
  memberChanges: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationPreferenceSchema = new Schema<NotificationPreferenceDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    transactionActivity: {
      type: String,
      enum: TRANSACTION_ACTIVITY_MODES,
      default: "realtime",
    },
    inviteEvents: {
      type: Boolean,
      default: true,
    },
    memberChanges: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const NotificationPreferenceModel =
  mongoose.models.NotificationPreference ||
  model<NotificationPreferenceDoc>(
    "NotificationPreference",
    notificationPreferenceSchema
  );
