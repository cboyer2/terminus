// Beginner Prep School. See docs/templates/beginner.md — the hand-verification
// reference for every field below, including which chapter alternatives are
// options here rather than separate templates.

import type { Template } from "../types";

export const beginnerTemplate: Template = {
  id: "beginner",
  name: "Beginner",
  roleEligibility: "neither",
  compatibleAnchorIds: [],
  supportedDayCounts: [3],
  // No single plan-wide default in the book — it assigns 90% to the
  // stronger lifts and 85% to weaker ones, per lift. 90% is the more common
  // case and the value already used by this project's fixtures, so it's the
  // default a lift falls back to before any per-lift override.
  tmPercentage: { kind: "range", min: 0.85, max: 0.9, default: 0.9 },

  // Workout A / B alternate continuously across 3 sessions/week. Each
  // completes its own three-step progression over six sessions spanning two
  // calendar weeks, not three — see beginner.md "Resolved".
  sessionShape: [
    { label: "Workout A", liftKeys: ["squat", "bench"] },
    { label: "Workout B", liftKeys: ["deadlift", "press"] },
  ],

  // 3/5/1 week ordering, all fives, no PR set.
  mainWorkScheme: [
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

  // Second Set Last for lifts running the template's lower (85%) training
  // max, First Set Last for the higher (90%) one — beginner.md "Options".
  supplemental: {
    atLowerTmPercentage: { sets: 5, reps: 5, source: "secondSetLast" },
    atHigherTmPercentage: { sets: 5, reps: 5, source: "firstSetLast" },
  },

  assistance: [
    {
      category: "squat/hip-hinge",
      exerciseOptions: ["Kettlebell swing or snatch", "Dumbbell or bodyweight squat"],
      totalReps: { min: 25, max: 100 },
    },
    {
      category: "push",
      exerciseOptions: ["Push-up", "Dip"],
      totalReps: { min: 25, max: 100 },
    },
    {
      category: "pull",
      exerciseOptions: ["Chin-up", "Pull-up", "Inverted row"],
      totalReps: { min: 25, max: 50 },
    },
    {
      category: "core",
      exerciseOptions: ["Ab wheel", "Hanging leg raise"],
      totalReps: { min: 25, max: 50 },
    },
  ],

  jumpsOrThrows: {
    totalReps: { min: 10, max: 20 },
    guidance: "Box jumps or standing long jumps; total-body emphasis and a strong landing. Not depth jumps.",
  },

  conditioning: {
    sessionsPerWeek: 3,
    guidance: "1-3 miles or a track-interval session; Prowler/sled substitutes for lifters who can't squat well.",
  },

  warmup: [
    { name: "Jumping jacks", sets: 3, reps: "25" },
    { name: "Bodyweight squat", sets: 3, reps: "10" },
    { name: "Mountain climbers", sets: 3, reps: "10 per leg" },
  ],
};
