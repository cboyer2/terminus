// Fields every Boring But Big template shares unless its own section says
// otherwise — docs/templates/boring-but-big.md "What the family shares".
// Composed into each record, not inherited: a template spreads in only the
// pieces it uses and states everything else itself.

import type { AssistanceTarget, Conditioning, JumpsOrThrows, MainWorkSet, SessionShape, TemplateId } from "../types";

/** Only `original-531` exists as a record today; the book names eight more
 * compatible anchors (boring-but-big.md "Compatible anchors") that don't. */
export const BBB_COMPATIBLE_ANCHOR_IDS: TemplateId[] = ["original-531"];

export const BBB_SUPPORTED_DAY_COUNTS: (2 | 3 | 4)[] = [4, 3];

export const BBB_SESSION_SHAPE: SessionShape = {
  4: {
    workouts: [
      { label: "Squat", liftKeys: ["squat"] },
      { label: "Bench Press", liftKeys: ["bench"] },
      { label: "Deadlift", liftKeys: ["deadlift"] },
      { label: "Press", liftKeys: ["press"] },
    ],
  },
  // The 3-day schedule is a 4-calendar-week rotation, not 3 — each lift
  // sits out exactly one week in four. Every lift still gets exactly 3
  // appearances — one per progression step — by the time the rotation
  // wraps; see cycles.ts's week-rotation branch of buildMainCycleSessions
  // for how a lift's own appearance count (not the calendar week) picks its
  // progression step.
  3: {
    weeks: [
      [
        { label: "Squat", liftKeys: ["squat"] },
        { label: "Bench Press", liftKeys: ["bench"] },
        { label: "Deadlift", liftKeys: ["deadlift"] },
      ],
      [
        { label: "Press", liftKeys: ["press"] },
        { label: "Squat", liftKeys: ["squat"] },
        { label: "Bench Press", liftKeys: ["bench"] },
      ],
      [
        { label: "Deadlift", liftKeys: ["deadlift"] },
        { label: "Press", liftKeys: ["press"] },
        { label: "Squat", liftKeys: ["squat"] },
      ],
      [
        { label: "Bench Press", liftKeys: ["bench"] },
        { label: "Deadlift", liftKeys: ["deadlift"] },
        { label: "Press", liftKeys: ["press"] },
      ],
    ],
  },
};

function fives(...percentages: number[]): MainWorkSet[] {
  return percentages.map((tmPercentage) => ({ tmPercentage, reps: 5, isPrSet: false }));
}

/** 3/5/1 ordering, all fives — the chapter's own worked example. */
export const BBB_MAIN_WORK_3_5_1: MainWorkSet[][] = [fives(0.7, 0.8, 0.9), fives(0.65, 0.75, 0.85), fives(0.75, 0.85, 0.95)];

/** Classic ordering, all fives, no PR set. */
export const BBB_MAIN_WORK_CLASSIC: MainWorkSet[][] = [fives(0.65, 0.75, 0.85), fives(0.7, 0.8, 0.9), fives(0.75, 0.85, 0.95)];

/** The canonical 5/3/1 sets and reps, PR set on the final set — identical
 * to original-531's table. */
export const BBB_MAIN_WORK_PR_SET: MainWorkSet[][] = [
  [
    { tmPercentage: 0.65, reps: 5, isPrSet: false },
    { tmPercentage: 0.75, reps: 5, isPrSet: false },
    { tmPercentage: 0.85, reps: 5, isPrSet: true },
  ],
  [
    { tmPercentage: 0.7, reps: 3, isPrSet: false },
    { tmPercentage: 0.8, reps: 3, isPrSet: false },
    { tmPercentage: 0.9, reps: 3, isPrSet: true },
  ],
  [
    { tmPercentage: 0.75, reps: 5, isPrSet: false },
    { tmPercentage: 0.85, reps: 3, isPrSet: false },
    { tmPercentage: 0.95, reps: 1, isPrSet: true },
  ],
];

export const BBB_ASSISTANCE: AssistanceTarget[] = [
  {
    category: "push",
    exerciseOptions: ["Triceps pushdown", "Triceps extension"],
    totalReps: { min: 25, max: 50 },
  },
  {
    category: "pull",
    exerciseOptions: ["Row", "Lat pulldown"],
    totalReps: { min: 25, max: 50 },
  },
  {
    category: "single-leg-core",
    exerciseOptions: ["Ab wheel", "Hanging leg raise"],
    totalReps: { min: 0, max: 50 },
  },
];

export const BBB_JUMPS_OR_THROWS: JumpsOrThrows = {
  totalReps: { min: 10, max: 10 },
  guidance: "Low-stress: box jumps, medicine ball throws. Not a good time to introduce bounding.",
};

export const BBB_CONDITIONING: Conditioning = {
  sessionsPerWeek: 5,
  guidance: "Up to 2 hard days; 3-5 easy days for recovery.",
};
