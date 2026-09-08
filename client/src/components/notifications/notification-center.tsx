import { useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Inbox,
  Loader2,
  Mail,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useNotifications,
  usePendingInvitations,
  useAcceptInvitation,
  useRejectInvitation,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/queries";
import type { NotificationItem, NotificationType } from "@ledg/shared";
import { cn } from "@/lib/utils";

const NOTIFICATION_ICONS: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  space_invite: {
    icon: Mail,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
  invite_accepted: {
    icon: UserCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  invite_rejected: {
    icon: X,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  member_joined: {
    icon: Users,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  member_left: {
    icon: UserMinus,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  member_removed: {
    icon: UserMinus,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  ownership_transferred: {
    icon: ShieldCheck,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  transaction_added: {
    icon: ReceiptText,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  transaction_modified: {
    icon: Sparkles,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  space_deleted: {
    icon: Trash2,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: notificationData, isLoading: loadingNotifications } =
    useNotifications(1, 30);
  const { data: pendingInvitations, isLoading: loadingInvitations } =
    usePendingInvitations();

  const acceptMutation = useAcceptInvitation();
  const rejectMutation = useRejectInvitation();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const [actingInviteId, setActingInviteId] = useState<string | null>(null);

  const notifications = notificationData?.items || [];
  const unreadCount = (notificationData?.unreadCount || 0) + (pendingInvitations?.length || 0);

  const handleAccept = async (id: string, spaceName: string) => {
    setActingInviteId(id);
    try {
      const result = await acceptMutation.mutateAsync(id);
      toast.success(`Joined "${spaceName}"!`);
      setOpen(false);
      navigate(`/spaces/${result.spaceId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to accept invitation");
    } finally {
      setActingInviteId(null);
    }
  };

  const handleReject = async (id: string, spaceName: string) => {
    setActingInviteId(id);
    try {
      await rejectMutation.mutateAsync(id);
      toast.info(`Declined invitation to "${spaceName}"`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to decline invitation");
    } finally {
      setActingInviteId(null);
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }

    if (notification.data?.spaceId && notification.type !== "space_deleted") {
      setOpen(false);
      navigate(`/spaces/${notification.data.spaceId}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark notifications as read");
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "";
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Notifications (${notificationData?.unreadCount ?? 0} unread, ${pendingInvitations?.length ?? 0} pending invitations)`}
        onClick={() => setOpen(true)}
        className="relative flex size-10 items-center justify-center rounded-full bg-card/80 backdrop-blur-md text-muted-foreground shadow-xs transition-all hover:bg-card hover:text-foreground active:scale-95 border border-white/20 dark:border-white/10"
      >
        <Bell className="size-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[0.6rem] font-bold text-white shadow-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Notifications"
        description="Stay updated with shared space activities and invitations"
      >
        <div className="flex flex-col gap-4">
          {/* Header controls */}
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {unreadCount > 0 ? `${unreadCount} Unread` : "All caught up"}
            </span>
            {notificationData && notificationData.unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
                className="h-7 px-2 text-xs font-medium text-primary hover:bg-primary/10"
              >
                {markAllReadMutation.isPending ? (
                  <Loader2 className="mr-1.5 size-3 animate-spin" />
                ) : (
                  <CheckCheck className="mr-1.5 size-3.5" />
                )}
                Mark all as read
              </Button>
            )}
          </div>

          {/* Pending Invitations Section */}
          {pendingInvitations && pendingInvitations.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                <Mail className="size-3.5" />
                <span>Pending Invitations ({pendingInvitations.length})</span>
              </div>

              <div className="flex flex-col gap-2">
                {pendingInvitations.map((invite) => {
                  const isActing = actingInviteId === invite.id;
                  return (
                    <Card
                      key={invite.id}
                      className="flex flex-col gap-3 rounded-2xl border-primary/30 bg-primary/5 p-3.5 shadow-xs transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <p className="text-sm font-bold text-foreground">
                            {invite.spaceName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Invited by{" "}
                            <span className="font-semibold text-foreground">
                              {invite.inviterName}
                            </span>
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-[0.65rem] font-bold text-primary">
                          Invite
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          disabled={isActing}
                          onClick={() => handleAccept(invite.id, invite.spaceName)}
                          className="flex-1 h-8 rounded-full bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90"
                        >
                          {isActing && acceptMutation.isPending ? (
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          ) : (
                            <Check className="mr-1.5 size-3.5" />
                          )}
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isActing}
                          onClick={() => handleReject(invite.id, invite.spaceName)}
                          className="flex-1 h-8 rounded-full border-border/80 text-xs font-medium hover:bg-destructive/10 hover:text-destructive"
                        >
                          {isActing && rejectMutation.isPending ? (
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          ) : (
                            <X className="mr-1.5 size-3.5" />
                          )}
                          Decline
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Activity Notifications List */}
          <div className="flex flex-col gap-2">
            {pendingInvitations && pendingInvitations.length > 0 && (
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-2">
                Recent Activity
              </span>
            )}

            {loadingNotifications || loadingInvitations ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 && (!pendingInvitations || pendingInvitations.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                  <Inbox className="size-6" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-foreground">
                    No notifications
                  </p>
                  <p className="text-xs text-muted-foreground max-w-[220px]">
                    You&apos;re completely up to date with all your spaces.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {notifications.map((item) => {
                  const iconConfig =
                    NOTIFICATION_ICONS[item.type] || NOTIFICATION_ICONS.space_invite;
                  const Icon = iconConfig.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNotificationClick(item)}
                      className={cn(
                        "group flex items-start gap-3 rounded-2xl p-3 text-left transition-all border",
                        item.read
                          ? "border-transparent bg-transparent hover:bg-muted/40"
                          : "border-primary/20 bg-primary/5 hover:bg-primary/10"
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full",
                          iconConfig.bg,
                          iconConfig.color
                        )}
                      >
                        <Icon className="size-4" />
                      </div>

                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={cn(
                              "text-xs font-semibold truncate",
                              item.read
                                ? "text-foreground/90"
                                : "text-foreground font-bold"
                            )}
                          >
                            {item.title}
                          </p>
                          {!item.read && (
                            <span className="size-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {item.message}
                        </p>
                        <span className="flex items-center gap-1 text-[0.65rem] text-muted-foreground/70 mt-1.5">
                          <Clock className="size-3" />
                          {formatTime(item.createdAt)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Sheet>
    </>
  );
}
