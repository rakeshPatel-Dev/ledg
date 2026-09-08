import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Check,
  Loader2,
  Mail,
  Users,
  X,
  AlertCircle,
  ArrowRight,
  Shield,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth-provider";
import {
  useInvitationPreview,
  useAcceptInvitationByToken,
  useRejectInvitationByToken,
} from "@/lib/queries";
import AppLogo from "@/components/common/app-logo";


export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isSignedIn, isLoaded } = useAuth();

  const { data: preview, isLoading, isError, error } = useInvitationPreview(token);
  const acceptMutation = useAcceptInvitationByToken();
  const rejectMutation = useRejectInvitationByToken();

  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const result = await acceptMutation.mutateAsync(token);
      toast.success(`You joined "${result.spaceName}"!`);
      navigate(`/spaces/${result.spaceId}`, { replace: true });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to accept invitation"
      );
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    setRejecting(true);
    try {
      await rejectMutation.mutateAsync(token);
      toast.info("Invitation declined");
      navigate("/spaces", { replace: true });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to decline invitation"
      );
      setRejecting(false);
    }
  };

  const isEmailMismatch =
    isSignedIn &&
    user?.email &&
    preview?.inviteeEmail &&
    user.email.toLowerCase() !== preview.inviteeEmail.toLowerCase() &&
    // Server also accepts when inviteeId matches (user changed email after invite)
    user.id !== preview.inviteeId;

  const formatExpiry = (expiresAtStr?: string) => {
    if (!expiresAtStr) return "";
    try {
      return formatDistanceToNow(new Date(expiresAtStr), { addSuffix: true });
    } catch {
      return "";
    }
  };

  if (isLoading || !isLoaded) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-4">
        <Card className="flex w-full max-w-md flex-col items-center gap-4 rounded-4xl p-8 border border-border/60 text-center">
          <Skeleton className="size-16 rounded-3xl" />
          <Skeleton className="h-6 w-48 rounded-full" />
          <Skeleton className="h-4 w-64 rounded-full" />
          <Skeleton className="h-12 w-full rounded-full mt-4" />
        </Card>
      </div>
    );
  }

  if (isError || !preview) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-4">
        <Card className="flex w-full max-w-md flex-col rounded-4xl p-8 border border-border/60 text-center shadow-lg">
          <EmptyState
            icon={<AlertCircle className="size-8 text-rose-500" />}
            title="Invitation Expired or Invalid"
            description={
              error instanceof Error
                ? error.message
                : "This invitation link is invalid, has expired, or was already claimed."
            }
            action={
              <Button
                onClick={() => navigate("/")}
                className="rounded-full font-semibold"
              >
                Go to Home
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-4 bg-radial from-primary/5 via-background to-background">
      <div className="mb-6 flex items-center justify-center">
        <AppLogo />
      </div>

      <Card className="flex w-full max-w-md flex-col rounded-4xl p-7 border border-border/60 bg-card/85 backdrop-blur-2xl shadow-xl shadow-black/10">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex size-16 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-inner">
            <Users className="size-8" />
          </div>

          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary">
              <Mail className="size-3" /> Space Invitation
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {preview.spaceName}
            </h1>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground font-semibold">
                {preview.inviterName}
              </strong>{" "}
              {preview.inviterUsername
                ? `(@${preview.inviterUsername})`
                : null}{" "}
              invited you to collaborate in this shared space.
            </p>
          </div>
        </div>

        <div className="my-5 rounded-2xl bg-muted/40 p-3.5 border border-border/40 text-xs text-muted-foreground flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Invited email:</span>
            <span className="font-semibold text-foreground">
              {preview.inviteeEmail}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Expires:</span>
            <span className="font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              {formatExpiry(preview.expiresAt)}
            </span>
          </div>
        </div>

        {/* Action Buttons based on Auth State */}
        {!isSignedIn ? (
          <div className="flex flex-col gap-2.5">
            <Button
              size="lg"
              className="w-full rounded-full font-bold shadow-md shadow-primary/20"
              onClick={() =>
                navigate("/sign-up", {
                  state: {
                    from: location,
                    email: preview.inviteeEmail,
                  },
                })
              }
            >
              Sign up to accept <ArrowRight className="size-4 ml-1.5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full rounded-full font-semibold"
              onClick={() =>
                navigate("/sign-in", {
                  state: {
                    from: location,
                    email: preview.inviteeEmail,
                  },
                })
              }
            >
              Sign in with existing account
            </Button>
          </div>
        ) : isEmailMismatch ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-destructive/10 p-3 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p>
                You are currently signed in as <strong>{user?.email}</strong>.
                This invite was sent to <strong>{preview.inviteeEmail}</strong>.
                Please sign in with that email to claim this invitation.
              </p>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="w-full rounded-full font-semibold"
              onClick={() =>
                navigate("/sign-in", {
                  state: {
                    from: location,
                    email: preview.inviteeEmail,
                  },
                })
              }
            >
              Switch Account
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <Button
              size="lg"
              disabled={accepting}
              onClick={handleAccept}
              className="w-full rounded-full font-bold shadow-md shadow-primary/25"
            >
              {accepting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Accepting…
                </>
              ) : (
                <>
                  <Check className="size-4 mr-2" />
                  Accept Invitation
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={accepting || rejecting}
              onClick={handleDecline}
              className="w-full rounded-full font-medium"
            >
              {rejecting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Declining…
                </>
              ) : (
                <>
                  <X className="size-4 mr-2" />
                  Decline
                </>
              )}
            </Button>
          </div>
        )}

        <div className="mt-5 text-center text-[11px] text-muted-foreground/70 flex items-center justify-center gap-1">
          <Shield className="size-3" />
          <span>Ledg Secure Invitation System</span>
        </div>
      </Card>
    </div>
  );
}
