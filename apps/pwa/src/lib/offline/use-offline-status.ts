import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

export function useOfflineStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, () => true);
  return { isOnline, isOffline: !isOnline };
}
