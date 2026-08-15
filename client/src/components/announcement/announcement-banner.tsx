import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog } from "@base-ui/react/dialog";

import { ANNOUNCEMENTS_STORAGE_KEY, getLatestAnnouncement, type Announcement } from "@/data/announcements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
    setAnnouncement(getLatestAnnouncement(lastSeen));
  }, []);

  useEffect(() => {
    if (announcement) {
      const timer = window.setTimeout(() => setOpen(true), 400);
      return () => window.clearTimeout(timer);
    }
  }, [announcement]);

  if (!announcement) return null;

  const dismiss = () => {
    localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, announcement.id);
    setAnnouncement(null);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => {
      setOpen(next);
      if (!next) dismiss();
    }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md transition-opacity" />
        <Dialog.Popup className="fixed inset-0 z-50 flex items-center justify-center p-6 outline-none">
          <div className="w-full max-w-sm rounded-4xl border border-white/30 bg-card/90 p-6 text-center shadow-2xl shadow-black/30 backdrop-blur-2xl backdrop-saturate-180 outline-none">
            <button
              type="button"
              aria-label="Dismiss announcement"
              onClick={dismiss}
              className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground active:scale-95"
            >
              <X className="size-4" />
            </button>

            <span className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-primary text-primary shadow-sm">
              {/* <Sparkles className="size-7" /> */}
              <img src="/ledg-logo.svg" alt="Logo" className="size-7 rounded-full" />

            </span>

            <div className="mt-4 flex items-center justify-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                What&apos;s New
              </Badge>
            </div>

            <Dialog.Title className="mt-2 text-lg font-extrabold tracking-tight text-foreground">
              {announcement.title}
            </Dialog.Title>

            <Dialog.Description className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
              {announcement.message}
            </Dialog.Description>

            <div className="mt-5 flex flex-col gap-2">
              {announcement.link ? (
                <Button
                autoFocus
                  size="lg"
                  className="w-full rounded-full"
                  render={<Link to={announcement.link.to} onClick={dismiss} />}
                >
                  {announcement.link.label}
                </Button>
              ) : null}
            </div>
             <span className="text-[0.65rem] font-semibold text-muted-foreground">
                {announcement.version}
              </span>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}