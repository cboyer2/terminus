// Slightly Less Boring But Big, two lifts — the variation that follows the
// mixed one in the Slightly Less BBB section: squat 5x10 on both the squat
// and deadlift days, and bench OR press 5x10 on both pressing days. Never
// deadlift supplemental on squat day ("Just not a good thing for recovery
// purposes").
//
// Its own template for the same reason as bbb-mixed: printed only as a
// four-day week.

import type { LiftSupplemental, Template } from "../types";
import {
  BBB_ASSISTANCE,
  BBB_COMPATIBLE_ANCHOR_IDS,
  BBB_CONDITIONING,
  BBB_JUMPS_OR_THROWS,
  BBB_MAIN_WORK_3_5_1,
  BBB_MAIN_WORK_CLASSIC,
  BBB_SLIGHTLY_LESS_FOUR_DAY_SHAPE,
} from "./bbb-family";

// 40-60%, per day via program.options.supplementalPercentageByLift (keyed
// by the day's main lift) — the book allows the same percentage every day
// or a lighter one on one of the two days.
const BBB = { sets: 5, reps: 10, source: "percentageOfTrainingMax", percentageOfTrainingMax: 0.5 } as const;
const own: LiftSupplemental = { prescription: BBB };
const squat: LiftSupplemental = { prescription: BBB, fromLiftKey: "squat" };
const bench: LiftSupplemental = { prescription: BBB, fromLiftKey: "bench" };
const press: LiftSupplemental = { prescription: BBB, fromLiftKey: "press" };

export const bbbTwoLiftTemplate: Template = {
  id: "bbb-two-lift",
  name: "Slightly Less BBB, Two Lifts",
  roleEligibility: "leader",
  compatibleAnchorIds: BBB_COMPATIBLE_ANCHOR_IDS,
  supportedDayCounts: [4],
  tmPercentage: { kind: "range", min: 0.85, max: 0.9, default: 0.85 },

  sessionShape: BBB_SLIGHTLY_LESS_FOUR_DAY_SHAPE,

  mainWorkScheme: {
    defaultMainWorkBase: "classic",
    byMainWorkBase: {
      classic: BBB_MAIN_WORK_CLASSIC,
      "3/5/1": BBB_MAIN_WORK_3_5_1,
    },
  },

  supplemental: {
    defaultSupplementalScheme: "squatBench",
    bySupplementalScheme: {
      squatBench: {
        label: "Squat on squat + deadlift days, bench on both pressing days",
        byLift: { squat: own, deadlift: squat, bench: own, press: bench },
      },
      squatPress: {
        label: "Squat on squat + deadlift days, press on both pressing days",
        byLift: { squat: own, deadlift: squat, bench: press, press: own },
      },
    },
  },

  assistance: BBB_ASSISTANCE,
  jumpsOrThrows: BBB_JUMPS_OR_THROWS,
  conditioning: BBB_CONDITIONING,
  warmup: [],
};
