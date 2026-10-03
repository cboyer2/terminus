import { describe, expect, it } from "vitest";

import { buildMainCycleSessions, generatePlan, liftsByKey } from "../cycles";
import { original531AbTemplate } from "../templates/original-531-ab";
import type { Lift, Program } from "../types";

/**
 * Frozen fixture for original-531-ab, hand-checked against
 * docs/templates/original-531.md's A/B session table. Same seeds as
 * cycles.original-531.fixture.test.ts on purpose — the owner confirmed this
 * template shares its percentages with the canonical program, so identical
 * seeds should produce identical working weights; only the session grouping
 * (two lifts per session, spread across 6 sessions/2 calendar weeks instead
 * of 4 sessions/3 calendar weeks) differs.
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
  leaderTrainingDays: 3,
  anchorTrainingDays: 3,
  deloadTrainingDays: null,
  tmTestTrainingDays: 3,
  leaderTemplateId: "original-531-ab",
  anchorTemplateId: null,
  tmPercentage: 0.9,
  options: {},
};

describe("original-531-ab — session shape", () => {
  it("produces 6 sessions: A/B/A/B/A/B, two lifts each, per docs/templates/original-531.md's table", () => {
    const { sessions } = buildMainCycleSessions(original531AbTemplate, "leader", liftMap, program, 1, 0, 1);
    expect(sessions).toHaveLength(6);

    expect(sessions.map((s) => s.lifts.map((l) => l.liftKey))).toEqual([
      ["squat", "bench"],
      ["deadlift", "press"],
      ["squat", "bench"],
      ["deadlift", "press"],
      ["squat", "bench"],
      ["deadlift", "press"],
    ]);
  });

  it("squat and bench always share a progression step — fives, then threes, then 5/3/1", () => {
    const { sessions } = buildMainCycleSessions(original531AbTemplate, "leader", liftMap, program, 1, 0, 1);
    const squatBenchSessions = sessions.filter((s) => s.lifts[0].liftKey === "squat");
    expect(squatBenchSessions.map((s) => s.lifts[0].step)).toEqual([
      { kind: "main", index: 0 },
      { kind: "main", index: 1 },
      { kind: "main", index: 2 },
    ]);
    // Bench sits alongside squat in every one of those same sessions.
    expect(squatBenchSessions.map((s) => s.lifts[1].step)).toEqual(squatBenchSessions.map((s) => s.lifts[0].step));
  });
});

describe("original-531-ab — main work", () => {
  it("shares its percentages and PR-set placement with original-531's canonical scheme", () => {
    const { sessions } = buildMainCycleSessions(original531AbTemplate, "leader", liftMap, program, 1, 0, 1);

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

    const deadliftMainWork = sessions.filter((s) => s.lifts[0].liftKey === "deadlift").map((s) => s.lifts[0].mainWork);
    expect(deadliftMainWork.map((week) => week.map((set) => set.workingWeight))).toEqual([
      [325, 375, 425],
      [350, 400, 450],
      [375, 425, 475],
    ]);
  });
});

describe("original-531-ab — assistance profile option", () => {
  it("defaults to 50-100 reps per category (flat profile)", () => {
    const { sessions } = buildMainCycleSessions(original531AbTemplate, "leader", liftMap, program, 1, 0, 1);
    expect(sessions[0].assistance).toEqual([
      { category: "push", exerciseOptions: ["Dip", "Push-up", "Overhead triceps extension"], totalReps: { min: 50, max: 100 } },
      { category: "pull", exerciseOptions: ["Row", "Chin-up"], totalReps: { min: 50, max: 100 } },
      { category: "single-leg-core", exerciseOptions: ["Ab wheel", "Hanging leg raise", "Lunge"], totalReps: { min: 50, max: 100 } },
    ]);
  });

  it("program.options.assistanceProfile = 'roleKeyed' gives 100 reps as Leader", () => {
    const roleKeyedProgram: Program = { ...program, options: { assistanceProfile: "roleKeyed" } };
    const { sessions } = buildMainCycleSessions(original531AbTemplate, "leader", liftMap, roleKeyedProgram, 1, 0, 1);
    expect(sessions[0].assistance).toEqual([
      { category: "push", exerciseOptions: ["Dip", "Push-up", "Overhead triceps extension"], totalReps: { min: 100, max: 100 } },
      { category: "pull", exerciseOptions: ["Row", "Chin-up"], totalReps: { min: 100, max: 100 } },
      { category: "single-leg-core", exerciseOptions: ["Ab wheel", "Hanging leg raise", "Lunge"], totalReps: { min: 100, max: 100 } },
    ]);
  });

  // original-531-ab's own roleEligibility is "leader" — it's never itself
  // built with role="anchor". But this exact resolution (this template's
  // assistance, in the "anchor" role) is genuinely reached in a real plan:
  // generatePlan passes original-531-ab as the assistanceSourceTemplate
  // when building original-531's own Anchor cycles, per
  // anchorAssistanceFollowsLeader — see the "generatePlan" describe block
  // below for the end-to-end version of this.
  it("program.options.assistanceProfile = 'roleKeyed' resolves to 50-75 reps in the anchor role", () => {
    const roleKeyedProgram: Program = { ...program, options: { assistanceProfile: "roleKeyed" } };
    const { sessions } = buildMainCycleSessions(original531AbTemplate, "anchor", liftMap, roleKeyedProgram, 1, 0, 1);
    expect(sessions[0].assistance).toEqual([
      { category: "push", exerciseOptions: ["Dip", "Push-up", "Overhead triceps extension"], totalReps: { min: 50, max: 75 } },
      { category: "pull", exerciseOptions: ["Row", "Chin-up"], totalReps: { min: 50, max: 75 } },
      { category: "single-leg-core", exerciseOptions: ["Ab wheel", "Hanging leg raise", "Lunge"], totalReps: { min: 50, max: 75 } },
    ]);
  });
});

describe("generatePlan — original-531-ab (Leader) -> original-531 (Anchor)", () => {
  // The book's four printed Leader/Anchor assistance pairings for this
  // family (docs/templates/original-531.md "Options") — original-531's own
  // Anchor-cycle assistance depends on which Leader (and, for A/B, which of
  // its own two profiles) just ran, per anchorAssistanceFollowsLeader. Only
  // original-531-ab's two pairings are exercised end-to-end here; canonical
  // original-531's self-pairing is covered by
  // cycles.original-531.fixture.test.ts's own "self-pairing" describe
  // block, and original-531-10rep's pairing by
  // cycles.original-531-10rep.fixture.test.ts.
  const pairedProgram: Program = {
    ...program,
    anchorTemplateId: "original-531",
    anchorTrainingDays: 4,
    deloadTrainingDays: 3,
  };

  it("A/B's flat profile (the default): original-531's Anchor cycles get 50-100 reps, not its own 50-75 default", () => {
    const plan = generatePlan(lifts, pairedProgram);
    const anchorMainSessions = plan.sessions.filter((s) => s.cycleNumber === 3 && s.lifts[0]?.step.kind === "main");
    expect(anchorMainSessions.length).toBeGreaterThan(0);
    expect(anchorMainSessions[0].assistance).toEqual([
      { category: "push", exerciseOptions: ["Dip", "Push-up", "Overhead triceps extension"], totalReps: { min: 50, max: 100 } },
      { category: "pull", exerciseOptions: ["Row", "Chin-up"], totalReps: { min: 50, max: 100 } },
      { category: "single-leg-core", exerciseOptions: ["Ab wheel", "Hanging leg raise", "Lunge"], totalReps: { min: 50, max: 100 } },
    ]);
  });

  it("A/B's roleKeyed profile: original-531's Anchor cycles get 50-75 reps, matching its own default", () => {
    const plan = generatePlan(lifts, { ...pairedProgram, options: { assistanceProfile: "roleKeyed" } });
    const anchorMainSessions = plan.sessions.filter((s) => s.cycleNumber === 3 && s.lifts[0]?.step.kind === "main");
    expect(anchorMainSessions.length).toBeGreaterThan(0);
    expect(anchorMainSessions[0].assistance).toEqual([
      { category: "push", exerciseOptions: ["Dip", "Push-up", "Overhead triceps extension"], totalReps: { min: 50, max: 75 } },
      { category: "pull", exerciseOptions: ["Row", "Chin-up"], totalReps: { min: 50, max: 75 } },
      { category: "single-leg-core", exerciseOptions: ["Ab wheel", "Hanging leg raise", "Lunge"], totalReps: { min: 50, max: 75 } },
    ]);
  });

  it("original-531's own main work is untouched by anchorAssistanceFollowsLeader — only assistance is sourced from the Leader", () => {
    const plan = generatePlan(lifts, pairedProgram);
    const anchorSquat = plan.sessions.find((s) => s.cycleNumber === 3 && s.lifts[0]?.liftKey === "squat" && s.lifts[0].step.kind === "main")!.lifts[0]
      .mainWork;
    expect(anchorSquat.map((s) => s.tmPercentage)).toEqual([0.65, 0.75, 0.85]);
  });
});

describe("original-531-ab — jumps/throws and no supplemental work", () => {
  it("10 total reps, two main lifts per session", () => {
    const { sessions } = buildMainCycleSessions(original531AbTemplate, "leader", liftMap, program, 1, 0, 1);
    expect(sessions[0].jumpsOrThrows).toEqual({ totalReps: { min: 10, max: 10 }, guidance: "Two main lifts per session — use the low end of the family's range." });
  });

  it("every session's supplemental is empty", () => {
    const { sessions } = buildMainCycleSessions(original531AbTemplate, "leader", liftMap, program, 1, 0, 1);
    for (const session of sessions) {
      for (const entry of session.lifts) {
        expect(entry.supplemental).toEqual([]);
      }
    }
  });
});
