import type { LiftKey } from "./generator/types";

export const LIFT_ORDER: LiftKey[] = ["squat", "bench", "deadlift", "press"];

export const LIFT_LABELS: Record<LiftKey, string> = {
  squat: "Squat",
  bench: "Bench Press",
  deadlift: "Deadlift",
  press: "Press",
};
