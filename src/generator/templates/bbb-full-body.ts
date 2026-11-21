// Full Body Boring But Big — every session pairs one lift's main work with
// another lift's 5x10. Each lift gets main work once and supplemental once
// per rotation of the four workouts.
//
// Its own template because session shape is structural.

import type { Template, Workout } from "../types";
import {
  BBB_ASSISTANCE,
  BBB_COMPATIBLE_ANCHOR_IDS,
  BBB_CONDITIONING,
  BBB_JUMPS_OR_THROWS,
  BBB_MAIN_WORK_3_5_1,
  BBB_MAIN_WORK_CLASSIC,
  BBB_SUPPORTED_DAY_COUNTS,
} from "./bbb-family";

// The book lists the lower-body lift first in every workout.
const A: Workout = {
  label: "Deadlift / Bench supplemental",
  liftKeys: ["deadlift", "bench"],
  workByLift: { deadlift: "main", bench: "supplemental" },
};
const B: Workout = {
  label: "Squat supplemental / Press",
  liftKeys: ["squat", "press"],
  workByLift: { squat: "supplemental", press: "main" },
};
const C: Workout = {
  label: "Deadlift supplemental / Bench",
  liftKeys: ["deadlift", "bench"],
  workByLift: { deadlift: "supplemental", bench: "main" },
};
const D: Workout = {
  label: "Squat / Press supplemental",
  liftKeys: ["squat", "press"],
  workByLift: { squat: "main", press: "supplemental" },
};

export const bbbFullBodyTemplate: Template = {
  id: "bbb-full-body",
  name: "Full Body Boring But Big",
  roleEligibility: "leader",
  compatibleAnchorIds: BBB_COMPATIBLE_ANCHOR_IDS,
  supportedDayCounts: BBB_SUPPORTED_DAY_COUNTS,
  tmPercentage: { kind: "range", min: 0.85, max: 0.9, default: 0.85 },

  sessionShape: {
    // Mon / Tue / Thu / Fri — deadlift supplemental, the most taxing, ends
    // the week.
    4: { workouts: [A, B, D, C] },
    // A/B/C, D/A/B, C/D/A as printed; the fourth week (B/C/D) completes the
    // rotation so every workout runs three times — three main appearances
    // per lift.
    3: {
      weeks: [
        [A, B, C],
        [D, A, B],
        [C, D, A],
        [B, C, D],
      ],
    },
  },

  // 5's PRO. The section doesn't name an ordering; same choice as Original BBB.
  mainWorkScheme: {
    defaultMainWorkBase: "3/5/1",
    byMainWorkBase: {
      "3/5/1": BBB_MAIN_WORK_3_5_1,
      classic: BBB_MAIN_WORK_CLASSIC,
    },
  },

  // "I always start with 50%" — adjusted per lift if one is suffering.
  supplemental: { sets: 5, reps: 10, source: "percentageOfTrainingMax", percentageOfTrainingMax: 0.5 },

  assistance: BBB_ASSISTANCE,
  jumpsOrThrows: BBB_JUMPS_OR_THROWS,
  conditioning: BBB_CONDITIONING,
  warmup: [],
};
