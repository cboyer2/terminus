import { describe, expect, it } from "vitest";

import { buildMainCycleSessions, generatePlan, liftsByKey } from "../cycles";
import { bbbChallengeTemplate } from "../templates/bbb-challenge";
import { bbbFullBodyTemplate } from "../templates/bbb-full-body";
import { bbbMixedTemplate } from "../templates/bbb-mixed";
import { bbbTwoLiftTemplate } from "../templates/bbb-two-lift";
import type { Lift, LiftKey, Program, Session, SessionLiftEntry, Template } from "../types";

/**
 * Frozen fixtures for bbb-mixed, bbb-two-lift, bbb-full-body and
 * bbb-challenge, hand-checked against the Boring But Big chapter of "5/3/1
 * Forever" (pp. 51-57). Seeds are multiples of 100 so cycle-0 percentages
 * land on exact 5 lb marks; later-cycle values are rounded by hand to the
 * nearest 5, ties up.
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

function runCycle(template: Template, options: Record<string, unknown> = {}, trainingDays: 3 | 4 = 4, cycleIndex = 0): Session[] {
  return buildMainCycleSessions(template, "leader", liftMap, program(template, options, trainingDays), 1, cycleIndex, 1).sessions;
}

/** "sets x reps @ weight" for every supplemental group, compact for fixtures. */
function supplementalLine(entry: SessionLiftEntry): string {
  if (entry.supplemental.length === 0) return "none";
  const parts: string[] = [];
  for (const set of entry.supplemental) {
    const text = `${set.reps}@${set.workingWeight}`;
    const last = parts[parts.length - 1];
    const match = last?.match(/^(\d+)x(.*)$/);
    if (match && match[2] === text) parts[parts.length - 1] = `${Number(match[1]) + 1}x${text}`;
    else parts.push(`1x${text}`);
  }
  return parts.join(", ");
}

function entriesFor(sessions: Session[], liftKey: LiftKey): SessionLiftEntry[] {
  return sessions.flatMap((s) => s.lifts).filter((e) => e.liftKey === liftKey);
}

describe("bbb-mixed", () => {
  it("is Leader-only and four days only, in the printed Squat/Press/Deadlift/Bench order", () => {
    expect(bbbMixedTemplate.supportedDayCounts).toEqual([4]);
    const sessions = runCycle(bbbMixedTemplate);
    expect(sessions.slice(0, 4).map((s) => s.lifts[0].liftKey)).toEqual(["squat", "press", "deadlift", "bench"]);
  });

  it("default: BBB 5x10 @ 50% on squat and bench, 5x5 FSL on press and deadlift", () => {
    const sessions = runCycle(bbbMixedTemplate);
    expect(entriesFor(sessions, "squat").map(supplementalLine)).toEqual(["5x10@200", "5x10@200", "5x10@200"]);
    expect(entriesFor(sessions, "bench").map(supplementalLine)).toEqual(["5x10@100", "5x10@100", "5x10@100"]);
    // FSL tracks the classic first set: 65 / 70 / 75%.
    expect(entriesFor(sessions, "press").map(supplementalLine)).toEqual(["5x5@195", "5x5@210", "5x5@225"]);
    expect(entriesFor(sessions, "deadlift").map(supplementalLine)).toEqual(["5x5@325", "5x5@350", "5x5@375"]);
  });

  it("deadlift + press layout swaps which lifts get BBB", () => {
    const sessions = runCycle(bbbMixedTemplate, { supplementalScheme: "deadliftPress" });
    expect(supplementalLine(entriesFor(sessions, "deadlift")[0])).toBe("5x10@250");
    expect(supplementalLine(entriesFor(sessions, "press")[0])).toBe("5x10@150");
    expect(supplementalLine(entriesFor(sessions, "squat")[0])).toBe("5x5@260");
    expect(supplementalLine(entriesFor(sessions, "bench")[0])).toBe("5x5@130");
  });

  it("BBB percentage is settable per lift", () => {
    const sessions = runCycle(bbbMixedTemplate, { supplementalPercentageByLift: { squat: 0.4 } });
    expect(supplementalLine(entriesFor(sessions, "squat")[0])).toBe("5x10@160");
  });
});

describe("bbb-two-lift", () => {
  it("default: squat 5x10 on squat and deadlift days, bench 5x10 on both pressing days", () => {
    const sessions = runCycle(bbbTwoLiftTemplate);
    const [squat, press, deadlift, bench] = sessions.slice(0, 4).map((s) => s.lifts[0]);
    expect([squat.supplementalLiftKey, supplementalLine(squat)]).toEqual(["squat", "5x10@200"]);
    expect([press.supplementalLiftKey, supplementalLine(press)]).toEqual(["bench", "5x10@100"]);
    expect([deadlift.supplementalLiftKey, supplementalLine(deadlift)]).toEqual(["squat", "5x10@200"]);
    expect([bench.supplementalLiftKey, supplementalLine(bench)]).toEqual(["bench", "5x10@100"]);
    // Main work is still the day's own lift.
    expect(deadlift.mainWork.map((s) => s.workingWeight)).toEqual([325, 375, 425]);
  });

  it("press layout: press 5x10 on both pressing days", () => {
    const sessions = runCycle(bbbTwoLiftTemplate, { supplementalScheme: "squatPress" });
    const bench = sessions[3].lifts[0];
    expect([bench.supplementalLiftKey, supplementalLine(bench)]).toEqual(["press", "5x10@150"]);
    expect(sessions[1].lifts[0].supplementalLiftKey).toBe("press");
  });

  it("percentage is per day: a lighter squat on deadlift day leaves squat day alone", () => {
    const sessions = runCycle(bbbTwoLiftTemplate, { supplementalPercentageByLift: { deadlift: 0.4 } });
    expect(supplementalLine(sessions[2].lifts[0])).toBe("5x10@160");
    expect(supplementalLine(sessions[0].lifts[0])).toBe("5x10@200");
  });

  it("deadlift-day squat work follows squat's own training max across cycles", () => {
    // Cycle index 1: squat TM 410, 50% = 205.
    const sessions = runCycle(bbbTwoLiftTemplate, {}, 4, 1);
    expect(supplementalLine(sessions[2].lifts[0])).toBe("5x10@205");
  });

  it("never applies Original BBB's opposite-lift toggle", () => {
    const sessions = runCycle(bbbTwoLiftTemplate, { supplementalOppositeLift: true });
    expect(sessions[0].lifts[0].supplementalLiftKey).toBe("squat");
  });
});

describe("bbb-full-body (4 days)", () => {
  const sessions = runCycle(bbbFullBodyTemplate);

  it("runs 12 sessions, two lifts each", () => {
    expect(sessions).toHaveLength(12);
    expect(sessions.every((s) => s.lifts.length === 2)).toBe(true);
  });

  it("week one: Deadlift + Bench 5x10, Squat 5x10 + Press, Squat + Press 5x10, Deadlift 5x10 + Bench", () => {
    const week = sessions.slice(0, 4).map((s) =>
      s.lifts.map((e) => `${e.liftKey}:${e.mainWork.length > 0 ? e.mainWork.map((m) => m.workingWeight).join("/") : "-"}:${supplementalLine(e)}`)
    );
    expect(week).toEqual([
      ["deadlift:350/400/450:none", "bench:-:5x10@100"],
      ["squat:-:5x10@200", "press:210/240/270:none"],
      ["squat:280/320/360:none", "press:-:5x10@150"],
      ["deadlift:-:5x10@250", "bench:140/160/180:none"],
    ]);
  });

  it("supplemental-only entries carry no warm-up", () => {
    expect(sessions[0].lifts[1].warmupSets).toEqual([]);
    expect(sessions[0].lifts[0].warmupSets).toHaveLength(3);
  });

  it("each lift gets three main appearances, one per progression step", () => {
    for (const liftKey of ["squat", "bench", "deadlift", "press"] as const) {
      const main = entriesFor(sessions, liftKey).filter((e) => e.mainWork.length > 0);
      expect(main.map((e) => e.step)).toEqual([0, 1, 2].map((index) => ({ kind: "main", index })));
    }
  });
});

describe("bbb-full-body (3 days)", () => {
  const sessions = runCycle(bbbFullBodyTemplate, {}, 3);

  it("follows A/B/C, D/A/B, C/D/A, then B/C/D to complete the rotation", () => {
    expect(sessions).toHaveLength(12);
    const mainLift = (s: Session) => s.lifts.find((e) => e.mainWork.length > 0)!.liftKey;
    // A = deadlift main, B = press main, C = bench main, D = squat main.
    expect(sessions.map(mainLift)).toEqual([
      "deadlift", "press", "bench",
      "squat", "deadlift", "press",
      "bench", "squat", "deadlift",
      "press", "bench", "squat",
    ]);
  });

  it("each lift's main work steps through 1-2-3 by its own appearances", () => {
    const deadliftMain = entriesFor(sessions, "deadlift").filter((e) => e.mainWork.length > 0);
    expect(deadliftMain.map((e) => e.mainWork.map((m) => m.workingWeight))).toEqual([
      [350, 400, 450],
      [325, 375, 425],
      [375, 425, 475],
    ]);
  });

  it("supplemental appearances don't advance the step", () => {
    // Deadlift is supplemental-only in C (sessions 3, 7, 11); it still has
    // exactly three main appearances.
    const deadlift = entriesFor(sessions, "deadlift");
    expect(deadlift.filter((e) => e.mainWork.length === 0).map(supplementalLine)).toEqual(["5x10@250", "5x10@250", "5x10@250"]);
    expect(deadlift.filter((e) => e.mainWork.length > 0)).toHaveLength(3);
  });
});

describe("bbb-challenge", () => {
  const challengeProgram: Program = {
    programmingModel: "challenge",
    leaderTrainingDays: 4,
    anchorTrainingDays: null,
    deloadTrainingDays: null,
    tmTestTrainingDays: 4,
    leaderTemplateId: "bbb-challenge",
    anchorTemplateId: null,
    tmPercentage: 0.85,
    options: {},
  };
  const plan = generatePlan(lifts, challengeProgram);

  it("runs only under the Challenge model, as a standalone template", () => {
    expect(bbbChallengeTemplate.programmingModels).toEqual(["challenge"]);
    expect(bbbChallengeTemplate.roleEligibility).toBe("neither");
  });

  it("opening TM test, three cycles, closing TM test — no deload", () => {
    // 4 + 3 x 12 + 4
    expect(plan.sessions).toHaveLength(44);
    expect(plan.sessions.some((s) => s.lifts[0].step.kind === "deload")).toBe(false);
  });

  it("supplemental rises by cycle: 50%, 60%, 70%", () => {
    const squatSupplemental = (cycleNumber: number) =>
      plan.sessions
        .filter((s) => s.cycleNumber === cycleNumber && s.lifts[0].step.kind === "main" && s.lifts[0].liftKey === "squat")
        .map((s) => supplementalLine(s.lifts[0]));
    // TM 400 / 410 / 420: 200, 246 -> 245, 294 -> 295.
    expect(squatSupplemental(1)).toEqual(["5x10@200", "5x10@200", "5x10@200"]);
    expect(squatSupplemental(2)).toEqual(["5x10@245", "5x10@245", "5x10@245"]);
    expect(squatSupplemental(3)).toEqual(["5x10@295", "5x10@295", "5x10@295"]);
  });

  it("5's Progression, no PR set", () => {
    const main = plan.sessions.filter((s) => s.lifts[0].step.kind === "main").flatMap((s) => s.lifts[0].mainWork);
    expect(main.every((set) => set.reps === 5 && !set.isPrSet)).toBe(true);
  });
});
