// The seam: composes stored lifts + program (from data/, via useLifts and
// data/program.ts) with the pure generator to produce a Plan. Nothing else
// in app/ should import from generator/ directly — see
// docs/ARCHITECTURE.md §5. Editing lifts is useLifts' job (used directly by
// the maxes screen); this hook only reads them to compute the plan.

import { useAuthContext } from "@/hooks/use-auth-context";
import { useLifts } from "@/hooks/use-lifts";
import { getCachedProgram, setCachedProgram } from "@/data/cache";
import { getProgram, setProgram } from "@/data/program";
import { generatePlan } from "@/generator/cycles";
import type { Lift, LiftKey, Plan, Program } from "@/generator/types";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

// Every current template needs exactly these four — none yet requires an
// extra supplemental lift of its own. Missing one is the normal, expected
// state before setup finishes, not a failure: generatePlan() would throw
// "Missing lift: ..." for it, which is correct behavior for the generator
// but the wrong thing to surface as a hook-level `error` (docs/ARCHITECTURE.md
// §4's "the plan is derived" applies just as much to *not having* one yet).
const REQUIRED_LIFT_KEYS: LiftKey[] = ["squat", "bench", "deadlift", "press"];

function hasAllRequiredLifts(lifts: Lift[]): boolean {
  return REQUIRED_LIFT_KEYS.every((key) => lifts.some((lift) => lift.liftKey === key));
}

interface UsePlanResult {
  /** null until a program exists and all lifts it needs are present. */
  plan: Plan | null;
  program: Program | null;
  isLoading: boolean;
  error: Error | null;
  /** Insert or update the program, then re-derive the plan from it. */
  saveProgram: (program: Program) => Promise<void>;
}

export function usePlan(): UsePlanResult {
  const { claims } = useAuthContext();
  const { lifts, isLoading: isLiftsLoading, error: liftsError } = useLifts();
  const [program, setProgramState] = useState<Program | null>(null);
  const [isProgramLoading, setIsProgramLoading] = useState(true);
  const [programError, setProgramError] = useState<Error | null>(null);

  // Refetches on every focus, not just mount — see the matching comment in
  // use-lifts.ts. Without this, the Plan tab would keep showing whatever
  // program (or lack of one) existed the first time it was ever focused,
  // never picking up a save made from the Templates tab.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      getCachedProgram().then((cached) => {
        if (!cancelled && cached) {
          setProgramState(cached);
        }
      });

      getProgram()
        .then((fresh) => {
          if (cancelled) return;
          setProgramState(fresh);
          setProgramError(null);
          if (fresh) setCachedProgram(fresh);
        })
        .catch((err) => {
          if (!cancelled) setProgramError(toError(err));
        })
        .finally(() => {
          if (!cancelled) setIsProgramLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [])
  );

  const saveProgram = useCallback(
    async (next: Program) => {
      const userId = claims?.sub;
      if (!userId) {
        throw new Error("Cannot save a program while signed out.");
      }
      await setProgram(userId, next);
      setProgramState(next);
      await setCachedProgram(next);
    },
    [claims?.sub]
  );

  // No plan is ever persisted (docs/ARCHITECTURE.md §4) — it's re-derived
  // here from whatever lifts + program happen to be in state, every time
  // either changes. A lift missing from the template's requirements (e.g.
  // mid-setup, before all maxes are entered) surfaces as a plan of null
  // rather than a thrown render error.
  const { plan, planError } = useMemo(() => {
    if (!lifts || !program || !hasAllRequiredLifts(lifts)) {
      return { plan: null, planError: null };
    }
    try {
      return { plan: generatePlan(lifts, program), planError: null };
    } catch (err) {
      return { plan: null, planError: toError(err) };
    }
  }, [lifts, program]);

  return {
    plan,
    program,
    isLoading: isLiftsLoading || isProgramLoading,
    error: programError ?? liftsError ?? planError,
    saveProgram,
  };
}
