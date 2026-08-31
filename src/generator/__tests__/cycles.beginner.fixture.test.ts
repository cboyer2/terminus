import { describe, expect, it } from "vitest";

import { generatePlan } from "../cycles";
import type { AssistanceTarget, JumpsOrThrows, Lift, LiftKey, PlannedSet, Program, WarmupExercise } from "../types";

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

// docs/plan-structure.md "Part 3 — Warm-up sets": 40% x5, 50% x5, 60% x3 off
// the lift's own training max, fixed regardless of template, progression
// step, or 7th Week Protocol variant — so these three weights per lift cover
// every session in this fixture, main work and the closing TM test alike.
const warmupWeightsByLift: Record<LiftKey, [number, number, number]> = {
  squat: [160, 200, 240],
  bench: [80, 100, 120],
  deadlift: [200, 250, 300],
  press: [120, 150, 180],
};

function expectedWarmupSets(liftKey: LiftKey): PlannedSet[] {
  const [p40, p50, p60] = warmupWeightsByLift[liftKey];
  return [
    { tmPercentage: 0.4, workingWeight: p40, reps: 5, isPrSet: false },
    { tmPercentage: 0.5, workingWeight: p50, reps: 5, isPrSet: false },
    { tmPercentage: 0.6, workingWeight: p60, reps: 3, isPrSet: false },
  ];
}

// docs/templates/beginner.md "Assistance" / "Jumps" / "Warm-up" — hand-
// verified per-session prescriptions, identical for every main-work session
// (per-workout, not per-lift, so checked at the session level below).
const BEGINNER_ASSISTANCE: AssistanceTarget[] = [
  { category: "squat/hip-hinge", exerciseOptions: ["Kettlebell swing or snatch", "Dumbbell or bodyweight squat"], totalReps: { min: 25, max: 100 } },
  { category: "push", exerciseOptions: ["Push-up", "Dip"], totalReps: { min: 25, max: 100 } },
  { category: "pull", exerciseOptions: ["Chin-up", "Pull-up", "Inverted row"], totalReps: { min: 25, max: 50 } },
  { category: "core", exerciseOptions: ["Ab wheel", "Hanging leg raise"], totalReps: { min: 25, max: 50 } },
];

const BEGINNER_JUMPS_OR_THROWS: JumpsOrThrows = {
  totalReps: { min: 10, max: 20 },
  guidance: "Box jumps or standing long jumps; total-body emphasis and a strong landing. Not depth jumps.",
};

const BEGINNER_WARMUP_CIRCUIT: WarmupExercise[] = [
  { name: "Jumping jacks", sets: 3, reps: "25" },
  { name: "Bodyweight squat", sets: 3, reps: "10" },
  { name: "Mountain climbers", sets: 3, reps: "10 per leg" },
];

// docs/plan-structure.md "Assistance and conditioning" / "Session shape" —
// fixed across every 7th Week Protocol variant, independent of template.
const SEVENTH_WEEK_ASSISTANCE: AssistanceTarget[] = [
  { category: "push", exerciseOptions: [], totalReps: { min: 25, max: 50 } },
  { category: "pull", exerciseOptions: [], totalReps: { min: 25, max: 50 } },
  { category: "single-leg-core", exerciseOptions: [], totalReps: { min: 25, max: 50 } },
];

const SEVENTH_WEEK_JUMPS_OR_THROWS: JumpsOrThrows = {
  totalReps: { min: 10, max: 10 },
  guidance: "Any jump or throw variation.",
};

// Joe DeFranco's "Agile 8" — the app's fallback warm-up circuit for the 7th
// Week Protocol, which never has a printed circuit of its own regardless of
// template (unlike Beginner's own main-work sessions, which do).
const AGILE_8: WarmupExercise[] = [
  { name: "IT band foam roll", sets: 1, reps: "10-15 passes per leg" },
  { name: "Adductor foam roll", sets: 1, reps: "10-15 passes per leg" },
  { name: "Glute/piriformis release (lacrosse ball or PVC pipe)", sets: 1, reps: "30 seconds per side" },
  { name: "Rollover into V-sit", sets: 1, reps: "10" },
  { name: "Fire hydrant circles", sets: 1, reps: "10 forward and 10 backward per leg" },
  { name: "Mountain climbers", sets: 1, reps: "10" },
  { name: "Groiners", sets: 1, reps: "10, holding the last rep for 10 seconds" },
  { name: "Hip flexor stretch", sets: 3, reps: "10 seconds per leg — complete one leg before switching" },
];

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
        expect(session.assistance).toEqual(BEGINNER_ASSISTANCE);
        expect(session.jumpsOrThrows).toEqual(BEGINNER_JUMPS_OR_THROWS);
        expect(session.warmupCircuit).toEqual(BEGINNER_WARMUP_CIRCUIT);

        for (const entry of session.lifts) {
          expect(entry.step).toEqual({ kind: "main", index: step });
          expect(entry.warmupSets).toEqual(expectedWarmupSets(entry.liftKey));
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
      expect(session.assistance).toEqual(SEVENTH_WEEK_ASSISTANCE);
      expect(session.jumpsOrThrows).toEqual(SEVENTH_WEEK_JUMPS_OR_THROWS);
      // The 7th Week Protocol never reuses a template's own printed
      // circuit — Beginner's own (jumping jacks, etc.) does NOT carry over.
      expect(session.warmupCircuit).toEqual(AGILE_8);
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
      expect(entry.warmupSets).toEqual(expectedWarmupSets(entry.liftKey));
      expect(entry.supplemental).toEqual([]);
    }
  });
});

describe("generatePlan — beginner template's per-lift options", () => {
  it("supplementalSourceByLift overrides the percentage-derived FSL/SSL split", () => {
    // Squat (90%, normally FSL) forced to SSL; deadlift (85%, normally SSL)
    // forced to FSL — the reverse of each lift's own default.
    const overriddenProgram: Program = {
      ...program,
      options: { supplementalSourceByLift: { squat: "secondSetLast", deadlift: "firstSetLast" } },
    };
    const plan = generatePlan(lifts, overriddenProgram);
    const step0Sessions = plan.sessions.slice(0, 2);
    const byLift = new Map(step0Sessions.flatMap((s) => s.lifts).map((e) => [e.liftKey, e]));

    // Squat's own step-0 sets are 70%x280, 80%x320 — SSL means the second (0.8/320).
    expect(byLift.get("squat")!.supplemental[0]).toEqual({ tmPercentage: 0.8, workingWeight: 320, reps: 5, isPrSet: false });
    // Deadlift's own step-0 sets are 70%x350, 80%x400 — FSL means the first (0.7/350).
    expect(byLift.get("deadlift")!.supplemental[0]).toEqual({ tmPercentage: 0.7, workingWeight: 350, reps: 5, isPrSet: false });
    // Untouched lifts keep their percentage-derived default (bench: FSL).
    expect(byLift.get("bench")!.supplemental[0]).toEqual({ tmPercentage: 0.7, workingWeight: 140, reps: 5, isPrSet: false });
  });

  it("supplementalSetCountByLift overrides the default 5 sets, per lift", () => {
    // docs/templates/beginner.md "Stall": remedy 3, "7-10 x 5" — reps stay 5.
    const overriddenProgram: Program = {
      ...program,
      options: { supplementalSetCountByLift: { squat: 8 } },
    };
    const plan = generatePlan(lifts, overriddenProgram);
    const step0Sessions = plan.sessions.slice(0, 2);
    const byLift = new Map(step0Sessions.flatMap((s) => s.lifts).map((e) => [e.liftKey, e]));

    expect(byLift.get("squat")!.supplemental).toHaveLength(8);
    expect(byLift.get("squat")!.supplemental[0].reps).toBe(5);
    // Untouched lifts keep the default 5.
    expect(byLift.get("bench")!.supplemental).toHaveLength(5);
  });

  it("prSetOnFinalSetByLift marks only the final main-work set, per lift, every progression step", () => {
    // docs/templates/beginner.md "Stall": remedy 2, "push the last set for a PR or goal".
    const overriddenProgram: Program = {
      ...program,
      options: { prSetOnFinalSetByLift: { squat: true } },
    };
    const plan = generatePlan(lifts, overriddenProgram);
    const mainSessions = plan.sessions.slice(0, 6);

    for (const session of mainSessions) {
      for (const entry of session.lifts) {
        const finalSet = entry.mainWork[entry.mainWork.length - 1];
        const otherSets = entry.mainWork.slice(0, -1);
        const expectedFinalPrSet = entry.liftKey === "squat";
        expect(finalSet.isPrSet).toBe(expectedFinalPrSet);
        for (const set of otherSets) {
          expect(set.isPrSet).toBe(false);
        }
      }
    }
  });
});
