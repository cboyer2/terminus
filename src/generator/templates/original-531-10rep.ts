// 5/3/1 Original with 10s on the first set. See docs/templates/original-531.md
// "original-531-10rep" — the hand-verification reference for every field
// below.

import type { Template } from "../types";

export const original53110RepTemplate: Template = {
  id: "original-531-10rep",
  name: "Original 5/3/1 — 10-Rep Sets",
  // Leader only — the book has this template feed into original-531 as its
  // Anchor, not itself (docs/templates/original-531.md "Templates in this
  // family").
  roleEligibility: "leader",
  compatibleAnchorIds: ["original-531"],
  supportedDayCounts: [4],
  tmPercentage: { kind: "range", min: 0.8, max: 0.9, default: 0.9 },
  // original-531 as Anchor uses 50-100 reps here, not its own 50-75
  // default — confirmed by the owner. See Template.anchorAssistanceFollowsLeader.
  anchorAssistanceFollowsLeader: true,

  // Same 4-day, one-lift-per-session shape as original-531.
  sessionShape: {
    4: {
      workouts: [
        { label: "Squat", liftKeys: ["squat"] },
        { label: "Bench Press", liftKeys: ["bench"] },
        { label: "Deadlift", liftKeys: ["deadlift"] },
        { label: "Press", liftKeys: ["press"] },
      ],
    },
  },

  // Same week ordering and PR-set placement as original-531; only the first
  // set's rep count differs (10 instead of 5).
  mainWorkScheme: [
    [
      { tmPercentage: 0.65, reps: 10, isPrSet: false },
      { tmPercentage: 0.75, reps: 5, isPrSet: false },
      { tmPercentage: 0.85, reps: 5, isPrSet: true },
    ],
    [
      { tmPercentage: 0.7, reps: 10, isPrSet: false },
      { tmPercentage: 0.8, reps: 5, isPrSet: false },
      { tmPercentage: 0.9, reps: 3, isPrSet: true },
    ],
    [
      { tmPercentage: 0.75, reps: 10, isPrSet: false },
      { tmPercentage: 0.85, reps: 5, isPrSet: false },
      { tmPercentage: 0.95, reps: 1, isPrSet: true },
    ],
  ],

  supplemental: "none",

  // Flat 50-100 reps per category, unchanged across cycles — not role-keyed
  // (this template is only ever run as a Leader).
  assistance: [
    { category: "push", exerciseOptions: ["Dip", "Push-up", "Overhead triceps extension"], totalReps: { min: 50, max: 100 } },
    { category: "pull", exerciseOptions: ["Row", "Chin-up"], totalReps: { min: 50, max: 100 } },
    { category: "single-leg-core", exerciseOptions: ["Ab wheel", "Hanging leg raise", "Lunge"], totalReps: { min: 50, max: 100 } },
  ],

  // Session shape and jumps match the canonical template.
  jumpsOrThrows: {
    totalReps: { min: 20, max: 20 },
    guidance: "One main lift per session — use the high end of the family's range.",
  },

  conditioning: {
    sessionsPerWeek: 4,
    guidance: "Up to 4 hard days, preferably on training days; off days for a recovery circuit. Restrict assistance volume if pushing conditioning hard.",
  },

  // No specific circuit is printed for this template.
  warmup: [],
};
