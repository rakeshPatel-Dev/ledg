export interface Announcement {
  id: string;
  title: string;
  message: string;
  version: string;
  date: string;
  link?: { to: string; label: string };
}

// Newest first. Add a new entry at the top of this array to announce a
// feature or update. Each announcement is shown once per user and never
// replayed (tracked via ledg-announcements-last-seen in localStorage).
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "motion-control",
    title: "New: Motion Control",
    message:
      "You can now control how animated the app feels — Full, Reduced, or System Default — right from Settings.",
    version: "v1.2.0",
    date: "2026-08-15",
    link: { to: "/settings", label: "Open Settings" },
  },
];

export const ANNOUNCEMENTS_STORAGE_KEY = "ledg-announcements-last-seen";

export function getLatestAnnouncement(lastSeenId: string | null): Announcement | null {
  if (ANNOUNCEMENTS.length === 0) return null;
  const latest = ANNOUNCEMENTS[0];
  if (lastSeenId === latest.id) return null;
  return latest;
}