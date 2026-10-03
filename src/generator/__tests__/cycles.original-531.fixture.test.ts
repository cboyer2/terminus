import { describe, expect, it } from "vitest";

import { buildMainCycleSessions, generatePlan, liftsByKey } from "../cycles";
import { original531Template } from "../templates/original-531";
import type { Lift, Program, Session } from "../types";

/**
 * Frozen fixture for original-531, hand-checked against
 * docs/templates/original-531.md's canonical main-work table (in turn
 * hand-verified against "5/3/1 Forever" p.165). Most of this file tests at
 * the cycle level via buildMainCycleSessions rather than generatePlan() —
 * a self-contained way to check one role's output without needing a full
 * plan-shaped program; the self-pairing describe block at the end does
 * exercise generatePlan() directly, since it's specifically checking the
 * Leader->Anchor transition.
 *
 * Seeds are multiples of 100 for cycle 1 (cycleIndex 0), so weights land on
 * an exact 5 lb mark with no rounding to obscure a wrong percentage. Cycle
 * 2 (cycleIndex 1) uses the book's real increments (+10 squat/deadlift, +5
 * bench/press) specifically to exercise the rounding those produce.
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
  // Non-null even though this fixture's own `leaderTemplateId` never runs
  // original-531 as an Anchor — one test below calls buildMainCycleSessions
  // with role="anchor" directly to check assistance's role-keying, which
  // needs a day count to resolve original-531's (day-count-independent)
  // session shape.
  anchorTrainingDays: 4,
  deloadTrainingDays: null,
  tmTestTrainingDays: 4,
  leaderTemplateId: "original-531",
  anchorTemplateId: null,
  tmPercentage: 0.9,
  options: {},
};

describe("original-531 — main work", () => {
  it("cycle 1: canonical week ordering, PR set on the final set of every week", () => {
    const { sessions } = buildMainCycleSessions(original531Template, "leader", liftMap, program, 1, 0, 1);
    expect(sessions).toHaveLength(12);

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

  it("cycle 2: training max increases by the lift's own increment (+10 squat, +5 bench/press/... here +10 deadlift too)", () => {
    const { sessions } = buildMainCycleSessions(original531Template, "leader", liftMap, program, 2, 1, 1);
    const squatMainWork = sessions.filter((s) => s.lifts[0].liftKey === "squat").map((s) => s.lifts[0].mainWork);

    // TM = 410. 65/75/85% -> 265/310/350 (307.5 and 348.5 both round up).
    expect(squatMainWork).toEqual([
      [
        { tmPercentage: 0.65, workingWeight: 265, reps: 5, isPrSet: false },
        { tmPercentage: 0.75, workingWeight: 310, reps: 5, isPrSet: false },
        { tmPercentage: 0.85, workingWeight: 350, reps: 5, isPrSet: true },
      ],
      [
        { tmPercentage: 0.7, workingWeight: 285, reps: 3, isPrSet: false },
        { tmPercentage: 0.8, workingWeight: 330, reps: 3, isPrSet: false },
        { tmPercentage: 0.9, workingWeight: 370, reps: 3, isPrSet: true },
      ],
      [
        { tmPercentage: 0.75, workingWeight: 310, reps: 5, isPrSet: false },
        { tmPercentage: 0.85, workingWeight: 350, reps: 3, isPrSet: false },
        { tmPercentage: 0.95, workingWeight: 390, reps: 1, isPrSet: true },
      ],
    ]);
  });

  it("main work is unchanged between Leader and Anchor use — only assistance is role-keyed", () => {
    const leaderRun = buildMainCycleSessions(original531Template, "leader", liftMap, program, 1, 0, 1);
    const anchorRun = buildMainCycleSessions(original531Template, "anchor", liftMap, program, 1, 0, 1);

    // jumpsOrThrows and warmupCircuit aren't role-keyed on this template
    // either (only assistance is — original-531.ts), so everything but
    // assistance itself should be identical between the two runs.
    const omitAssistance = (sessions: Session[]) => sessions.map(({ assistance: _assistance, ...rest }) => rest);
    expect(omitAssistance(anchorRun.sessions)).toEqual(omitAssistance(leaderRun.sessions));

    expect(leaderRun.sessions[0].assistance).not.toEqual(anchorRun.sessions[0].assistance);

    // original-531.ts's own printed values (docs/templates/original-531.md
    // "Assistance — role-keyed").
    expect(leaderRun.sessions[0].assistance).toEqual([
      { category: "push", exerciseOptions: ["Dip", "Push-up", "Overhead triceps extension"], totalReps: { min: 100, max: 100 } },
      { category: "pull", exerciseOptions: ["Row", "Chin-up"], totalReps: { min: 100, max: 100 } },
      { category: "single-leg-core", exerciseOptions: ["Ab wheel", "Hanging leg raise", "Lunge"], totalReps: { min: 100, max: 100 } },
    ]);
    expect(anchorRun.sessions[0].assistance).toEqual([
      { category: "push", exerciseOptions: ["Dip", "Push-up", "Overhead triceps extension"], totalReps: { min: 50, max: 75 } },
      { category: "pull", exerciseOptions: ["Row", "Chin-up"], totalReps: { min: 50, max: 75 } },
      { category: "single-leg-core", exerciseOptions: ["Ab wheel", "Hanging leg raise", "Lunge"], totalReps: { min: 50, max: 75 } },
    ]);
  });

  it("falls back to the Agile 8 for warmupCircuit — this template prints no circuit of its own", () => {
    const leaderRun = buildMainCycleSessions(original531Template, "leader", liftMap, program, 1, 0, 1);
    expect(leaderRun.sessions[0].warmupCircuit.length).toBeGreaterThan(0);
    expect(leaderRun.sessions[0].warmupCircuit[0]).toEqual({ name: "IT band foam roll", sets: 1, reps: "10-15 passes per leg" });
  });
});

describe("original-531 — self-pairing as Leader and Anchor", () => {
  // docs/templates/original-531.md "Pairings named in the source": the
  // book's own answer to running Original 5/3/1 as both a Leader and an
  // Anchor is this template feeding into itself. A 2+1 program with
  // original-531 as both leaderTemplateId and anchorTemplateId must
  // therefore generate a full plan end to end, not dead-end at setup.
  const selfPairedProgram: Program = {
    ...program,
    anchorTemplateId: "original-531",
    deloadTrainingDays: 4,
  };

  it("generates a full plan without throwing", () => {
    expect(() => generatePlan(lifts, selfPairedProgram)).not.toThrow();
  });

  it("role-keys assistance between the Leader and Anchor cycles — same template, different volume", () => {
    const plan = generatePlan(lifts, selfPairedProgram);
    const leaderMainSessions = plan.sessions.filter((s) => s.cycleNumber <= 2 && s.lifts[0]?.step.kind === "main");
    const anchorMainSessions = plan.sessions.filter((s) => s.cycleNumber === 3 && s.lifts[0]?.step.kind === "main");

    expect(leaderMainSessions.length).toBeGreaterThan(0);
    expect(anchorMainSessions.length).toBeGreaterThan(0);
    expect(leaderMainSessions[0].assistance).toEqual([
      { category: "push", exerciseOptions: ["Dip", "Push-up", "Overhead triceps extension"], totalReps: { min: 100, max: 100 } },
      { category: "pull", exerciseOptions: ["Row", "Chin-up"], totalReps: { min: 100, max: 100 } },
      { category: "single-leg-core", exerciseOptions: ["Ab wheel", "Hanging leg raise", "Lunge"], totalReps: { min: 100, max: 100 } },
    ]);
    expect(anchorMainSessions[0].assistance).toEqual([
      { category: "push", exerciseOptions: ["Dip", "Push-up", "Overhead triceps extension"], totalReps: { min: 50, max: 75 } },
      { category: "pull", exerciseOptions: ["Row", "Chin-up"], totalReps: { min: 50, max: 75 } },
      { category: "single-leg-core", exerciseOptions: ["Ab wheel", "Hanging leg raise", "Lunge"], totalReps: { min: 50, max: 75 } },
    ]);

    // Main work percentages are unchanged between the two phases — only
    // assistance differs (docs/templates/original-531.md "What the family
    // shares").
    const leaderSquat = leaderMainSessions.find((s) => s.lifts[0].liftKey === "squat")!.lifts[0].mainWork;
    const anchorSquat = anchorMainSessions.find((s) => s.lifts[0].liftKey === "squat")!.lifts[0].mainWork;
    expect(anchorSquat.map((s) => s.tmPercentage)).toEqual(leaderSquat.map((s) => s.tmPercentage));
  });
});

describe("original-531 — no supplemental work", () => {
  it("every session's supplemental is empty", () => {
    const { sessions } = buildMainCycleSessions(original531Template, "leader", liftMap, program, 1, 0, 1);
    for (const session of sessions) {
      for (const entry of session.lifts) {
        expect(entry.supplemental).toEqual([]);
      }
    }
  });
});
