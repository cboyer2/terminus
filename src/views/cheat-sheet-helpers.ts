// Pure helpers for CheatSheet.svelte — ported unchanged from the old
// app/(tabs)/index.tsx. See docs/ARCHITECTURE.md "A cycle is three
// progression steps per lift, not three calendar weeks" and "Weeks are not
// all the same shape".

import { PROGRAMMING_MODELS } from "../generator/types";
import type { LiftKey, PlannedSet, Program, ProgressionStep, Session } from "../generator/types";
import { LIFT_ORDER } from "../lift-labels";

export function stepLabel(step: ProgressionStep): string {
  switch (step.kind) {
    case "main":
      return `Step ${step.index + 1}`;
    case "deload":
      return "Deload";
    case "tmTest":
      return "TM Test";
    case "prTest":
      return "PR Test";
  }
}

export function repsLabel(reps: PlannedSet["reps"]): string {
  return typeof reps === "number" ? `${reps}` : `${reps.min}-${reps.max}`;
}

function repsEqual(a: PlannedSet["reps"], b: PlannedSet["reps"]): boolean {
  if (typeof a === "number" || typeof b === "number") {
    return a === b;
  }
  return a.min === b.min && a.max === b.max;
}

export interface SetGroup {
  count: number;
  set: PlannedSet;
}

/** Collapses consecutive identical sets into one row. */
export function groupSets(sets: PlannedSet[]): SetGroup[] {
  const groups: SetGroup[] = [];
  for (const set of sets) {
    const last = groups[groups.length - 1];
    const matchesLast =
      last &&
      last.set.tmPercentage === set.tmPercentage &&
      last.set.workingWeight === set.workingWeight &&
      last.set.isPrSet === set.isPrSet &&
      repsEqual(last.set.reps, set.reps);
    if (matchesLast) {
      last.count++;
    } else {
      groups.push({ count: 1, set });
    }
  }
  return groups;
}

/** Flags whichever 7th Week Protocol variant is attached to this cycle. Cycle
 * 0 is the opening TM test — a one-time event, so it gets its own label. */
export function cycleLabel(sessions: Session[], cycleNumber: number): string {
  if (cycleNumber === 0) return "Starting TM Test";
  const stepKinds = new Set(sessions.filter((s) => s.cycleNumber === cycleNumber).map((s) => s.lifts[0]?.step.kind));
  if (stepKinds.has("tmTest")) return `Cycle ${cycleNumber} + TM Test`;
  if (stepKinds.has("deload")) return `Cycle ${cycleNumber} + Deload`;
  return `Cycle ${cycleNumber}`;
}

export interface CycleTrainingMax {
  liftKey: LiftKey;
  trainingMax: number;
}

/** Each lift's training max for one cycle, in LIFT_ORDER — read straight off
 * the generated plan, never recomputed here. A lift has one TM per cycle
 * (see SessionLiftEntry.trainingMax), so its first appearance is enough. */
export function cycleTrainingMaxes(sessions: Session[], cycleNumber: number): CycleTrainingMax[] {
  const byLift = new Map<LiftKey, number>();
  for (const session of sessions) {
    if (session.cycleNumber !== cycleNumber) continue;
    for (const entry of session.lifts) {
      if (!byLift.has(entry.liftKey)) byLift.set(entry.liftKey, entry.trainingMax);
    }
  }
  return LIFT_ORDER.filter((liftKey) => byLift.has(liftKey)).map((liftKey) => ({ liftKey, trainingMax: byLift.get(liftKey)! }));
}

function chunkIntoWeeks(sessions: Session[], sessionsPerWeek: number): Session[][] {
  const weeks: Session[][] = [];
  for (let i = 0; i < sessions.length; i += sessionsPerWeek) {
    weeks.push(sessions.slice(i, i + sessionsPerWeek));
  }
  return weeks;
}

/** Which programming-model phase a cycle number belongs to — Leader (or
 * standalone, for Beginner) vs Anchor. */
export function isAnchorCycle(cycleNumber: number, programmingModel: Program["programmingModel"]): boolean {
  const phases = PROGRAMMING_MODELS[programmingModel];
  const leaderPhase = phases.find((p) => p.role !== "anchor");
  return cycleNumber > (leaderPhase?.cycles ?? 0);
}

export function phaseLabel(session: Session, program: Program): string {
  const kind = session.lifts[0]?.step.kind;
  if (kind === "deload" || kind === "tmTest" || kind === "prTest") return "7th Week Protocol";
  if (program.programmingModel === "beginner") return "Beginner";
  return isAnchorCycle(session.cycleNumber, program.programmingModel) ? "Anchor" : "Leader";
}

/** Templates define their own assistance category strings freely, so this is
 * a light formatting pass, not a lookup table keyed to a closed set. */
export function formatCategory(category: string): string {
  const spaced = category.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Collapses a {min,max} rep range to a single number when they're equal. */
export function totalRepsLabel(totalReps: { min: number; max: number }): string {
  return totalReps.min === totalReps.max ? `${totalReps.min}` : `${totalReps.min}-${totalReps.max}`;
}

/** Chunks one cycle's sessions into calendar weeks, honouring that a cycle
 * bucket can mix two day counts: its main-work sessions (whichever phase
 * this cycle belongs to) and, trailing them, an optional 7th Week Protocol
 * block at its own independent day count. */
export function chunkCycleIntoWeeks(cycleSessions: Session[], cycleNumber: number, program: Program): Session[][] {
  const mainSessions = cycleSessions.filter((s) => s.lifts[0]?.step.kind === "main");
  const seventhWeekSessions = cycleSessions.filter((s) => s.lifts[0]?.step.kind !== "main");
  const mainSessionsPerWeek =
    (isAnchorCycle(cycleNumber, program.programmingModel) ? program.anchorTrainingDays : program.leaderTrainingDays) ??
    program.leaderTrainingDays;
  const seventhWeekKind = seventhWeekSessions[0]?.lifts[0]?.step.kind;
  const seventhWeekSessionsPerWeek =
    (seventhWeekKind === "deload" ? program.deloadTrainingDays : program.tmTestTrainingDays) ?? program.tmTestTrainingDays;
  return [...chunkIntoWeeks(mainSessions, mainSessionsPerWeek), ...chunkIntoWeeks(seventhWeekSessions, seventhWeekSessionsPerWeek)];
}
