// Boring But Big Challenge — three cycles of 5's Progression, no PR set,
// with the 5x10 supplemental rising by cycle: 50%, 60%, 70%. Runs only
// under the Challenge programming model (three standalone cycles, no
// Anchor).

import type { Template } from "../types";
import {
  BBB_ASSISTANCE,
  BBB_CONDITIONING,
  BBB_JUMPS_OR_THROWS,
  BBB_MAIN_WORK_3_5_1,
  BBB_MAIN_WORK_CLASSIC,
  BBB_SESSION_SHAPE,
  BBB_SUPPORTED_DAY_COUNTS,
} from "./bbb-family";

export const bbbChallengeTemplate: Template = {
  id: "bbb-challenge",
  name: "Boring But Big Challenge",
  roleEligibility: "neither",
  compatibleAnchorIds: [],
  supportedDayCounts: BBB_SUPPORTED_DAY_COUNTS,
  programmingModels: ["challenge"],
  // "90% TM is the maximum, 85% is best for those with several years of
  // consistent, proper training."
  tmPercentage: { kind: "range", min: 0.85, max: 0.9, default: 0.85 },

  sessionShape: BBB_SESSION_SHAPE,

  // "You can use the classic 5/3/1 or the 3/5/1 setup"; 3/5/1 is printed.
  mainWorkScheme: {
    defaultMainWorkBase: "3/5/1",
    byMainWorkBase: {
      "3/5/1": BBB_MAIN_WORK_3_5_1,
      classic: BBB_MAIN_WORK_CLASSIC,
    },
  },

  supplemental: { sets: 5, reps: 10, source: "percentageOfTrainingMaxByCycle", percentagesByCycle: [0.5, 0.6, 0.7] },

  assistance: BBB_ASSISTANCE,
  jumpsOrThrows: BBB_JUMPS_OR_THROWS,
  conditioning: BBB_CONDITIONING,
  warmup: [],
};
