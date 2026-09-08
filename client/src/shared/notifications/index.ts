import type { NotificationType } from "../enums/index.js";
import { formatCurrency } from "../utils/index.js";

export interface NotificationTemplate {
  title: string;
  message: string;
}

export type NotificationTemplateMap = Record<
  NotificationType,
  NotificationTemplate | Record<string, NotificationTemplate>
>;

/**
 * Single source of truth for notification copy. Edit the strings here to
 * change what users see; callers only pass a `type`, `data` and an optional
 * `variant`. Message placeholders are `{camelCase}` keys from `data`.
 * Multi-copy types map a `variant` → `NotificationTemplate`.
 */
export const NOTIFICATION_TEMPLATES: NotificationTemplateMap = {
  space_invite: {
    title: "New Space Invitation",
    message: `{actorName} invited you to join "{spaceName}"`,
  },
  invite_accepted: {
    title: "Invitation Accepted",
    message: `{actorName} accepted your invitation to join "{spaceName}"`,
  },
  invite_rejected: {
    title: "Invitation Declined",
    message: `{actorName} declined the invitation to join "{spaceName}"`,
  },
  member_joined: {
    title: "New Member Joined",
    message: `{actorName} joined "{spaceName}"`,
  },
  member_left: {
    title: "Member Left Space",
    message: `{actorName} left "{spaceName}"`,
  },
  member_removed: {
    title: "Removed from Space",
    message: `You were removed from "{spaceName}" by the owner`,
  },
  ownership_transferred: {
    to_new_owner: {
      title: "Ownership Transferred",
      message: `{actorName} transferred ownership of "{spaceName}" to you`,
    },
    to_former_owner: {
      title: "Ownership Transferred",
      message: `You transferred ownership of "{spaceName}" to {recipientName}`,
    },
  },
  transaction_added: {
    title: "New Transaction Added",
    message: `{actorName} added an {transactionType} of {amount} in "{spaceName}"`,
  },
  transaction_modified: {
    edited: {
      title: "Transaction Modified",
      message: `The owner ({actorName}) edited your transaction in "{spaceName}"`,
    },
    deleted: {
      title: "Transaction Deleted",
      message: `The owner ({actorName}) deleted your transaction in "{spaceName}"`,
    },
  },
  space_deleted: {
    title: "Space Deleted",
    message: `The shared space "{spaceName}" has been deleted by its owner`,
  },
};

function isTemplate(entry: unknown): entry is NotificationTemplate {
  return typeof entry === "object" && entry !== null && "title" in entry;
}

export function getNotificationTemplate(
  type: NotificationType,
  variant?: string
): NotificationTemplate {
  const entry = NOTIFICATION_TEMPLATES[type];
  if (isTemplate(entry)) return entry;
  if(!variant || !entry[variant]) {
    throw new Error(`No notification template found for type "${type}" and variant "${variant}"`);
  }
  return entry[variant];
}

const TEMPLATE_FORMATTERS: Record<string, (value: unknown) => string> = {
  amount: (value) => formatCurrency(Number(value) || 0),
};

export function renderNotification(
  type: NotificationType,
  vars: Record<string, unknown> = {},
  variant?: string
): NotificationTemplate {
  const template = getNotificationTemplate(type, variant);
  const message = template.message.replace(
    /\{(\w+)\}/g,
    (match, key: string) => {
      const value = vars[key];
      if (value === undefined || value === null) return match;
      const formatter = TEMPLATE_FORMATTERS[key];
      return formatter ? formatter(value) : String(value);
    }
  );
  return { title: template.title, message };
}