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
  // The book supports 3 or 4 days, but the 3-day schedule is an alternating,
  // week-index-dependent rotation that SessionShape can't express yet — a
  // known gap (docs/ARCHITECTURE.md §8: "lifts whose day position depends on
  // the week index (3-day BBB's rotation)"). Scoped to 4 until that lands.
  supportedDayCounts: [4],
  tmPercentage: { kind: "range", min: 0.85, max: 0.9, default: 0.85 },

  sessionShape: [
    { label: "Squat", liftKeys: ["squat"] },
    { label: "Bench Press", liftKeys: ["bench"] },
    { label: "Deadlift", liftKeys: ["deadlift"] },
    { label: "Press", liftKeys: ["press"] },
  ],

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
  // supplementalPercentageByLift, e.g. to run squat/deadlift lower. The
  // alternate set schemes (3x10, 1x10 ascending) and the opposite-lift
  // option are documented but not wired into the generator yet.
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
