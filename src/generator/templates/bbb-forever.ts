// Forever BBB — 5x10 supplemental at a percentage that changes week to
// week. See docs/templates/boring-but-big.md "bbb-forever".
//
// Standard and conservative are two printed tables, but they differ in no
// setup-constraint field, so they're one template with a scheme option. Set
// count (5x10, or 3x10 — the book's "Forever BBB Light") is the other knob;
// the four combinations are offered as named schemes.

import type { SupplementalPrescription, Template } from "../types";
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

const STANDARD = [0.6, 0.5, 0.7];
const CONSERVATIVE = [0.5, 0.4, 0.6];

function byStep(sets: number, percentagesByStep: number[]): SupplementalPrescription {
  return { sets, reps: 10, source: "percentageOfTrainingMaxByStep", percentagesByStep };
}

export const bbbForeverTemplate: Template = {
  id: "bbb-forever",
  name: "Forever Boring But Big",
  roleEligibility: "leader",
  compatibleAnchorIds: BBB_COMPATIBLE_ANCHOR_IDS,
  supportedDayCounts: BBB_SUPPORTED_DAY_COUNTS,
  tmPercentage: { kind: "range", min: 0.85, max: 0.9, default: 0.85 },

  sessionShape: BBB_SESSION_SHAPE,

  // The examples are printed with 3/5/1 ordering; the book says to use the
  // original 5/3/1 ordering instead if it suits you better. The
  // supplemental percentages stay tied to the progression step either way,
  // the same pairing the book prints for SLFBBB with the classic order.
  mainWorkScheme: {
    defaultMainWorkBase: "3/5/1",
    byMainWorkBase: {
      "3/5/1": BBB_MAIN_WORK_3_5_1,
      classic: BBB_MAIN_WORK_CLASSIC,
    },
  },

  // Supplemental must use the same lift as the main work — no opposite
  // option here.
  supplemental: {
    defaultSupplementalScheme: "standard",
    bySupplementalScheme: {
      standard: { label: "5×10, standard (60/50/70%)", prescription: byStep(5, STANDARD) },
      conservative: { label: "5×10, conservative (50/40/60%)", prescription: byStep(5, CONSERVATIVE) },
      lightStandard: { label: "3×10 Light, standard (60/50/70%)", prescription: byStep(3, STANDARD) },
      lightConservative: { label: "3×10 Light, conservative (50/40/60%)", prescription: byStep(3, CONSERVATIVE) },
    },
  },

  assistance: BBB_ASSISTANCE,
  jumpsOrThrows: BBB_JUMPS_OR_THROWS,
  conditioning: BBB_CONDITIONING,
  warmup: [],
};
