import { describe, expect, it } from "vitest";

import { buildMainCycleSessions, generatePlan, liftsByKey } from "../cycles";
import { bbbForeverTemplate } from "../templates/bbb-forever";
import { bbbFslTemplate } from "../templates/bbb-fsl";
import { bbbSlightlyLessTemplate } from "../templates/bbb-slightly-less";
import type { Lift, LiftKey, Program, Session, Template } from "../types";

/**
 * Frozen fixtures for bbb-fsl, bbb-forever and bbb-slightly-less,
 * hand-checked against docs/templates/boring-but-big.md. Same seeds as the
 * bbb-original fixture — multiples of 100 so every percentage lands on an
 * exact 5 lb mark.
 */

const lifts: Lift[] = [
  { liftKey: "squat", role: "main", trainingMaxSeed: 400, tmPercentageOverride: null, increment: 10 },
  { liftKey: "bench", role: "main", trainingMaxSeed: 200, tmPercentageOverride: null, increment: 5 },
  { liftKey: "deadlift", role: "main", trainingMaxSeed: 500, tmPercentageOverride: null, increment: 10 },
  { liftKey: "press", role: "main", trainingMaxSeed: 300, tmPercentageOverride: null, increment: 5 },
];
const liftMap = liftsByKey(lifts);

function program(template: Template, options: Record<string, unknown> = {}, trainingDays: 3 | 4 = 4): Program {
  return {
    programmingModel: "2+1",
    leaderTrainingDays: trainingDays,
    anchorTrainingDays: 4,
    deloadTrainingDays: 4,
    tmTestTrainingDays: 4,
    leaderTemplateId: template.id,
    anchorTemplateId: "original-531",
    tmPercentage: 0.85,
    options,
  };
}

function runCycle(template: Template, options: Record<string, unknown> = {}, trainingDays: 3 | 4 = 4): Session[] {
  return buildMainCycleSessions(template, "leader", liftMap, program(template, options, trainingDays), 1, 0, 1).sessions;
}

/** [weight, reps] per supplemental set, one entry per progression step. */
function supplementalFor(sessions: Session[], liftKey: LiftKey): [number, number][][] {
  return sessions
    .flatMap((s) => s.lifts)
    .filter((entry) => entry.liftKey === liftKey)
    .map((entry) => entry.supplemental.map((set) => [set.workingWeight, set.reps as number]));
}

function mainWeightsFor(sessions: Session[], liftKey: LiftKey): number[][] {
  return sessions
    .flatMap((s) => s.lifts)
    .filter((entry) => entry.liftKey === liftKey)
    .map((entry) => entry.mainWork.map((set) => set.workingWeight));
}

const tens = (weight: number, sets: number): [number, number][] => Array.from({ length: sets }, () => [weight, 10]);

describe("bbb-fsl", () => {
  it("is Leader-only, 3 or 4 days, TM fixed at 85%", () => {
    expect(bbbFslTemplate.roleEligibility).toBe("leader");
    expect(bbbFslTemplate.supportedDayCounts).toEqual([4, 3]);
    expect(bbbFslTemplate.tmPercentage).toEqual({ kind: "fixed", value: 0.85 });
  });

  it("defaults to the classic ordering, all fives", () => {
    const sessions = runCycle(bbbFslTemplate);
    expect(sessions).toHaveLength(12);
    expect(mainWeightsFor(sessions, "squat")).toEqual([
      [260, 300, 340],
      [280, 320, 360],
      [300, 340, 380],
    ]);
    expect(sessions.flatMap((s) => s.lifts).every((e) => e.mainWork.every((set) => !set.isPrSet && set.reps === 5))).toBe(true);
  });

  it("supplemental is 5x10 at each week's first work set", () => {
    const sessions = runCycle(bbbFslTemplate);
    expect(supplementalFor(sessions, "squat")).toEqual([tens(260, 5), tens(280, 5), tens(300, 5)]);
    expect(supplementalFor(sessions, "bench")).toEqual([tens(130, 5), tens(140, 5), tens(150, 5)]);
    expect(supplementalFor(sessions, "deadlift")).toEqual([tens(325, 5), tens(350, 5), tens(375, 5)]);
    expect(supplementalFor(sessions, "press")).toEqual([tens(195, 5), tens(210, 5), tens(225, 5)]);
  });

  it("3/5/1 base moves the supplemental with the first set (70/65/75%)", () => {
    const sessions = runCycle(bbbFslTemplate, { mainWorkBase: "3/5/1" });
    expect(mainWeightsFor(sessions, "squat")[0]).toEqual([280, 320, 360]);
    expect(supplementalFor(sessions, "squat")).toEqual([tens(280, 5), tens(260, 5), tens(300, 5)]);
  });

  it("a saved PR-set base it doesn't offer falls back to classic", () => {
    const sessions = runCycle(bbbFslTemplate, { mainWorkBase: "prSet" });
    expect(mainWeightsFor(sessions, "squat")[0]).toEqual([260, 300, 340]);
  });

  it("ignores stale opposite-lift and per-lift percentage options from Original BBB", () => {
    const sessions = runCycle(bbbFslTemplate, { supplementalOppositeLift: true, supplementalPercentageByLift: { squat: 0.4 } });
    const squat = sessions.flatMap((s) => s.lifts).find((e) => e.liftKey === "squat")!;
    expect(squat.supplementalLiftKey).toBe("squat");
    expect(supplementalFor(sessions, "squat")[0]).toEqual(tens(260, 5));
  });

  it("3-day rotation: bench's third appearance falls in week 4, at 75% for supplemental", () => {
    const sessions = runCycle(bbbFslTemplate, {}, 3);
    expect(sessions).toHaveLength(12);
    expect(sessions[9].lifts[0].liftKey).toBe("bench");
    expect(sessions[9].lifts[0].step).toEqual({ kind: "main", index: 2 });
    expect(sessions[9].lifts[0].supplemental).toHaveLength(5);
    expect(sessions[9].lifts[0].supplemental[0].workingWeight).toBe(150);
  });

  it("generates a full 2+1 plan into an Original 5/3/1 Anchor", () => {
    const plan = generatePlan(lifts, program(bbbFslTemplate));
    // opening TM test 4 + 2 Leader cycles x 12 + deload 4 + 1 Anchor cycle x 12 + TM test 4
    expect(plan.sessions).toHaveLength(48);
  });
});

describe("bbb-forever", () => {
  it("main work defaults to the printed 3/5/1 ordering", () => {
    expect(mainWeightsFor(runCycle(bbbForeverTemplate), "squat")).toEqual([
      [280, 320, 360],
      [260, 300, 340],
      [300, 340, 380],
    ]);
  });

  it("classic ordering keeps the supplemental tied to the week (60/50/70%)", () => {
    const sessions = runCycle(bbbForeverTemplate, { mainWorkBase: "classic" });
    expect(mainWeightsFor(sessions, "squat")).toEqual([
      [260, 300, 340],
      [280, 320, 360],
      [300, 340, 380],
    ]);
    expect(supplementalFor(sessions, "squat")).toEqual([tens(240, 5), tens(200, 5), tens(280, 5)]);
  });

  it("a saved PR-set base it doesn't offer falls back to 3/5/1", () => {
    expect(mainWeightsFor(runCycle(bbbForeverTemplate, { mainWorkBase: "prSet" }), "squat")[0]).toEqual([280, 320, 360]);
  });

  it("standard (default): 5x10 at 60/50/70% by week", () => {
    const sessions = runCycle(bbbForeverTemplate);
    expect(supplementalFor(sessions, "squat")).toEqual([tens(240, 5), tens(200, 5), tens(280, 5)]);
    expect(supplementalFor(sessions, "bench")).toEqual([tens(120, 5), tens(100, 5), tens(140, 5)]);
    expect(supplementalFor(sessions, "deadlift")).toEqual([tens(300, 5), tens(250, 5), tens(350, 5)]);
    expect(supplementalFor(sessions, "press")).toEqual([tens(180, 5), tens(150, 5), tens(210, 5)]);
  });

  it("conservative: 5x10 at 50/40/60% by week", () => {
    const sessions = runCycle(bbbForeverTemplate, { supplementalScheme: "conservative" });
    expect(supplementalFor(sessions, "squat")).toEqual([tens(200, 5), tens(160, 5), tens(240, 5)]);
  });

  it("Light: 3x10, at either intensity", () => {
    expect(supplementalFor(runCycle(bbbForeverTemplate, { supplementalScheme: "lightStandard" }), "squat")).toEqual([
      tens(240, 3),
      tens(200, 3),
      tens(280, 3),
    ]);
    expect(supplementalFor(runCycle(bbbForeverTemplate, { supplementalScheme: "lightConservative" }), "squat")).toEqual([
      tens(200, 3),
      tens(160, 3),
      tens(240, 3),
    ]);
  });

  it("an unknown saved scheme falls back to standard", () => {
    expect(supplementalFor(runCycle(bbbForeverTemplate, { supplementalScheme: "ascending" }), "squat")[0]).toEqual(tens(240, 5));
  });

  it("never uses the opposite lift", () => {
    const sessions = runCycle(bbbForeverTemplate, { supplementalOppositeLift: true });
    expect(sessions.flatMap((s) => s.lifts).every((e) => e.supplementalLiftKey === e.liftKey)).toBe(true);
  });
});

describe("bbb-slightly-less", () => {
  it("main work defaults to the classic ordering", () => {
    expect(mainWeightsFor(runCycle(bbbSlightlyLessTemplate), "squat")).toEqual([
      [260, 300, 340],
      [280, 320, 360],
      [300, 340, 380],
    ]);
  });

  it("3/5/1 ordering is offered", () => {
    expect(mainWeightsFor(runCycle(bbbSlightlyLessTemplate, { mainWorkBase: "3/5/1" }), "squat")).toEqual([
      [280, 320, 360],
      [260, 300, 340],
      [300, 340, 380],
    ]);
  });

  it("constant (default): 3x10 at 50%, overridable per lift", () => {
    const sessions = runCycle(bbbSlightlyLessTemplate, { supplementalPercentageByLift: { squat: 0.4 } });
    expect(supplementalFor(sessions, "squat")).toEqual([tens(160, 3), tens(160, 3), tens(160, 3)]);
    expect(supplementalFor(sessions, "bench")).toEqual([tens(100, 3), tens(100, 3), tens(100, 3)]);
  });

  it("SLFBBB: 3x10 at 60/50/70% by week", () => {
    const sessions = runCycle(bbbSlightlyLessTemplate, { supplementalScheme: "slfbbb" });
    expect(supplementalFor(sessions, "squat")).toEqual([tens(240, 3), tens(200, 3), tens(280, 3)]);
  });

  it("1x10 ascending: one set each at 50/60/70%, every week", () => {
    const sessions = runCycle(bbbSlightlyLessTemplate, { supplementalScheme: "ascending" });
    const ascending: [number, number][] = [
      [200, 10],
      [240, 10],
      [280, 10],
    ];
    expect(supplementalFor(sessions, "squat")).toEqual([ascending, ascending, ascending]);
    expect(supplementalFor(sessions, "deadlift")[0]).toEqual([
      [250, 10],
      [300, 10],
      [350, 10],
    ]);
  });

  it("1x10 descending: 70/60/50%", () => {
    const sessions = runCycle(bbbSlightlyLessTemplate, { supplementalScheme: "descending" });
    expect(supplementalFor(sessions, "squat")[0]).toEqual([
      [280, 10],
      [240, 10],
      [200, 10],
    ]);
  });
});
