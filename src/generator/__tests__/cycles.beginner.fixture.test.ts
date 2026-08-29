import { describe, expect, it } from "vitest";

import { generatePlan } from "../cycles";
import type { Lift, LiftKey, PlannedSet, Program } from "../types";

/**
 * Frozen fixture for the Beginner template, hand-checked against
 * docs/templates/beginner.md's percentage tables (themselves hand-verified
 * against "5/3/1 Forever"'s Beginner Prep School chapter). Seeds are chosen
 * as round multiples of 20 so every working weight lands exactly on a 5 lb
 * mark, with no rounding to obscure a wrong percentage.
 *
 * Squat/bench/press run at the program default (90%, First Set Last);
 * deadlift is overridden to 85% (Second Set Last) — exercising both the
 * per-lift override and the percentage-keyed supplemental split described
 * in beginner.md "Options".
 *
 * Seeds are multiples of 100, not just 20: for every 5%-step percentage in
 * the 65-95% range to land exactly on a 5 lb mark with no rounding, the
 * training max itself must be a multiple of 100 (e.g. 160 x 70% = 112,
 * which isn't).
 */

const lifts: Lift[] = [
  { liftKey: "squat", role: "main", trainingMaxSeed: 400, tmPercentageOverride: null, increment: 5 },
  { liftKey: "bench", role: "main", trainingMaxSeed: 200, tmPercentageOverride: null, increment: 5 },
  { liftKey: "deadlift", role: "main", trainingMaxSeed: 500, tmPercentageOverride: 0.85, increment: 5 },
  { liftKey: "press", role: "main", trainingMaxSeed: 300, tmPercentageOverride: null, increment: 5 },
];

const program: Program = {
  programmingModel: "beginner",
  leaderTrainingDays: 3,
  anchorTrainingDays: null,
  deloadTrainingDays: null,
  tmTestTrainingDays: 3,
  leaderTemplateId: "beginner",
  anchorTemplateId: null,
  tmPercentage: 0.9,
  options: {},
};

const mainPercentsByStep = [
  [0.7, 0.8, 0.9],
  [0.65, 0.75, 0.85],
  [0.75, 0.85, 0.95],
];

// One row per lift, per progression step: [70/65/75%, 80/75/85%, 90/85/95%].
const mainWeightsByStep: Record<LiftKey, number[][]> = {
  squat: [
    [280, 320, 360],
    [260, 300, 340],
    [300, 340, 380],
  ],
  bench: [
    [140, 160, 180],
    [130, 150, 170],
    [150, 170, 190],
  ],
  deadlift: [
    [350, 400, 450],
    [325, 375, 425],
    [375, 425, 475],
  ],
  press: [
    [210, 240, 270],
    [195, 225, 255],
    [225, 255, 285],
  ],
};

// FSL (squat, bench, press) uses the week's first main set; SSL (deadlift)
// uses its second. One [percentage, weight] pair per progression step.
const supplementalByStep: Record<LiftKey, [number, number][]> = {
  squat: [
    [0.7, 280],
    [0.65, 260],
    [0.75, 300],
  ],
  bench: [
    [0.7, 140],
    [0.65, 130],
    [0.75, 150],
  ],
  press: [
    [0.7, 210],
    [0.65, 195],
    [0.75, 225],
  ],
  deadlift: [
    [0.8, 400],
    [0.75, 375],
    [0.85, 425],
  ],
};

const WORKOUTS: { liftKeys: LiftKey[] }[] = [{ liftKeys: ["squat", "bench"] }, { liftKeys: ["deadlift", "press"] }];

function expectedMainWork(liftKey: LiftKey, step: number): PlannedSet[] {
  return mainPercentsByStep[step].map((tmPercentage, i) => ({
    tmPercentage,
    workingWeight: mainWeightsByStep[liftKey][step][i],
    reps: 5,
    isPrSet: false,
  }));
}

function expectedSupplemental(liftKey: LiftKey, step: number): PlannedSet[] {
  const [tmPercentage, workingWeight] = supplementalByStep[liftKey][step];
  return Array.from({ length: 5 }, () => ({ tmPercentage, workingWeight, reps: 5, isPrSet: false }));
}

describe("generatePlan — beginner template fixture", () => {
  const plan = generatePlan(lifts, program);

  it("produces six main sessions and a three-session closing TM test", () => {
    expect(plan.sessions).toHaveLength(9);
  });

  it("alternates Workout A and B across all three progression steps, cycle 1", () => {
    for (let step = 0; step < 3; step++) {
      for (let workoutIndex = 0; workoutIndex < 2; workoutIndex++) {
        const session = plan.sessions[step * 2 + workoutIndex];
        const liftKeys = WORKOUTS[workoutIndex].liftKeys;

        expect(session.sessionNumber).toBe(step * 2 + workoutIndex + 1);
        expect(session.cycleNumber).toBe(1);
        expect(session.lifts.map((l) => l.liftKey)).toEqual(liftKeys);

        for (const entry of session.lifts) {
          expect(entry.step).toEqual({ kind: "main", index: step });
          expect(entry.mainWork).toEqual(expectedMainWork(entry.liftKey, step));
          expect(entry.supplemental).toEqual(expectedSupplemental(entry.liftKey, step));
        }
      }
    }
  });

  it("closes with the 3-day 7th Week TM test layout: squat, bench, deadlift+press", () => {
    const [squatSession, benchSession, deadliftPressSession] = plan.sessions.slice(6);

    expect(squatSession.sessionNumber).toBe(7);
    expect(benchSession.sessionNumber).toBe(8);
    expect(deadliftPressSession.sessionNumber).toBe(9);
    for (const session of [squatSession, benchSession, deadliftPressSession]) {
      expect(session.cycleNumber).toBe(1);
    }

    expect(squatSession.lifts.map((l) => l.liftKey)).toEqual(["squat"]);
    expect(benchSession.lifts.map((l) => l.liftKey)).toEqual(["bench"]);
    expect(deadliftPressSession.lifts.map((l) => l.liftKey)).toEqual(["deadlift", "press"]);
  });

  it("TM test main work is 70/80/90% x5 then 100% for a percentage-dependent rep target", () => {
    const allTmTestEntries = plan.sessions.slice(6).flatMap((s) => s.lifts);
    const byLift = new Map(allTmTestEntries.map((e) => [e.liftKey, e]));

    // 90% training max (squat, bench, press) -> 3 reps at the top; 85% (deadlift) -> 5.
    expect(byLift.get("squat")!.mainWork).toEqual([
      { tmPercentage: 0.7, workingWeight: 280, reps: 5, isPrSet: false },
      { tmPercentage: 0.8, workingWeight: 320, reps: 5, isPrSet: false },
      { tmPercentage: 0.9, workingWeight: 360, reps: 5, isPrSet: false },
      { tmPercentage: 1, workingWeight: 400, reps: 3, isPrSet: false },
    ]);
    expect(byLift.get("bench")!.mainWork).toEqual([
      { tmPercentage: 0.7, workingWeight: 140, reps: 5, isPrSet: false },
      { tmPercentage: 0.8, workingWeight: 160, reps: 5, isPrSet: false },
      { tmPercentage: 0.9, workingWeight: 180, reps: 5, isPrSet: false },
      { tmPercentage: 1, workingWeight: 200, reps: 3, isPrSet: false },
    ]);
    expect(byLift.get("press")!.mainWork).toEqual([
      { tmPercentage: 0.7, workingWeight: 210, reps: 5, isPrSet: false },
      { tmPercentage: 0.8, workingWeight: 240, reps: 5, isPrSet: false },
      { tmPercentage: 0.9, workingWeight: 270, reps: 5, isPrSet: false },
      { tmPercentage: 1, workingWeight: 300, reps: 3, isPrSet: false },
    ]);
    expect(byLift.get("deadlift")!.mainWork).toEqual([
      { tmPercentage: 0.7, workingWeight: 350, reps: 5, isPrSet: false },
      { tmPercentage: 0.8, workingWeight: 400, reps: 5, isPrSet: false },
      { tmPercentage: 0.9, workingWeight: 450, reps: 5, isPrSet: false },
      { tmPercentage: 1, workingWeight: 500, reps: 5, isPrSet: false },
    ]);

    for (const entry of allTmTestEntries) {
      expect(entry.step).toEqual({ kind: "tmTest" });
      expect(entry.supplemental).toEqual([]);
    }
  });
});
