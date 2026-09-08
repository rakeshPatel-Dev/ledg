import { Types } from "mongoose";

import {
  NotificationModel,
  NotificationPreferenceModel,
  type NotificationDoc,
  type NotificationDataDoc,
  type NotificationPreferenceDoc,
} from "./model.js";
import { renderNotification } from "../../shared/index.js";
import type { NotificationType } from "../../shared/index.js";
import { NotFoundError, BadRequestError } from "../../common/errors/index.js";
import { redis } from "../../config/redis.js";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

// ─── Transaction spam suppression ──────────────────────────────────────────
// Threshold: max `SPAM_THRESHOLD` notifications per 60s per actor/space pair.
// When Redis is configured (Vercel/production) the window is global across
// server instances via a sorted-set with a TTL; otherwise a per-process Map
// fallback keeps local dev working (per-instance only — see M1).

const SPAM_WINDOW_MS = 60_000; // 1 minute
const SPAM_THRESHOLD = 10; // max 10 notifications per minute per actor/space
const SPAM_KEY_PREFIX = "notif:spam:";

// Per-process fallback store (used only when Upstash env vars are absent).
const spamWindow = new Map<string, number[]>();

function spamKey(actorId: string, spaceId: string): string {
  return `${SPAM_KEY_PREFIX}${actorId}:${spaceId}`;
}

async function isSpamSuppressed(
  actorId: string,
  spaceId?: string
): Promise<boolean> {
  if (!spaceId) return false;
  const key = spamKey(actorId, spaceId);
  const now = Date.now();
  const windowStart = now - SPAM_WINDOW_MS;

  if (redis) {
    // Sorted-set sliding window: drop timestamps older than the window, count
    // what remains, then (if under threshold) add the current timestamp with
    // a TTL so the key self-expires.
    const member = `${now}-${Math.random().toString(36).slice(2)}`;
    const pipeline = redis
      .pipeline()
      .zremrangebyscore(key, 0, windowStart)
      .zcard(key)
      .zadd(key, { score: now, member })
      .expire(key, Math.ceil(SPAM_WINDOW_MS / 1000) + 60);

    const [, count] = await pipeline.exec<Array<number | null>>();

    if ((count ?? 0) >= SPAM_THRESHOLD) {
      // Over threshold — this notification is suppressed. The timestamp was
      // already added; the next call within the window reflects it.
      return true;
    }
    return false;
  }

  // Per-process fallback (local dev without Upstash env vars).
  const timestamps = (spamWindow.get(key) || []).filter(
    (t) => now - t < SPAM_WINDOW_MS
  );

  if (timestamps.length >= SPAM_THRESHOLD) {
    return true;
  }

  timestamps.push(now);
  spamWindow.set(key, timestamps);
  scheduleSpamPrune();
  return false;
}

// Periodically evict stale keys so idle actor/space pairs don't leak
// entries forever. The timer is unref'd so a long-running process never
// keeps itself alive, and it is started lazily on first use.
let spamPruneTimer: NodeJS.Timeout | null = null;
function scheduleSpamPrune(): void {
  if (spamPruneTimer) return;
  spamPruneTimer = setInterval(pruneSpamWindow, SPAM_WINDOW_MS);
  spamPruneTimer.unref?.();
}

function pruneSpamWindow(now: number = Date.now()): void {
  for (const [key, timestamps] of spamWindow) {
    const alive = timestamps.filter((t) => now - t < SPAM_WINDOW_MS);
    if (alive.length === 0) {
      spamWindow.delete(key);
    } else {
      spamWindow.set(key, alive);
    }
  }
}

export async function getPreferences(
  userId: Types.ObjectId
): Promise<NotificationPreferenceDoc> {
  const prefs = await NotificationPreferenceModel.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        transactionActivity: "realtime",
        inviteEvents: true,
        memberChanges: true,
      },
    },
    { returnDocument: "after", upsert: true, runValidators: true }
  ).lean();

  return {
    ...prefs!,
    id: String(prefs!._id),
  } as unknown as NotificationPreferenceDoc;
}

export async function updatePreferences(
  userId: Types.ObjectId,
  updates: {
    transactionActivity?: "realtime" | "daily_digest" | "off";
    inviteEvents?: boolean;
    memberChanges?: boolean;
  }
): Promise<NotificationPreferenceDoc> {
  const prefs = await NotificationPreferenceModel.findOneAndUpdate(
    { userId },
    { $set: updates },
    { returnDocument: "after", upsert: true, runValidators: true }
  ).lean();

  return {
    ...prefs,
    id: String(prefs!._id),
  } as unknown as NotificationPreferenceDoc;
}

export interface NotifyParams {
  userId: Types.ObjectId;
  type: NotificationType;
  data?: NotificationDataDoc;
  /** Which copy variant to use for multi-message types (e.g. ownership_transferred). */
  variant?: string;
  /** Optional manual overrides that win over the shared template. */
  title?: string;
  message?: string;
}

export async function notify({
  userId,
  type,
  data = {},
  variant,
  title,
  message,
}: NotifyParams): Promise<NotificationDoc | null> {
  const template = renderNotification(
    type,
    data as Record<string, unknown>,
    variant
  );
  // Check recipient preferences
  const prefs = await getPreferences(userId);

  if (type === "transaction_added" || type === "transaction_modified") {
    if (prefs.transactionActivity !== "realtime") {
      return null;
    }
    // Spam suppression only applies to the bulk "added" path; edits are
    // user-initiated and far less frequent.
    if (type === "transaction_added" && data.actorId && (await isSpamSuppressed(data.actorId, data.spaceId))) {
      return null;
    }
  }

  if (
    (type === "space_invite" ||
      type === "invite_accepted" ||
      type === "invite_rejected") &&
    prefs.inviteEvents === false
  ) {
    return null;
  }

  if (
    (type === "member_joined" ||
      type === "member_left" ||
      type === "member_removed" ||
      type === "ownership_transferred") &&
    prefs.memberChanges === false
  ) {
    return null;
  }

  // NOTE: `space_deleted` intentionally bypasses all preferences — it is a
  // direct-action, irreversible event and members must always learn their
  // space is gone. This is documented in the prefs UI.

  const notification = await NotificationModel.create({
    userId,
    type,
    title: title ?? template.title,
    message: message ?? template.message,
    read: false,
    data,
  });

  return toNotificationDto(notification.toObject());
}

export async function notifyMembers({
  recipientIds,
  type,
  variant,
  data = {},
  title,
  message,
}: {
  recipientIds: Types.ObjectId[];
  type: NotificationType;
  variant?: string;
  data?: NotificationDataDoc;
  title?: string;
  message?: string;
}): Promise<void> {
  await Promise.allSettled(
    recipientIds.map((id) =>
      notify({
        userId: id,
        type,
        variant,
        data,
        title,
        message,
      })
    )
  );
}

export async function listNotifications(
  userId: Types.ObjectId,
  page = 1,
  pageSize = 20
) {
  const skip = (page - 1) * pageSize;

  const [items, total, unreadCount] = await Promise.all([
    NotificationModel.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    NotificationModel.countDocuments({ userId }),
    NotificationModel.countDocuments({ userId, read: false }),
  ]);

  return {
    items: items.map(toNotificationDto),
    total,
    unreadCount,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function markAsRead(
  userId: Types.ObjectId,
  notificationId: string
): Promise<NotificationDoc> {
  if (!OBJECT_ID_RE.test(notificationId)) {
    throw new BadRequestError("Invalid notification id");
  }

  const notification = await NotificationModel.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { read: true } },
    { returnDocument: "after" }
  ).lean();

  if (!notification) {
    throw new NotFoundError("Notification");
  }

  return toNotificationDto(notification);
}

export async function markAllAsRead(
  userId: Types.ObjectId
): Promise<{ updatedCount: number }> {
  const result = await NotificationModel.updateMany(
    { userId, read: false },
    { $set: { read: true } }
  );

  return { updatedCount: result.modifiedCount };
}

function toNotificationDto(
  doc: Record<string, unknown>
): NotificationDoc {
  return {
    ...doc,
    id: String(doc._id),
  } as unknown as NotificationDoc;
}
