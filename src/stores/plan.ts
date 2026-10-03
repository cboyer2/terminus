// Derives the Plan from stateStore via generator/cycles.ts — the only seam
// into generator/ (docs/ARCHITECTURE.md §5). Nothing else in src/ should
// import from generator/ directly.

import { derived } from "svelte/store";

import { generatePlan } from "../generator/cycles";
import type { Lift, LiftKey, Plan } from "../generator/types";
import { stateStore } from "./state";

// Every current template needs exactly these four. Missing one is the
// normal, expected state before setup finishes, not a failure.
const REQUIRED_LIFT_KEYS: LiftKey[] = ["squat", "bench", "deadlift", "press"];

function hasAllRequiredLifts(lifts: Lift[]): boolean {
  return REQUIRED_LIFT_KEYS.every((key) => lifts.some((lift) => lift.liftKey === key));
}

export interface PlanResult {
  plan: Plan | null;
  error: Error | null;
}

export const planStore = derived<typeof stateStore, PlanResult>(stateStore, ({ lifts, program }) => {
  if (!program || !hasAllRequiredLifts(lifts)) {
    return { plan: null, error: null };
  }
  try {
    return { plan: generatePlan(lifts, program), error: null };
  } catch (err) {
    return { plan: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
});
