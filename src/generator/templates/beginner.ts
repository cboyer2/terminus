import type { Template } from "../types";

// Source: 5/3/1 Forever, Beginner Prep School chapter. Paraphrased for
// personal use — see docs/templates/beginner.md, the hand-verification
// reference this record and its fixture are checked against.
export const beginnerTemplate: Template = {
  id: "beginner",
  name: "Beginner Prep School",

  roleEligibility: "neither",
  compatibleAnchors: [],
  supportedDayCounts: [3],
  tmPercentage: { kind: "range", min: 0.85, max: 0.9 },

  sessionShape: {
    3: {
      workouts: [
        { id: "a", liftKeys: ["squat", "bench"] },
        { id: "b", liftKeys: ["deadlift", "press"] },
      ],
    },
  },

  // All fives (5's PRO) in 3/5/1 week ordering — week one opens at 70%, not
  // 65%. No AMRAP/PR sets. Identical for every lift and both workouts.
  mainWork: [
    [
      { tmPercentage: 0.7, reps: 5 },
      { tmPercentage: 0.8, reps: 5 },
      { tmPercentage: 0.9, reps: 5 },
    ],
    [
      { tmPercentage: 0.65, reps: 5 },
      { tmPercentage: 0.75, reps: 5 },
      { tmPercentage: 0.85, reps: 5 },
    ],
    [
      { tmPercentage: 0.75, reps: 5 },
      { tmPercentage: 0.85, reps: 5 },
      { tmPercentage: 0.95, reps: 5 },
    ],
  ],

  // First Set Last: 5x5 at that week's own first main-work percentage.
  // Lifts assigned the weaker (85%) end of the TM range use Second Set Last
  // instead — a per-lift exception this template-wide field can't express.
  // cycles.ts must apply it when it resolves each lift's effective
  // percentage; see docs/templates/beginner.md's supplemental section.
  supplemental: {
    sets: 5,
    reps: 5,
    source: { kind: "first-set-last" },
  },

  // Beginner's assistance section is four exercise slots, not one rep range
  // per category (two of the four both land under single-leg/core) — see
  // the AssistanceContent free-text fallback in types.ts.
  assistance:
    "Four exercises per workout, 3-5 sets each, run as a circuit five times " +
    "through (target 20 minutes): a kettlebell swing/snatch or squat " +
    "variant for 25-100 reps (single-leg work may substitute at 5-10 reps), " +
    "push-ups or dips for 25-100 reps, chin-ups or pull-ups (inverted rows " +
    "if unable) for 25-50 reps, and ab-wheel rollouts or hanging leg raises " +
    "for 25-50 reps.",

  jumpsAndThrows: { min: 10, max: 20 },

  warmUp:
    "A bodyweight circuit before every session, three times through: " +
    "jumping jacks (3x25), bodyweight squats (3x10), and mountain climbers " +
    "(3x10 per leg).",

  conditioning:
    "Run three times a week, one to three miles total, or substitute a " +
    "single track session: 10-16x100m, 6-8x200m, 4-6x400m, or 2-3x800m. " +
    "Prowler or sled work substitutes for lifters who can't squat well.",
};
