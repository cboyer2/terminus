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

function program(options: Record<string, unknown> = {}): Program {
  return {
    programmingModel: "2+1",
    trainingDays: 4,
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
});
