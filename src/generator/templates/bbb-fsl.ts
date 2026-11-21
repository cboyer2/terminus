// Boring But Big, FSL — 5x10 supplemental at each week's first work set.
// See docs/templates/boring-but-big.md "bbb-fsl".
//
// Its own template, not an option on bbb-original, because the TM
// percentage differs: fixed at 85%, where the family permits 90%.

import type { Template } from "../types";
import {
  BBB_ASSISTANCE,
  BBB_COMPATIBLE_ANCHOR_IDS,
  BBB_CONDITIONING,
  BBB_JUMPS_OR_THROWS,
  BBB_MAIN_WORK_3_5_1,
  BBB_MAIN_WORK_CLASSIC,
  BBB_SESSION_SHAPE,
  BBB_SUPPORTED_DAY_COUNTS,
} from "./bbb-family";

export const bbbFslTemplate: Template = {
  id: "bbb-fsl",
  name: "Boring But Big, FSL",
  roleEligibility: "leader",
  compatibleAnchorIds: BBB_COMPATIBLE_ANCHOR_IDS,
  supportedDayCounts: BBB_SUPPORTED_DAY_COUNTS,
  tmPercentage: { kind: "fixed", value: 0.85 },

  sessionShape: BBB_SESSION_SHAPE,

  // The printed table is the classic ordering (65/75/85 first). The spec
  // notes the book allows 3/5/1 programming here too. No PR-set base: not
  // offered in this template's section.
  mainWorkScheme: {
    defaultMainWorkBase: "classic",
    byMainWorkBase: {
      classic: BBB_MAIN_WORK_CLASSIC,
      "3/5/1": BBB_MAIN_WORK_3_5_1,
    },
  },

  // Same lift as the main work; no per-lift percentage — the percentage is
  // the week's own first set.
  supplemental: { sets: 5, reps: 10, source: "firstSetLast" },

  assistance: BBB_ASSISTANCE,
  jumpsOrThrows: BBB_JUMPS_OR_THROWS,
  conditioning: BBB_CONDITIONING,
  warmup: [],
};
