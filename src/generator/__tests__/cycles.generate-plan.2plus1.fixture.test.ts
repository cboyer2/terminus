import { describe, expect, it } from "vitest";

import { generatePlan } from "../cycles";
import type { Lift, LiftKey, Program } from "../types";

/**
 * First end-to-end generatePlan() fixture: a complete 2+1 plan pairing
 * bbb-original (Leader) with original-531 (Anchor) — original-531 is
 * bbb-original's one assigned compatible anchor (docs/templates/
 * boring-but-big.md). This is the first plan to actually exercise a
 * multi-phase programming model and the deload week between phases.
 *
 * Per-template weight correctness (main work, supplemental, TM test) is
 * already covered by cycles.bbb-original.fixture.test.ts and
 * cycles.original-531.fixture.test.ts. This fixture instead verifies
 * *composition*: the right template runs in the right phase, sessions are
 * numbered and cycle-tagged correctly across phase and protocol-week
 * boundaries, and the new deload week (with its genuine 3-5 rep range) is
 * computed correctly — plus a handful of spot-checked weights to confirm
 * the right template's numbers actually land in the right place.
 *
 * Seeds are multiples of 100; the real book increments (+10 squat/deadlift,
 * +5 bench/press) are used to exercise realistic rounding, as in
 * cycles.original-531.fixture.test.ts.
 */

const lifts: Lift[] = [
  { liftKey: "squat", role: "main", trainingMaxSeed: 400, tmPercentageOverride: null, increment: 10 },
  { liftKey: "bench", role: "main", trainingMaxSeed: 200, tmPercentageOverride: null, increment: 5 },
  { liftKey: "deadlift", role: "main", trainingMaxSeed: 500, tmPercentageOverride: null, increment: 10 },
  { liftKey: "press", role: "main", trainingMaxSeed: 300, tmPercentageOverride: null, increment: 5 },
];

const program: Program = {
  programmingModel: "2+1",
  trainingDays: 4,
  leaderTemplateId: "bbb-original",
  anchorTemplateId: "original-531",
  tmPercentage: 0.85,
  options: {},
};

const WORKOUT_ORDER: LiftKey[] = ["squat", "bench", "deadlift", "press"];

describe("generatePlan — bbb-original (Leader) -> original-531 (Anchor), 2+1", () => {
  const plan = generatePlan(lifts, program);

  it("produces 44 sessions: 2 leader cycles + deload + 1 anchor cycle + TM test", () => {
    expect(plan.sessions).toHaveLength(24 + 4 + 12 + 4);
  });

  it("numbers sessions sequentially and tags each block's cycle number correctly", () => {
    const kinds = plan.sessions.map((s) => s.lifts[0].step.kind);
    const expectedKinds = [
      ...Array(24).fill("main"), // 2 leader cycles
      ...Array(4).fill("deload"),
      ...Array(12).fill("main"), // 1 anchor cycle
      ...Array(4).fill("tmTest"),
    ];
    expect(kinds).toEqual(expectedKinds);

    const cycleNumbers = plan.sessions.map((s) => s.cycleNumber);
    const expectedCycleNumbers = [
      ...Array(12).fill(1), // leader cycle 1
      ...Array(12).fill(2), // leader cycle 2
      ...Array(4).fill(2), // deload attaches to the cycle just finished
      ...Array(12).fill(3), // anchor cycle
      ...Array(4).fill(3), // TM test attaches to the cycle just finished
    ];
    expect(cycleNumbers).toEqual(expectedCycleNumbers);

    expect(plan.sessions.map((s) => s.sessionNumber)).toEqual(Array.from({ length: 44 }, (_, i) => i + 1));
  });

  it("leader and anchor sessions cycle Squat/Bench/Deadlift/Press in order", () => {
    for (let i = 0; i < 24; i++) {
      expect(plan.sessions[i].lifts[0].liftKey).toBe(WORKOUT_ORDER[i % 4]);
    }
    for (let i = 0; i < 12; i++) {
      expect(plan.sessions[28 + i].lifts[0].liftKey).toBe(WORKOUT_ORDER[i % 4]);
    }
  });

  it("leader cycle 1, session 1 (squat): bbb-original's default 3/5/1 base at TM 400", () => {
    const entry = plan.sessions[0].lifts[0];
    expect(entry.mainWork).toEqual([
      { tmPercentage: 0.7, workingWeight: 280, reps: 5, isPrSet: false },
      { tmPercentage: 0.8, workingWeight: 320, reps: 5, isPrSet: false },
      { tmPercentage: 0.9, workingWeight: 360, reps: 5, isPrSet: false },
    ]);
    expect(entry.supplemental).toEqual(
      Array.from({ length: 5 }, () => ({ tmPercentage: 0.5, workingWeight: 200, reps: 10, isPrSet: false }))
    );
  });

  it("deload (attached to leader cycle 2, TM 410/205/510/305): 70x5, 80x3-5, 90x1, 100x1", () => {
    const deloadSessions = plan.sessions.slice(24, 28);
    const byLift = new Map(deloadSessions.map((s) => [s.lifts[0].liftKey, s.lifts[0]]));

    expect(byLift.get("squat")!.mainWork).toEqual([
      { tmPercentage: 0.7, workingWeight: 285, reps: 5, isPrSet: false },
      { tmPercentage: 0.8, workingWeight: 330, reps: { min: 3, max: 5 }, isPrSet: false },
      { tmPercentage: 0.9, workingWeight: 370, reps: 1, isPrSet: false },
      { tmPercentage: 1, workingWeight: 410, reps: 1, isPrSet: false },
    ]);
    expect(byLift.get("bench")!.mainWork.map((s) => s.workingWeight)).toEqual([145, 165, 185, 205]);
    expect(byLift.get("deadlift")!.mainWork.map((s) => s.workingWeight)).toEqual([355, 410, 460, 510]);
    expect(byLift.get("press")!.mainWork.map((s) => s.workingWeight)).toEqual([215, 245, 275, 305]);

    for (const session of deloadSessions) {
      expect(session.lifts[0].supplemental).toEqual([]);
    }
  });

  it("anchor cycle (session 29, squat): original-531's canonical scheme at TM 420, PR set on the final set", () => {
    const entry = plan.sessions[28].lifts[0];
    expect(entry.mainWork).toEqual([
      { tmPercentage: 0.65, workingWeight: 275, reps: 5, isPrSet: false },
      { tmPercentage: 0.75, workingWeight: 315, reps: 5, isPrSet: false },
      { tmPercentage: 0.85, workingWeight: 355, reps: 5, isPrSet: true },
    ]);
    expect(entry.supplemental).toEqual([]);
  });

  it("closing TM test (attached to the anchor cycle, TM 420/210/520/310)", () => {
    const tmTestSessions = plan.sessions.slice(40, 44);
    const byLift = new Map(tmTestSessions.map((s) => [s.lifts[0].liftKey, s.lifts[0]]));

    // 85% training max throughout -> 5 reps target on the top set.
    expect(byLift.get("squat")!.mainWork).toEqual([
      { tmPercentage: 0.7, workingWeight: 295, reps: 5, isPrSet: false },
      { tmPercentage: 0.8, workingWeight: 335, reps: 5, isPrSet: false },
      { tmPercentage: 0.9, workingWeight: 380, reps: 5, isPrSet: false },
      { tmPercentage: 1, workingWeight: 420, reps: 5, isPrSet: false },
    ]);

    for (const session of tmTestSessions) {
      expect(session.lifts[0].supplemental).toEqual([]);
    }
  });
});
