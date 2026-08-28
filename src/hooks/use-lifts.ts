// Wraps data/lifts.ts + data/cache.ts. See docs/ARCHITECTURE.md §4 "Reads
// offline": render from cache immediately, then reconcile with a live
// fetch. Writes have no optimistic update — state only changes once the
// write actually succeeds (§4 "Writes offline").

import { useAuthContext } from "@/hooks/use-auth-context";
import { getCachedLifts, setCachedLifts } from "@/data/cache";
import { getLifts, upsertLift } from "@/data/lifts";
import type { Lift } from "@/generator/types";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

interface UseLiftsResult {
  lifts: Lift[] | null;
  isLoading: boolean;
  error: Error | null;
  /** Insert or update one lift, then refetch so `lifts` reflects the server. */
  saveLift: (lift: Lift) => Promise<void>;
}

export function useLifts(): UseLiftsResult {
  const { claims } = useAuthContext();
  const [lifts, setLifts] = useState<Lift[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Refetches every time this screen regains focus, not just on mount —
  // tabs stay mounted across switches, so a mount-only effect would leave
  // e.g. the Plan tab showing stale (or absent) lifts after they're entered
  // on the Maxes tab. isLoading is only ever cleared, never reset back to
  // true here, so a refocus-triggered refetch updates quietly in the
  // background rather than flashing a spinner over already-visible data.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      getCachedLifts().then((cached) => {
        if (!cancelled && cached) {
          setLifts(cached);
        }
      });

      getLifts()
        .then((fresh) => {
          if (cancelled) return;
          setLifts(fresh);
          setError(null);
          setCachedLifts(fresh);
        })
        .catch((err) => {
          if (!cancelled) setError(toError(err));
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [])
  );

  const saveLift = useCallback(
    async (lift: Lift) => {
      const userId = claims?.sub;
      if (!userId) {
        throw new Error("Cannot save a lift while signed out.");
      }
      await upsertLift(userId, lift);
      const fresh = await getLifts();
      setLifts(fresh);
      await setCachedLifts(fresh);
    },
    [claims?.sub]
  );

  return { lifts, isLoading, error, saveLift };
}
