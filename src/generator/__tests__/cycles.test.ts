import { describe, expect, it } from "vitest";
import { generatePlan } from "../cycles";
import { beginnerTemplate } from "../templates/beginner";
import type { Lift, PlannedSet, ProgrammingModel, Template } from "../types";

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

// Lift-level fallback defaults from docs/PRD.md §1.9: +10 squat/deadlift,
// +5 bench/press. Deliberately different from Beginner's +5 squat/deadlift
// override, so a cycle-2+ test can tell whether cycles.ts actually applied
// the template's incrementOverrides or silently fell back to these instead.
const FALLBACK_INCREMENTS = { squat: 10, bench: 5, deadlift: 10, press: 5 } as const;

const lifts: Lift[] = (Object.keys(SEEDS) as (keyof typeof SEEDS)[]).map((liftKey) => ({
  liftKey,
  role: "main",
  trainingMaxSeedLb: SEEDS[liftKey],
  tmPercentageOverride: liftKey === WEAK_LIFT ? 0.85 : null,
  incrementLb: FALLBACK_INCREMENTS[liftKey],
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

describe("generatePlan (Beginner, cycle 2 — incrementOverrides)", () => {
  // A single standalone phase with 2 cycles is a legal input even though
  // the app never actually offers Beginner this way (it's always 1 cycle,
  // repeated by regenerating) — it's the only way to exercise cycle-2+ TM
  // progression without needing the not-yet-implemented multi-phase path.
  const plan = generatePlan({
    lifts,
    programmingModel: { id: "beginner", phases: [{ role: "standalone", cycles: 2 }] },
    tmPercentage: 0.9,
    templatesByRole: { standalone: beginnerTemplate },
    trainingDays: 3,
  });

  it("applies the template's +5 squat/deadlift override, not each lift's own +10 fallback", () => {
    const cycle2FirstSession = plan.cycles[1].weeks[0];
    expect(cycle2FirstSession.kind).toBe("main");

    const squatMains = cycle2FirstSession.sets.filter((s) => s.liftKey === "squat" && s.role === "main");
    // Seed 300 + 1 x override increment (5) = 305 TM. The buggy +10 fallback
    // would give a 310 TM instead, producing [215, 250, 280] here.
    expect(squatMains.map((s) => s.weightLb)).toEqual([215, 245, 275]);

    const deadliftMainWeights = plan.cycles[1].weeks[1].sets
      .filter((s) => s.liftKey === "deadlift" && s.role === "main")
      .map((s) => s.weightLb);
    // Seed 350 + 1 x override increment (5) = 355 TM. The buggy +10 fallback
    // would give a 360 TM instead, producing [250, 290, 325] here.
    expect(deadliftMainWeights).toEqual([250, 285, 320]);
  });

  it("keeps bench/press on their unaffected fallback increment (override coincides with default)", () => {
    const cycle2FirstSession = plan.cycles[1].weeks[0];
    expect(cycle2FirstSession.kind).toBe("main");
    const benchMains = cycle2FirstSession.sets
      .filter((s) => s.liftKey === "bench" && s.role === "main")
      .map((s) => s.weightLb);
    // Seed 200 + 1 x 5 (bench has no override, and its fallback is already
    // +5) = 205 TM.
    expect(benchMains).toEqual([145, 165, 185]);
  });
});

describe("generatePlan (Beginner, weak-lift classification by proximity)", () => {
  // A 0.87 override isn't the book's exact 85% assignment, but it's still
  // meant to signal "weaker lift" - closer to the range's 0.85 end than its
  // 0.9 end. An exact-equality check against 0.85 would miss this and
  // silently fall back to First Set Last.
  const liftsWithNearWeakPress: Lift[] = lifts.map((lift) => (lift.liftKey === "press" ? { ...lift, tmPercentageOverride: 0.87 } : lift));

  const plan = generatePlan({
    lifts: liftsWithNearWeakPress,
    programmingModel: beginnerProgrammingModel,
    tmPercentage: 0.9,
    templatesByRole: { standalone: beginnerTemplate },
    trainingDays: 3,
  });

  it("still applies Second Set Last for an override that isn't bit-identical to 0.85", () => {
    // Workout B (deadlift + press), step 1, is plan.cycles[0].weeks[1].
    const pressSupplemental = plan.cycles[0].weeks[1].sets.filter((s) => s.liftKey === "press" && s.role === "supplemental");
    // SSL -> step 1's second main set, 80% of a 150 lb seed = 120. FSL
    // (the bug) would instead use the first main set, 70% = 105.
    expect(pressSupplemental).toHaveLength(5);
    expect(pressSupplemental[0].tmPercentage).toBe(0.8);
    expect(pressSupplemental[0].weightLb).toBe(120);
  });
});

// A minimal synthetic template — not Beginner, which always has 3 main sets
// per progression step and only ever schedules main-role lifts — used to
// exercise two guards no shipped template currently reaches.
const singleSetTemplate: Template = {
  id: "test-single-set",
  name: "Test Single Set",
  roleEligibility: "neither",
  compatibleAnchors: [],
  supportedDayCounts: [2],
  tmPercentage: { kind: "fixed", value: 0.9 },
  sessionShape: { 2: { workouts: [{ id: "a", liftKeys: ["squat"] }] } },
  mainWork: [[{ tmPercentage: 0.7, reps: 1 }], [{ tmPercentage: 0.7, reps: 1 }], [{ tmPercentage: 0.7, reps: 1 }]],
  supplemental: { sets: 1, reps: 1, source: { kind: "second-set-last" } },
  assistance: "n/a",
  jumpsAndThrows: { min: 0, max: 0 },
};

describe("generatePlan (defensive guards)", () => {
  it("throws a clear error instead of crashing when a supplemental source needs more main sets than a template declares", () => {
    const lifts: Lift[] = [{ liftKey: "squat", role: "main", trainingMaxSeedLb: 300, tmPercentageOverride: null, incrementLb: 10 }];

    expect(() =>
      generatePlan({
        lifts,
        programmingModel: { id: "beginner", phases: [{ role: "standalone", cycles: 1 }] },
        tmPercentage: 0.9,
        templatesByRole: { standalone: singleSetTemplate },
        trainingDays: 2,
      }),
    ).toThrow(/needs at least 2 main work set/);
  });

  it("throws a clear error rather than silently scheduling a supplemental-role lift as main work", () => {
    const lifts: Lift[] = [{ liftKey: "squat", role: "supplemental", trainingMaxSeedLb: 300, tmPercentageOverride: null, incrementLb: 10 }];
    const template: Template = {
      ...singleSetTemplate,
      supplemental: { sets: 1, reps: 1, source: { kind: "flat-percentage", tmPercentage: 0.5 } },
    };

    expect(() =>
      generatePlan({
        lifts,
        programmingModel: { id: "beginner", phases: [{ role: "standalone", cycles: 1 }] },
        tmPercentage: 0.9,
        templatesByRole: { standalone: template },
        trainingDays: 2,
      }),
    ).toThrow(/is stored with role "supplemental"/);
  });
});
