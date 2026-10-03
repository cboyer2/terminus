import { describe, expect, it } from "vitest";

import { buildMainCycleSessions, generatePlan, liftsByKey } from "../cycles";
import { original53110RepTemplate } from "../templates/original-531-10rep";
import type { Lift, Program } from "../types";

/**
 * Frozen fixture for original-531-10rep, hand-checked against
 * docs/templates/original-531.md's 10-rep main-work table. Same seeds as
 * cycles.original-531.fixture.test.ts on purpose: this template shares
 * every percentage with the canonical program, so the working weights are
 * identical — only the first set's rep count (10, not 5) differs. Reusing
 * the seeds makes that the one variable under test.
 */

const lifts: Lift[] = [
  { liftKey: "squat", role: "main", trainingMaxSeed: 400, tmPercentageOverride: null, increment: 10 },
  { liftKey: "bench", role: "main", trainingMaxSeed: 200, tmPercentageOverride: null, increment: 5 },
  { liftKey: "deadlift", role: "main", trainingMaxSeed: 500, tmPercentageOverride: null, increment: 10 },
  { liftKey: "press", role: "main", trainingMaxSeed: 300, tmPercentageOverride: null, increment: 5 },
];
const liftMap = liftsByKey(lifts);

const program: Program = {
  programmingModel: "2+1",
  leaderTrainingDays: 4,
  anchorTrainingDays: 4,
  deloadTrainingDays: null,
  tmTestTrainingDays: 4,
  leaderTemplateId: "original-531-10rep",
  anchorTemplateId: null,
  tmPercentage: 0.9,
  options: {},
};

describe("original-531-10rep — main work", () => {
  it("cycle 1: 10 reps on the first set, PR set on the final set of every week", () => {
    const { sessions } = buildMainCycleSessions(original53110RepTemplate, "leader", liftMap, program, 1, 0, 1);
    expect(sessions).toHaveLength(12);

    const squatMainWork = sessions.filter((s) => s.lifts[0].liftKey === "squat").map((s) => s.lifts[0].mainWork);
    expect(squatMainWork).toEqual([
      [
        { tmPercentage: 0.65, workingWeight: 260, reps: 10, isPrSet: false },
        { tmPercentage: 0.75, workingWeight: 300, reps: 5, isPrSet: false },
        { tmPercentage: 0.85, workingWeight: 340, reps: 5, isPrSet: true },
      ],
      [
        { tmPercentage: 0.7, workingWeight: 280, reps: 10, isPrSet: false },
        { tmPercentage: 0.8, workingWeight: 320, reps: 5, isPrSet: false },
        { tmPercentage: 0.9, workingWeight: 360, reps: 3, isPrSet: true },
      ],
      [
        { tmPercentage: 0.75, workingWeight: 300, reps: 10, isPrSet: false },
        { tmPercentage: 0.85, workingWeight: 340, reps: 5, isPrSet: false },
        { tmPercentage: 0.95, workingWeight: 380, reps: 1, isPrSet: true },
      ],
    ]);
  });

  it("shares its working weights with original-531's canonical scheme — only the first set's rep target differs", () => {
    const { sessions } = buildMainCycleSessions(original53110RepTemplate, "leader", liftMap, program, 1, 0, 1);
    const benchMainWork = sessions.filter((s) => s.lifts[0].liftKey === "bench").map((s) => s.lifts[0].mainWork);
    expect(benchMainWork.map((week) => week.map((set) => set.workingWeight))).toEqual([
      [130, 150, 170],
      [140, 160, 180],
      [150, 170, 190],
    ]);

    const deadliftMainWork = sessions.filter((s) => s.lifts[0].liftKey === "deadlift").map((s) => s.lifts[0].mainWork);
    expect(deadliftMainWork.map((week) => week.map((set) => set.workingWeight))).toEqual([
      [325, 375, 425],
      [350, 400, 450],
      [375, 425, 475],
    ]);

    const pressMainWork = sessions.filter((s) => s.lifts[0].liftKey === "press").map((s) => s.lifts[0].mainWork);
    expect(pressMainWork.map((week) => week.map((set) => set.workingWeight))).toEqual([
      [195, 225, 255],
      [210, 240, 270],
      [225, 255, 285],
    ]);
  });
});

describe("original-531-10rep — assistance is flat, not role-keyed", () => {
  it("assistance is 50-100 reps per category regardless of role passed in", () => {
    const leaderRun = buildMainCycleSessions(original53110RepTemplate, "leader", liftMap, program, 1, 0, 1);
    const anchorRun = buildMainCycleSessions(original53110RepTemplate, "anchor", liftMap, program, 1, 0, 1);

    const expected = [
      { category: "push", exerciseOptions: ["Dip", "Push-up", "Overhead triceps extension"], totalReps: { min: 50, max: 100 } },
      { category: "pull", exerciseOptions: ["Row", "Chin-up"], totalReps: { min: 50, max: 100 } },
      { category: "single-leg-core", exerciseOptions: ["Ab wheel", "Hanging leg raise", "Lunge"], totalReps: { min: 50, max: 100 } },
    ];
    expect(leaderRun.sessions[0].assistance).toEqual(expected);
    expect(anchorRun.sessions[0].assistance).toEqual(expected);
  });
});

describe("generatePlan — original-531-10rep (Leader) -> original-531 (Anchor)", () => {
  // docs/templates/original-531.md "Options", option 2: original-531's own
  // Anchor cycles get 50-100 reps here, not its own 50-75 default, per
  // anchorAssistanceFollowsLeader.
  it("original-531's Anchor cycles get 50-100 reps, not its own 50-75 default", () => {
    const plan = generatePlan(lifts, { ...program, anchorTemplateId: "original-531", deloadTrainingDays: 4 });
    const anchorMainSessions = plan.sessions.filter((s) => s.cycleNumber === 3 && s.lifts[0]?.step.kind === "main");
    expect(anchorMainSessions.length).toBeGreaterThan(0);
    expect(anchorMainSessions[0].assistance).toEqual([
      { category: "push", exerciseOptions: ["Dip", "Push-up", "Overhead triceps extension"], totalReps: { min: 50, max: 100 } },
      { category: "pull", exerciseOptions: ["Row", "Chin-up"], totalReps: { min: 50, max: 100 } },
      { category: "single-leg-core", exerciseOptions: ["Ab wheel", "Hanging leg raise", "Lunge"], totalReps: { min: 50, max: 100 } },
    ]);
  });
});

describe("original-531-10rep — no supplemental work", () => {
  it("every session's supplemental is empty", () => {
    const { sessions } = buildMainCycleSessions(original53110RepTemplate, "leader", liftMap, program, 1, 0, 1);
    for (const session of sessions) {
      for (const entry of session.lifts) {
        expect(entry.supplemental).toEqual([]);
      }
    }
  });
});
