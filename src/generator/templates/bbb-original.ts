// Original Boring But Big. See docs/templates/boring-but-big.md — the
// hand-verification reference for every field below, including the
// main-work-base option and which chapter alternatives stay deferred.

import type { Template } from "../types";
import {
  BBB_ASSISTANCE,
  BBB_COMPATIBLE_ANCHOR_IDS,
  BBB_CONDITIONING,
  BBB_JUMPS_OR_THROWS,
  BBB_MAIN_WORK_3_5_1,
  BBB_MAIN_WORK_CLASSIC,
  BBB_MAIN_WORK_PR_SET,
  BBB_SESSION_SHAPE,
  BBB_SUPPORTED_DAY_COUNTS,
} from "./bbb-family";

export const bbbOriginalTemplate: Template = {
  id: "bbb-original",
  name: "Original Boring But Big",
  roleEligibility: "leader",
  compatibleAnchorIds: BBB_COMPATIBLE_ANCHOR_IDS,
  supportedDayCounts: BBB_SUPPORTED_DAY_COUNTS,
  tmPercentage: { kind: "range", min: 0.85, max: 0.9, default: 0.85 },
  // Original is the one BBB variation that permits the opposite lift —
  // bench main, press supplemental.
  allowsOppositeSupplementalLift: true,

  sessionShape: BBB_SESSION_SHAPE,

  // Three selectable bases, per docs/templates/boring-but-big.md "Main
  // work" — none is role-keyed since this template is Leader-only.
  mainWorkScheme: {
    defaultMainWorkBase: "3/5/1",
    byMainWorkBase: {
      "3/5/1": BBB_MAIN_WORK_3_5_1,
      classic: BBB_MAIN_WORK_CLASSIC,
      prSet: BBB_MAIN_WORK_PR_SET,
    },
  },

  // 5x10 at a flat percentage of the training max, per lift — the default
  // (50%) is overridable per lift via program.options.
  // supplementalPercentageByLift, e.g. to run squat/deadlift lower. 3x10 and
  // 1x10-ascending belong to Slightly Less BBB, not here.
  supplemental: { sets: 5, reps: 10, source: "percentageOfTrainingMax", percentageOfTrainingMax: 0.5 },

  assistance: BBB_ASSISTANCE,
  jumpsOrThrows: BBB_JUMPS_OR_THROWS,
  conditioning: BBB_CONDITIONING,

  // No specific circuit is printed for this template beyond generic
  // warm-up/mobility, unlike Beginner's.
  warmup: [],
};
