import { describe, expect, it } from "vitest";

import { buildMainCycleSessions, liftsByKey } from "../cycles";
import { bbbOriginalTemplate } from "../templates/bbb-original";
import type { Lift, Program } from "../types";

/**
 * Frozen fixture for bbb-original, hand-checked against
 * docs/templates/boring-but-big.md's three main-work-base tables (in turn
 * hand-verified against "5/3/1 Forever" pp.50/54/168). Tested at the
 * cycle level via buildMainCycleSessions rather than generatePlan(): BBB is
 * Leader-only and no Anchor template exists yet, so a full multi-phase plan
 * (with its deload week) isn't buildable — see cycles.ts's module comment.
 *
 * Seeds are multiples of 100 so every percentage in the 65-95% range lands
 * on an exact 5 lb mark (see cycles.beginner.fixture.test.ts for why).
 */

const lifts: Lift[] = [
  { liftKey: "squat", role: "main", trainingMaxSeed: 400, tmPercentageOverride: null, increment: 10 },
  { liftKey: "bench", role: "main", trainingMaxSeed: 200, tmPercentageOverride: null, increment: 5 },
  { liftKey: "deadlift", role: "main", trainingMaxSeed: 500, tmPercentageOverride: null, increment: 10 },
  { liftKey: "press", role: "main", trainingMaxSeed: 300, tmPercentageOverride: null, increment: 5 },
];
const liftMap = liftsByKey(lifts);

function program(options: Record<string, unknown> = {}, trainingDays: 2 | 3 | 4 = 4): Program {
  return {
    programmingModel: "2+1",
    leaderTrainingDays: trainingDays,
    anchorTrainingDays: null,
    deloadTrainingDays: null,
    tmTestTrainingDays: trainingDays,
    leaderTemplateId: "bbb-original",
    anchorTemplateId: null,
    tmPercentage: 0.85,
    options,
  };
}

const WORKOUT_ORDER = ["squat", "bench", "deadlift", "press"] as const;

function runCycle(options: Record<string, unknown> = {}) {
  return buildMainCycleSessions(bbbOriginalTemplate, "leader", liftMap, program(options), 1, 0, 1);
}

describe("bbb-original — main work base option", () => {
  it("defaults to 3/5/1 ordering, all fives, no PR set", () => {
    const { sessions } = runCycle();
    expect(sessions).toHaveLength(12);

    const squatMainWork = sessions.filter((s) => s.lifts[0].liftKey === "squat").map((s) => s.lifts[0].mainWork);
    expect(squatMainWork).toEqual([
      [
        { tmPercentage: 0.7, workingWeight: 280, reps: 5, isPrSet: false },
        { tmPercentage: 0.8, workingWeight: 320, reps: 5, isPrSet: false },
        { tmPercentage: 0.9, workingWeight: 360, reps: 5, isPrSet: false },
      ],
      [
        { tmPercentage: 0.65, workingWeight: 260, reps: 5, isPrSet: false },
        { tmPercentage: 0.75, workingWeight: 300, reps: 5, isPrSet: false },
        { tmPercentage: 0.85, workingWeight: 340, reps: 5, isPrSet: false },
      ],
      [
        { tmPercentage: 0.75, workingWeight: 300, reps: 5, isPrSet: false },
        { tmPercentage: 0.85, workingWeight: 340, reps: 5, isPrSet: false },
        { tmPercentage: 0.95, workingWeight: 380, reps: 5, isPrSet: false },
      ],
    ]);
  });

  it("sessions cycle Squat/Bench/Deadlift/Press once per progression step", () => {
    const { sessions } = runCycle();
    for (let step = 0; step < 3; step++) {
      for (let i = 0; i < 4; i++) {
        const session = sessions[step * 4 + i];
        expect(session.sessionNumber).toBe(step * 4 + i + 1);
        expect(session.cycleNumber).toBe(1);
        expect(session.lifts).toHaveLength(1);
        expect(session.lifts[0].liftKey).toBe(WORKOUT_ORDER[i]);
        expect(session.lifts[0].step).toEqual({ kind: "main", index: step });
      }
    }
  });

  it("classic base opens week one at 65%, not 70%", () => {
    const { sessions } = runCycle({ mainWorkBase: "classic" });
    const squatMainWork = sessions.filter((s) => s.lifts[0].liftKey === "squat").map((s) => s.lifts[0].mainWork);

    expect(squatMainWork).toEqual([
      [
        { tmPercentage: 0.65, workingWeight: 260, reps: 5, isPrSet: false },
        { tmPercentage: 0.75, workingWeight: 300, reps: 5, isPrSet: false },
        { tmPercentage: 0.85, workingWeight: 340, reps: 5, isPrSet: false },
      ],
      [
        { tmPercentage: 0.7, workingWeight: 280, reps: 5, isPrSet: false },
        { tmPercentage: 0.8, workingWeight: 320, reps: 5, isPrSet: false },
        { tmPercentage: 0.9, workingWeight: 360, reps: 5, isPrSet: false },
      ],
      [
        { tmPercentage: 0.75, workingWeight: 300, reps: 5, isPrSet: false },
        { tmPercentage: 0.85, workingWeight: 340, reps: 5, isPrSet: false },
        { tmPercentage: 0.95, workingWeight: 380, reps: 5, isPrSet: false },
      ],
    ]);
  });

  it("prSet base is identical to original-531's canonical scheme, PR set on the final set", () => {
    const { sessions } = runCycle({ mainWorkBase: "prSet" });
    const squatMainWork = sessions.filter((s) => s.lifts[0].liftKey === "squat").map((s) => s.lifts[0].mainWork);

    expect(squatMainWork).toEqual([
      [
        { tmPercentage: 0.65, workingWeight: 260, reps: 5, isPrSet: false },
        { tmPercentage: 0.75, workingWeight: 300, reps: 5, isPrSet: false },
        { tmPercentage: 0.85, workingWeight: 340, reps: 5, isPrSet: true },
      ],
      [
        { tmPercentage: 0.7, workingWeight: 280, reps: 3, isPrSet: false },
        { tmPercentage: 0.8, workingWeight: 320, reps: 3, isPrSet: false },
        { tmPercentage: 0.9, workingWeight: 360, reps: 3, isPrSet: true },
      ],
      [
        { tmPercentage: 0.75, workingWeight: 300, reps: 5, isPrSet: false },
        { tmPercentage: 0.85, workingWeight: 340, reps: 3, isPrSet: false },
        { tmPercentage: 0.95, workingWeight: 380, reps: 1, isPrSet: true },
      ],
    ]);
  });
});

describe("bbb-original — supplemental (5x10 at a flat % of the training max)", () => {
  it("defaults to 50%, constant across every progression step (not FSL/SSL — it doesn't track the week)", () => {
    const { sessions } = runCycle();
    const squatSupplemental = sessions.filter((s) => s.lifts[0].liftKey === "squat").map((s) => s.lifts[0].supplemental);

    for (const supplemental of squatSupplemental) {
      expect(supplemental).toEqual(
        Array.from({ length: 5 }, () => ({ tmPercentage: 0.5, workingWeight: 200, reps: 10, isPrSet: false }))
      );
    }
  });

  it("is overridable per lift via program.options.supplementalPercentageByLift", () => {
    const { sessions } = runCycle({ supplementalPercentageByLift: { squat: 0.4, deadlift: 0.45 } });
    const byLift = new Map(sessions.map((s) => [s.lifts[0].liftKey, s.lifts[0].supplemental]));

    expect(byLift.get("squat")![0]).toEqual({ tmPercentage: 0.4, workingWeight: 160, reps: 10, isPrSet: false });
    expect(byLift.get("deadlift")![0]).toEqual({ tmPercentage: 0.45, workingWeight: 225, reps: 10, isPrSet: false });
    // bench/press have no override -> still the template default.
    expect(byLift.get("bench")![0]).toEqual({ tmPercentage: 0.5, workingWeight: 100, reps: 10, isPrSet: false });
    expect(byLift.get("press")![0]).toEqual({ tmPercentage: 0.5, workingWeight: 150, reps: 10, isPrSet: false });
  });

  it("draws from the opposite lift's training max when program.options.supplementalOppositeLift is set", () => {
    // docs/templates/boring-but-big.md "Options": "Supplemental lift: same
    // as main · opposite — bench main, press supplemental." Seeds: squat
    // 400, bench 200, deadlift 500, press 300 -> at the flat 50% default,
    // each session's supplemental weight comes from its *paired* lift's TM.
    const { sessions } = runCycle({ supplementalOppositeLift: true });
    const byLift = new Map(sessions.map((s) => [s.lifts[0].liftKey, s.lifts[0].supplemental]));

    expect(byLift.get("squat")![0]).toEqual({ tmPercentage: 0.5, workingWeight: 250, reps: 10, isPrSet: false }); // deadlift's TM
    expect(byLift.get("deadlift")![0]).toEqual({ tmPercentage: 0.5, workingWeight: 200, reps: 10, isPrSet: false }); // squat's TM
    expect(byLift.get("bench")![0]).toEqual({ tmPercentage: 0.5, workingWeight: 150, reps: 10, isPrSet: false }); // press's TM
    expect(byLift.get("press")![0]).toEqual({ tmPercentage: 0.5, workingWeight: 100, reps: 10, isPrSet: false }); // bench's TM
  });

  it("combines opposite-lift with a per-lift percentage override — the override's percentage, the opposite lift's TM", () => {
    const { sessions } = runCycle({ supplementalOppositeLift: true, supplementalPercentageByLift: { squat: 0.4 } });
    const squatSupplemental = sessions.find((s) => s.lifts[0].liftKey === "squat")!.lifts[0].supplemental;

    // 0.4 x deadlift's 500 TM = 200, not 0.4 x squat's own 400 TM (160).
    expect(squatSupplemental[0]).toEqual({ tmPercentage: 0.4, workingWeight: 200, reps: 10, isPrSet: false });
  });
});

describe("bbb-original — 3-day week rotation", () => {
  // docs/templates/boring-but-big.md "Session shape": a 4-calendar-week
  // rotation (corrected from an earlier 3-week reading) — week 1 squat/
  // bench/deadlift, week 2 press/squat/bench, week 3 deadlift/press/squat,
  // week 4 bench/deadlift/press. Every lift sits out exactly one week in
  // four; its own Nth appearance always uses progression step N-1,
  // regardless of which calendar week that lands on.
  function runThreeDayCycle(options: Record<string, unknown> = {}) {
    return buildMainCycleSessions(bbbOriginalTemplate, "leader", liftMap, program(options, 3), 1, 0, 1);
  }

  it("runs 12 sessions across 4 calendar weeks, one lift per session", () => {
    const { sessions } = runThreeDayCycle();
    expect(sessions).toHaveLength(12);
    for (const session of sessions) {
      expect(session.lifts).toHaveLength(1);
      expect(session.cycleNumber).toBe(1);
    }
  });

  it("matches the book's printed week-by-week lift order", () => {
    const { sessions } = runThreeDayCycle();
    const order = sessions.map((s) => s.lifts[0].liftKey);
    expect(order).toEqual([
      "squat", "bench", "deadlift", // week 1
      "press", "squat", "bench", // week 2
      "deadlift", "press", "squat", // week 3
      "bench", "deadlift", "press", // week 4
    ]);
  });

  it("advances each lift's own progression step by its appearance order, not the calendar week", () => {
    const { sessions } = runThreeDayCycle();
    const stepsByLift = new Map<string, number[]>();
    for (const session of sessions) {
      const entry = session.lifts[0];
      const steps = stepsByLift.get(entry.liftKey) ?? [];
      steps.push((entry.step as { kind: "main"; index: number }).index);
      stepsByLift.set(entry.liftKey, steps);
    }
    // Every lift gets exactly 3 appearances, at steps 0, 1, 2 in order,
    // regardless of which calendar weeks it lands on (squat: weeks 1-3;
    // bench: weeks 1,2,4; deadlift: weeks 1,3,4; press: weeks 2,3,4).
    for (const liftKey of WORKOUT_ORDER) {
      expect(stepsByLift.get(liftKey)).toEqual([0, 1, 2]);
    }
  });

  it("hand-checked weights: squat's 3 appearances use the 3/5/1 default base at its own seed", () => {
    const { sessions } = runThreeDayCycle();
    const squatMainWork = sessions.filter((s) => s.lifts[0].liftKey === "squat").map((s) => s.lifts[0].mainWork);
    // Squat's own seed is 400 -> identical to the 4-day fixture's squat
    // table, since a lift's own progression only depends on its own
    // appearance order, never on which other lifts share its calendar week.
    expect(squatMainWork).toEqual([
      [
        { tmPercentage: 0.7, workingWeight: 280, reps: 5, isPrSet: false },
        { tmPercentage: 0.8, workingWeight: 320, reps: 5, isPrSet: false },
        { tmPercentage: 0.9, workingWeight: 360, reps: 5, isPrSet: false },
      ],
      [
        { tmPercentage: 0.65, workingWeight: 260, reps: 5, isPrSet: false },
        { tmPercentage: 0.75, workingWeight: 300, reps: 5, isPrSet: false },
        { tmPercentage: 0.85, workingWeight: 340, reps: 5, isPrSet: false },
      ],
      [
        { tmPercentage: 0.75, workingWeight: 300, reps: 5, isPrSet: false },
        { tmPercentage: 0.85, workingWeight: 340, reps: 5, isPrSet: false },
        { tmPercentage: 0.95, workingWeight: 380, reps: 5, isPrSet: false },
      ],
    ]);
  });

  it("hand-checked weights: bench (400/200/300/500 -> seed 200), skipping week 3", () => {
    const { sessions } = runThreeDayCycle();
    const benchMainWork = sessions.filter((s) => s.lifts[0].liftKey === "bench").map((s) => s.lifts[0].mainWork);
    expect(benchMainWork).toEqual([
      [
        { tmPercentage: 0.7, workingWeight: 140, reps: 5, isPrSet: false },
        { tmPercentage: 0.8, workingWeight: 160, reps: 5, isPrSet: false },
        { tmPercentage: 0.9, workingWeight: 180, reps: 5, isPrSet: false },
      ],
      [
        { tmPercentage: 0.65, workingWeight: 130, reps: 5, isPrSet: false },
        { tmPercentage: 0.75, workingWeight: 150, reps: 5, isPrSet: false },
        { tmPercentage: 0.85, workingWeight: 170, reps: 5, isPrSet: false },
      ],
      [
        { tmPercentage: 0.75, workingWeight: 150, reps: 5, isPrSet: false },
        { tmPercentage: 0.85, workingWeight: 170, reps: 5, isPrSet: false },
        { tmPercentage: 0.95, workingWeight: 190, reps: 5, isPrSet: false },
      ],
    ]);
  });

  it("supplemental (flat 50%) is unaffected by the rotation — same as the 4-day fixture", () => {
    const { sessions } = runThreeDayCycle();
    const byLift = new Map(sessions.map((s) => [s.lifts[0].liftKey, s.lifts[0].supplemental[0]]));
    expect(byLift.get("squat")).toEqual({ tmPercentage: 0.5, workingWeight: 200, reps: 10, isPrSet: false });
    expect(byLift.get("bench")).toEqual({ tmPercentage: 0.5, workingWeight: 100, reps: 10, isPrSet: false });
    expect(byLift.get("deadlift")).toEqual({ tmPercentage: 0.5, workingWeight: 250, reps: 10, isPrSet: false });
    expect(byLift.get("press")).toEqual({ tmPercentage: 0.5, workingWeight: 150, reps: 10, isPrSet: false });
  });
});
