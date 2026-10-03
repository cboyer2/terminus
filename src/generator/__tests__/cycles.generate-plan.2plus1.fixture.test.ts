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
  leaderTrainingDays: 4,
  anchorTrainingDays: 4,
  deloadTrainingDays: 4,
  tmTestTrainingDays: 4,
  leaderTemplateId: "bbb-original",
  anchorTemplateId: "original-531",
  tmPercentage: 0.85,
  options: {},
};

const WORKOUT_ORDER: LiftKey[] = ["squat", "bench", "deadlift", "press"];

describe("generatePlan — bbb-original (Leader) -> original-531 (Anchor), 2+1", () => {
  const plan = generatePlan(lifts, program);

  // 4 opening-TM-test sessions (4-day layout, cycle 0) + 24 leader + 4
  // deload + 12 anchor + 4 closing TM test.
  it("produces 48 sessions: opening TM test + 2 leader cycles + deload + 1 anchor cycle + closing TM test", () => {
    expect(plan.sessions).toHaveLength(4 + 24 + 4 + 12 + 4);
  });

  it("opens with the 4-day 7th Week TM test layout, at cycle 0, before the first real cycle", () => {
    const openingSessions = plan.sessions.slice(0, 4);
    expect(openingSessions.map((s) => s.lifts[0].liftKey)).toEqual(["squat", "bench", "deadlift", "press"]);
    for (const session of openingSessions) {
      expect(session.cycleNumber).toBe(0);
    }

    // TM 400, 0.85 plan-wide percentage -> 5 reps target on the top set.
    expect(openingSessions[0].lifts[0].mainWork).toEqual([
      { tmPercentage: 0.7, workingWeight: 280, reps: 5, isPrSet: false },
      { tmPercentage: 0.8, workingWeight: 320, reps: 5, isPrSet: false },
      { tmPercentage: 0.9, workingWeight: 360, reps: 5, isPrSet: false },
      { tmPercentage: 1, workingWeight: 400, reps: 5, isPrSet: false },
    ]);
  });

  it("numbers sessions sequentially and tags each block's cycle number correctly", () => {
    const kinds = plan.sessions.map((s) => s.lifts[0].step.kind);
    const expectedKinds = [
      ...Array(4).fill("tmTest"), // opening TM test
      ...Array(24).fill("main"), // 2 leader cycles
      ...Array(4).fill("deload"),
      ...Array(12).fill("main"), // 1 anchor cycle
      ...Array(4).fill("tmTest"), // closing TM test
    ];
    expect(kinds).toEqual(expectedKinds);

    const cycleNumbers = plan.sessions.map((s) => s.cycleNumber);
    const expectedCycleNumbers = [
      ...Array(4).fill(0), // opening TM test attaches to cycle 0 — there is no real cycle 0
      ...Array(12).fill(1), // leader cycle 1
      ...Array(12).fill(2), // leader cycle 2
      ...Array(4).fill(2), // deload attaches to the cycle just finished
      ...Array(12).fill(3), // anchor cycle
      ...Array(4).fill(3), // TM test attaches to the cycle just finished
    ];
    expect(cycleNumbers).toEqual(expectedCycleNumbers);

    expect(plan.sessions.map((s) => s.sessionNumber)).toEqual(Array.from({ length: 48 }, (_, i) => i + 1));
  });

  it("leader and anchor sessions cycle Squat/Bench/Deadlift/Press in order", () => {
    for (let i = 0; i < 24; i++) {
      expect(plan.sessions[4 + i].lifts[0].liftKey).toBe(WORKOUT_ORDER[i % 4]);
    }
    for (let i = 0; i < 12; i++) {
      expect(plan.sessions[32 + i].lifts[0].liftKey).toBe(WORKOUT_ORDER[i % 4]);
    }
  });

  it("leader cycle 1, session 1 (squat): bbb-original's default 3/5/1 base at TM 400", () => {
    const entry = plan.sessions[4].lifts[0];
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
    const deloadSessions = plan.sessions.slice(28, 32);
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

  it("anchor cycle (session 33, squat): original-531's canonical scheme at TM 420, PR set on the final set", () => {
    const entry = plan.sessions[32].lifts[0];
    expect(entry.mainWork).toEqual([
      { tmPercentage: 0.65, workingWeight: 275, reps: 5, isPrSet: false },
      { tmPercentage: 0.75, workingWeight: 315, reps: 5, isPrSet: false },
      { tmPercentage: 0.85, workingWeight: 355, reps: 5, isPrSet: true },
    ]);
    expect(entry.supplemental).toEqual([]);
  });

  // bbb-original doesn't set anchorAssistanceFollowsLeader (see
  // Template.anchorAssistanceFollowsLeader) — original-531's Anchor cycles
  // here must keep its own 50-75 default rather than picking up anything
  // from BBB, unlike the Original 5/3/1 family's own internal pairings
  // (cycles.original-531-10rep.fixture.test.ts, cycles.original-531-ab.fixture.test.ts).
  it("anchor assistance stays at original-531's own 50-75 default — bbb-original's own data has no bearing on it", () => {
    const anchorSession = plan.sessions[32];
    expect(anchorSession.assistance).toEqual([
      { category: "push", exerciseOptions: ["Dip", "Push-up", "Overhead triceps extension"], totalReps: { min: 50, max: 75 } },
      { category: "pull", exerciseOptions: ["Row", "Chin-up"], totalReps: { min: 50, max: 75 } },
      { category: "single-leg-core", exerciseOptions: ["Ab wheel", "Hanging leg raise", "Lunge"], totalReps: { min: 50, max: 75 } },
    ]);
  });

  it("closing TM test (attached to the anchor cycle, TM 420/210/520/310)", () => {
    const tmTestSessions = plan.sessions.slice(44, 48);
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

describe("generatePlan — mixed day counts: 3-day bbb-original (Leader) -> 4-day original-531 (Anchor), 2+1", () => {
  // The book allows a Leader and Anchor to run at different day counts
  // (e.g. Original 5/3/1 A/B into the canonical Original 5/3/1) — this is
  // the first fixture to exercise that, plus the 7th Week Protocol's
  // independent day count (docs/ARCHITECTURE.md §3, docs/plan-structure.md
  // "Placement rules").
  // deloadTrainingDays (3) and tmTestTrainingDays (2) are deliberately
  // different from each other and from both phases' day counts, to prove
  // all four training-day choices are genuinely independent.
  const mixedProgram: Program = {
    ...program,
    leaderTrainingDays: 3,
    anchorTrainingDays: 4,
    deloadTrainingDays: 3,
    tmTestTrainingDays: 2,
  };
  const plan = generatePlan(lifts, mixedProgram);

  // 2 opening-TM-test sessions (2-day layout, cycle 0) + 24 leader + 3
  // deload + 12 anchor + 2 closing TM test.
  it("produces 43 sessions: opening TM test (2) + 2 leader cycles (3-day rotation, 12 each) + 3-day deload (3) + 1 anchor cycle (4-day, 12) + 2-day TM test (2)", () => {
    expect(plan.sessions).toHaveLength(2 + 24 + 3 + 12 + 2);
  });

  it("opens with its own 2-day 7th Week TM test layout, at cycle 0, before the first real cycle", () => {
    const openingSessions = plan.sessions.slice(0, 2);
    expect(openingSessions.map((s) => s.lifts.map((l) => l.liftKey))).toEqual([
      ["squat", "bench"],
      ["deadlift", "press"],
    ]);
    for (const session of openingSessions) {
      expect(session.cycleNumber).toBe(0);
    }
  });

  it("leader sessions follow bbb-original's 3-day week rotation, not the 4-day fixed shape", () => {
    const order = plan.sessions.slice(2, 14).map((s) => s.lifts[0].liftKey);
    expect(order).toEqual(["squat", "bench", "deadlift", "press", "squat", "bench", "deadlift", "press", "squat", "bench", "deadlift", "press"]);
  });

  it("the deload uses its own 3-day 7th Week layout (deadlift+press share the final session), not the Anchor's 4-day one", () => {
    const deloadSessions = plan.sessions.slice(26, 29);
    expect(deloadSessions.map((s) => s.lifts.map((l) => l.liftKey))).toEqual([["squat"], ["bench"], ["deadlift", "press"]]);
  });

  it("anchor sessions use original-531's 4-day fixed shape, one lift per session", () => {
    const anchorSessions = plan.sessions.slice(29, 41);
    for (const session of anchorSessions) {
      expect(session.lifts).toHaveLength(1);
    }
    expect(anchorSessions.slice(0, 4).map((s) => s.lifts[0].liftKey)).toEqual(["squat", "bench", "deadlift", "press"]);
  });

  it("the closing TM test uses its own 2-day 7th Week layout, independent of the deload's 3-day one and both phases", () => {
    const tmTestSessions = plan.sessions.slice(41, 43);
    expect(tmTestSessions.map((s) => s.lifts.map((l) => l.liftKey))).toEqual([
      ["squat", "bench"],
      ["deadlift", "press"],
    ]);
  });
});
