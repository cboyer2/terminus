// Original Boring But Big. See docs/templates/boring-but-big.md — the
// hand-verification reference for every field below, including the
// main-work-base option and which chapter alternatives stay deferred.

import type { Template } from "../types";

export const bbbOriginalTemplate: Template = {
  id: "bbb-original",
  name: "Original Boring But Big",
  roleEligibility: "leader",
  // Only "Original 5/3/1" (original-531) has an assigned template id today.
  // The book names eight more compatible anchors — see boring-but-big.md
  // "Compatible anchors" — that don't exist as records yet; adding them
  // here would fabricate ids ahead of the templates they'd point to.
  compatibleAnchorIds: ["original-531"],
  supportedDayCounts: [4, 3],
  tmPercentage: { kind: "range", min: 0.85, max: 0.9, default: 0.85 },

  sessionShape: {
    4: {
      workouts: [
        { label: "Squat", liftKeys: ["squat"] },
        { label: "Bench Press", liftKeys: ["bench"] },
        { label: "Deadlift", liftKeys: ["deadlift"] },
        { label: "Press", liftKeys: ["press"] },
      ],
    },
    // The 3-day schedule is a 4-calendar-week rotation, not 3 — each lift
    // sits out exactly one week in four, per the owner (corrected from an
    // earlier, wrong 3-week reading of this doc). Every lift still gets
    // exactly 3 appearances — one per progression step — by the time the
    // rotation wraps; see cycles.ts's week-rotation branch of
    // buildMainCycleSessions for how a lift's own appearance count (not the
    // calendar week) picks its progression step.
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
  },

  // Three selectable bases, per docs/templates/boring-but-big.md "Main
  // work" — none is role-keyed since this template is Leader-only.
  mainWorkScheme: {
    defaultMainWorkBase: "3/5/1",
    byMainWorkBase: {
      "3/5/1": [
        [
          { tmPercentage: 0.7, reps: 5, isPrSet: false },
          { tmPercentage: 0.8, reps: 5, isPrSet: false },
          { tmPercentage: 0.9, reps: 5, isPrSet: false },
        ],
        [
          { tmPercentage: 0.65, reps: 5, isPrSet: false },
          { tmPercentage: 0.75, reps: 5, isPrSet: false },
          { tmPercentage: 0.85, reps: 5, isPrSet: false },
        ],
        [
          { tmPercentage: 0.75, reps: 5, isPrSet: false },
          { tmPercentage: 0.85, reps: 5, isPrSet: false },
          { tmPercentage: 0.95, reps: 5, isPrSet: false },
        ],
      ],
      classic: [
        [
          { tmPercentage: 0.65, reps: 5, isPrSet: false },
          { tmPercentage: 0.75, reps: 5, isPrSet: false },
          { tmPercentage: 0.85, reps: 5, isPrSet: false },
        ],
        [
          { tmPercentage: 0.7, reps: 5, isPrSet: false },
          { tmPercentage: 0.8, reps: 5, isPrSet: false },
          { tmPercentage: 0.9, reps: 5, isPrSet: false },
        ],
        [
          { tmPercentage: 0.75, reps: 5, isPrSet: false },
          { tmPercentage: 0.85, reps: 5, isPrSet: false },
          { tmPercentage: 0.95, reps: 5, isPrSet: false },
        ],
      ],
      // Identical to original-531's canonical table — PR set on the final
      // set of every week.
      prSet: [
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
      ],
    },
  },

  // 5x10 at a flat percentage of the training max, per lift — the default
  // (50%) is overridable per lift via program.options.
  // supplementalPercentageByLift, e.g. to run squat/deadlift lower. Which
  // lift's training max that percentage applies to is a single, program-wide
  // toggle — program.options.supplementalOppositeLift, resolved in
  // cycles.ts's supplementalBasisLiftKey — not per-lift, per the owner.
  // 3x10 and 1x10-ascending are NOT options on this template — checked
  // against the book, they belong to Slightly Less BBB (docs/templates/
  // boring-but-big.md), a separate deferred template.
  supplemental: { sets: 5, reps: 10, source: "percentageOfTrainingMax", percentageOfTrainingMax: 0.5 },

  assistance: [
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
  ],

  jumpsOrThrows: {
    totalReps: { min: 10, max: 10 },
    guidance: "Low-stress: box jumps, medicine ball throws. Not a good time to introduce bounding.",
  },

  conditioning: {
    sessionsPerWeek: 5,
    guidance: "Up to 2 hard days; 3-5 easy days for recovery.",
  },

  // No specific circuit is printed for this template beyond generic
  // warm-up/mobility, unlike Beginner's.
  warmup: [],
};
