// Slightly Less Boring But Big — 3 supplemental sets instead of 5. See
// docs/templates/boring-but-big.md "bbb-slightly-less".
//
// Its own named section in the book, kept as its own record even though its
// mechanics overlap with Original and Forever BBB.

import type { Template } from "../types";
import {
  BBB_ASSISTANCE,
  BBB_COMPATIBLE_ANCHOR_IDS,
  BBB_CONDITIONING,
  BBB_JUMPS_OR_THROWS,
  BBB_MAIN_WORK_CLASSIC,
  BBB_SESSION_SHAPE,
  BBB_SUPPORTED_DAY_COUNTS,
} from "./bbb-family";

export const bbbSlightlyLessTemplate: Template = {
  id: "bbb-slightly-less",
  name: "Slightly Less Boring But Big",
  roleEligibility: "leader",
  compatibleAnchorIds: BBB_COMPATIBLE_ANCHOR_IDS,
  supportedDayCounts: BBB_SUPPORTED_DAY_COUNTS,
  tmPercentage: { kind: "range", min: 0.85, max: 0.9, default: 0.85 },

  sessionShape: BBB_SESSION_SHAPE,

  // Only the classic ordering appears in this section's worked examples;
  // the spec says to scope the base option to what's confirmed.
  mainWorkScheme: BBB_MAIN_WORK_CLASSIC,

  supplemental: {
    defaultSupplementalScheme: "constant",
    bySupplementalScheme: {
      // Per-lift percentage via program.options.supplementalPercentageByLift,
      // same as Original BBB.
      constant: {
        label: "3×10 at a constant %",
        prescription: { sets: 3, reps: 10, source: "percentageOfTrainingMax", percentageOfTrainingMax: 0.5 },
      },
      slfbbb: {
        label: "3×10 SLFBBB (60/50/70%)",
        prescription: { sets: 3, reps: 10, source: "percentageOfTrainingMaxByStep", percentagesByStep: [0.6, 0.5, 0.7] },
      },
      ascending: {
        label: "1×10 ascending (50/60/70%)",
        prescription: { reps: 10, source: "percentageOfTrainingMaxPerSet", percentagesPerSet: [0.5, 0.6, 0.7] },
      },
      descending: {
        label: "1×10 descending (70/60/50%)",
        prescription: { reps: 10, source: "percentageOfTrainingMaxPerSet", percentagesPerSet: [0.7, 0.6, 0.5] },
      },
    },
  },

  assistance: BBB_ASSISTANCE,
  jumpsOrThrows: BBB_JUMPS_OR_THROWS,
  conditioning: BBB_CONDITIONING,
  warmup: [],
};
