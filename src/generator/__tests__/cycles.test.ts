import { describe, expect, it } from "vitest";
import { generatePlan } from "../cycles";
import { beginnerTemplate } from "../templates/beginner";
import type { Lift, PlannedSet, ProgrammingModel } from "../types";

// Independently hand-computed (not derived from cycles.ts — see the node
// script this was generated and cross-checked with) for four round-number
// seeds, so every value can be checked by hand against
// docs/templates/beginner.md's own percentage table. Bench is deliberately
// given the weak-lift 0.85 override, to exercise the Second Set Last branch;
// the other three stay on the plan default (First Set Last). Deadlift's
// numbers land on genuine .5 ties (227.5, 262.5, 297.5, 332.5) and on
// 350 * 0.7's floating-point noise (244.99999999999997), on purpose — this
// is the exact failure pattern two earlier rounding bugs were caught on.
const SEEDS = { squat: 300, bench: 200, deadlift: 350, press: 150 } as const;
const WEAK_LIFT = "bench";

const EXPECTED = {
  step1: {
    squat: { mains: [210, 240, 270], supPct: 0.7, supWeight: 210 },
    bench: { mains: [140, 160, 180], supPct: 0.8, supWeight: 160 },
    deadlift: { mains: [245, 280, 315], supPct: 0.7, supWeight: 245 },
    press: { mains: [105, 120, 135], supPct: 0.7, supWeight: 105 },
  },
  step2: {
    squat: { mains: [195, 225, 255], supPct: 0.65, supWeight: 195 },
    bench: { mains: [130, 150, 170], supPct: 0.75, supWeight: 150 },
    deadlift: { mains: [230, 265, 300], supPct: 0.65, supWeight: 230 },
    press: { mains: [100, 115, 130], supPct: 0.65, supWeight: 100 },
  },
  step3: {
    squat: { mains: [225, 255, 285], supPct: 0.75, supWeight: 225 },
    bench: { mains: [150, 170, 190], supPct: 0.85, supWeight: 170 },
    deadlift: { mains: [265, 300, 335], supPct: 0.75, supWeight: 265 },
    press: { mains: [115, 130, 145], supPct: 0.75, supWeight: 115 },
  },
} as const;

const MAIN_PERCENTAGES = {
  step1: [0.7, 0.8, 0.9],
  step2: [0.65, 0.75, 0.85],
  step3: [0.75, 0.85, 0.95],
} as const;

function expectedSets(step: keyof typeof EXPECTED, liftKeys: readonly (keyof typeof SEEDS)[]): PlannedSet[] {
  const sets: PlannedSet[] = [];
  for (const liftKey of liftKeys) {
    const { mains, supPct, supWeight } = EXPECTED[step][liftKey];
    const pcts = MAIN_PERCENTAGES[step];
    mains.forEach((weightLb, i) => {
      sets.push({ liftKey, role: "main", reps: 5, tmPercentage: pcts[i], weightLb, isAmrap: undefined });
    });
    for (let i = 0; i < 5; i++) {
      sets.push({ liftKey, role: "supplemental", reps: 5, tmPercentage: supPct, weightLb: supWeight });
    }
  }
  return sets;
}

const beginnerProgrammingModel: ProgrammingModel = {
  id: "beginner",
  phases: [{ role: "standalone", cycles: 1 }],
};

const lifts: Lift[] = (Object.keys(SEEDS) as (keyof typeof SEEDS)[]).map((liftKey) => ({
  liftKey,
  role: "main",
  trainingMaxSeedLb: SEEDS[liftKey],
  tmPercentageOverride: liftKey === WEAK_LIFT ? 0.85 : null,
  incrementLb: 5,
}));

describe("generatePlan (Beginner)", () => {
  const plan = generatePlan({
    lifts,
    programmingModel: beginnerProgrammingModel,
    tmPercentage: 0.9,
    templatesByRole: { standalone: beginnerTemplate },
    trainingDays: 3,
  });

  it("produces exactly one standalone cycle with no 7th-week structure", () => {
    expect(plan.cycles).toHaveLength(1);
    expect(plan.cycles[0].cycleNumber).toBe(1);
    expect(plan.cycles[0].role).toBe("standalone");
  });

  it("produces six sessions alternating Workout A and B, per docs/templates/beginner.md", () => {
    const weeks = plan.cycles[0].weeks;
    expect(weeks).toHaveLength(6);
    expect(weeks.map((w) => (w.kind === "main" ? w.progressionStep : undefined))).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it("matches the hand-computed weights for every session, in order", () => {
    const expectedWeeks = [
      expectedSets("step1", ["squat", "bench"]),
      expectedSets("step1", ["deadlift", "press"]),
      expectedSets("step2", ["squat", "bench"]),
      expectedSets("step2", ["deadlift", "press"]),
      expectedSets("step3", ["squat", "bench"]),
      expectedSets("step3", ["deadlift", "press"]),
    ];

    plan.cycles[0].weeks.forEach((week, i) => {
      expect(week.kind).toBe("main");
      expect(week.sets).toEqual(expectedWeeks[i]);
    });
  });
});
