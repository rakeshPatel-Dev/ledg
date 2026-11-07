import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);

  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

/** Tracks the browser's connection state so the shell can warn the user. */
export function useOnlineStatus(): boolean {
  // Assume online during server rendering / the first paint.
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
