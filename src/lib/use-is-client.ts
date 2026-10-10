import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True only after client-side hydration. Gates browser-only UI (localStorage,
 * window) without a server/client hydration mismatch and without calling
 * setState inside an effect (which React 19 flags).
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
