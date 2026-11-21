// Slightly Less Boring But Big, mixed — BBB 5x10 on one pressing lift and
// one of squat/deadlift, 5x5 First Set Last on the other two. A four-day
// variation printed in the Slightly Less BBB section.
//
// Its own template because it's printed only as a four-day week (a
// different supportedDayCounts from Slightly Less BBB), and its supplemental
// scheme differs by lift.

import type { LiftKey, LiftSupplemental, SupplementalSchemeChoice, Template } from "../types";
import {
  BBB_ASSISTANCE,
  BBB_COMPATIBLE_ANCHOR_IDS,
  BBB_CONDITIONING,
  BBB_JUMPS_OR_THROWS,
  BBB_MAIN_WORK_3_5_1,
  BBB_MAIN_WORK_CLASSIC,
  BBB_SLIGHTLY_LESS_FOUR_DAY_SHAPE,
} from "./bbb-family";

// 40-60%, per lift via program.options.supplementalPercentageByLift.
const BBB: LiftSupplemental = { prescription: { sets: 5, reps: 10, source: "percentageOfTrainingMax", percentageOfTrainingMax: 0.5 } };
const FSL: LiftSupplemental = { prescription: { sets: 5, reps: 5, source: "firstSetLast" } };

function layout(lower: "squat" | "deadlift", pressing: "bench" | "press", label: string): SupplementalSchemeChoice {
  const byLift = {} as Record<LiftKey, LiftSupplemental>;
  for (const liftKey of ["squat", "deadlift", "bench", "press"] as const) {
    byLift[liftKey] = liftKey === lower || liftKey === pressing ? BBB : FSL;
  }
  return { label, byLift };
}

export const bbbMixedTemplate: Template = {
  id: "bbb-mixed",
  name: "Slightly Less BBB, Mixed",
  roleEligibility: "leader",
  compatibleAnchorIds: BBB_COMPATIBLE_ANCHOR_IDS,
  supportedDayCounts: [4],
  tmPercentage: { kind: "range", min: 0.85, max: 0.9, default: 0.85 },

  sessionShape: BBB_SLIGHTLY_LESS_FOUR_DAY_SHAPE,

  // 5's PRO; ordering follows Slightly Less BBB (classic default, 3/5/1).
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
      squatBench: layout("squat", "bench", "BBB squat + bench, FSL deadlift + press"),
      squatPress: layout("squat", "press", "BBB squat + press, FSL deadlift + bench"),
      deadliftBench: layout("deadlift", "bench", "BBB deadlift + bench, FSL squat + press"),
      deadliftPress: layout("deadlift", "press", "BBB deadlift + press, FSL squat + bench"),
    },
  },

  assistance: BBB_ASSISTANCE,
  jumpsOrThrows: BBB_JUMPS_OR_THROWS,
  conditioning: BBB_CONDITIONING,
  warmup: [],
};
