// Composes stored lifts + a program selection into a derived Plan.
// (lifts, program) => Plan — the one function the rest of the app calls.
// See docs/ARCHITECTURE.md §2.

import { trainingMax, workingWeight } from "./calc";
import { getTemplate } from "./templates";
import {
  type Lift,
  type LiftKey,
  type MainWorkBase,
  type MainWorkScheme,
  type MainWorkSet,
  type PlannedSet,
  type Plan,
  type Program,
  type Session,
  type SessionLiftEntry,
  type Supplemental,
  type SupplementalPrescription,
  type Template,
  type TemplateRole,
  PROGRAMMING_MODELS,
  resolveByRole,
} from "./types";

function effectivePercentage(lift: Lift, program: Program): number {
  return lift.tmPercentageOverride ?? program.tmPercentage;
}

// docs/templates/boring-but-big.md, bbb-original "Options": "Supplemental
// lift: same as main · opposite — Original permits the opposite lift, bench
// main press supplemental." Program-wide, not per-lift — see
// program.options.supplementalOppositeLift below — so the pairing is fixed
// rather than user-configurable.
const OPPOSITE_LIFT: Record<LiftKey, LiftKey> = {
  squat: "deadlift",
  deadlift: "squat",
  bench: "press",
  press: "bench",
};

/**
 * Which lift's training max the supplemental weight is computed from.
 * `program.options.supplementalOppositeLift` is a single, program-wide
 * toggle (not per-lift) — turning it on swaps every session's supplemental
 * basis to that session's paired lift.
 */
function supplementalBasisLiftKey(liftKey: LiftKey, options: Record<string, unknown>): LiftKey {
  return options.supplementalOppositeLift === true ? OPPOSITE_LIFT[liftKey] : liftKey;
}

/**
 * Beginner assigns Second Set Last to lifts running the template's lower
 * declared percentage and First Set Last to the higher one (see
 * docs/templates/beginner.md "Options"). The midpoint of the template's
 * declared range is the split point. A template with a fixed percentage, or
 * a plain (non-percentage-keyed) supplemental, never reaches the branch.
 */
function resolveSupplemental(supplemental: Supplemental, percentage: number, template: Template): "none" | SupplementalPrescription {
  if (supplemental === "none") {
    return "none";
  }
  if ("sets" in supplemental) {
    return supplemental;
  }
  if (template.tmPercentage.kind !== "range") {
    throw new Error(`${template.id}: percentage-keyed supplemental requires a percentage range`);
  }
  const midpoint = (template.tmPercentage.min + template.tmPercentage.max) / 2;
  return percentage <= midpoint ? supplemental.atLowerTmPercentage : supplemental.atHigherTmPercentage;
}

/**
 * Resolves a MainWorkScheme for a given role/option combination. The two
 * shapes are told apart by their own distinct key (`byMainWorkBase` vs the
 * `ByRole` union), not by guessing — see the type's doc comment.
 */
function resolveMainWorkScheme(scheme: MainWorkScheme, role: TemplateRole, options: Record<string, unknown>): MainWorkSet[][] {
  if ("byMainWorkBase" in scheme) {
    const base = (options.mainWorkBase as MainWorkBase | undefined) ?? scheme.defaultMainWorkBase;
    return scheme.byMainWorkBase[base];
  }
  return resolveByRole(scheme, role);
}

/**
 * FSL/SSL derive their percentage from the week's own main-work sets.
 * "percentageOfTrainingMax" (BBB's flat scheme) has no such set to derive
 * from, so it falls back to the prescription's own percentage, overridable
 * per lift via `program.options.supplementalPercentageByLift` — BBB's
 * "50-55% recommended, lower for squat/deadlift" guidance (docs/templates/
 * boring-but-big.md "Options").
 */
function supplementalBasisPercentage(
  weekSets: MainWorkSet[],
  prescription: SupplementalPrescription,
  liftKey: LiftKey,
  options: Record<string, unknown>
): number {
  switch (prescription.source) {
    case "firstSetLast":
      return weekSets[0].tmPercentage;
    case "secondSetLast":
      return weekSets[1].tmPercentage;
    case "percentageOfTrainingMax": {
      const overrides = options.supplementalPercentageByLift as Partial<Record<LiftKey, number>> | undefined;
      return overrides?.[liftKey] ?? prescription.percentageOfTrainingMax;
    }
  }
}

export function liftsByKey(lifts: Lift[]): Map<LiftKey, Lift> {
  return new Map(lifts.map((lift) => [lift.liftKey, lift]));
}

function requireLift(lifts: Map<LiftKey, Lift>, liftKey: LiftKey): Lift {
  const lift = lifts.get(liftKey);
  if (!lift) {
    throw new Error(`Missing lift: ${liftKey}`);
  }
  return lift;
}

function buildPlannedSets(scheme: MainWorkSet[], trainingMaxLb: number): PlannedSet[] {
  return scheme.map((set) => ({
    tmPercentage: set.tmPercentage,
    workingWeight: workingWeight(trainingMaxLb, set.tmPercentage),
    reps: set.reps,
    isPrSet: set.isPrSet,
  }));
}

/** A main-work cycle: each workout in the template's session shape steps
 * through every progression step in turn. This is what makes a "week" a
 * progression step rather than a calendar week — see docs/ARCHITECTURE.md
 * "A cycle is three progression steps per lift, not three calendar weeks."
 */
export function buildMainCycleSessions(
  template: Template,
  role: TemplateRole,
  lifts: Map<LiftKey, Lift>,
  program: Program,
  cycleNumber: number,
  cycleIndex: number,
  startingSessionNumber: number
): { sessions: Session[]; nextSessionNumber: number } {
  // The Leader and Anchor phases may run at different day counts (e.g. a
  // 3-day Leader into a 4-day Anchor) — see docs/ARCHITECTURE.md §3.
  const trainingDays = role === "anchor" ? program.anchorTrainingDays : program.leaderTrainingDays;
  if (trainingDays === null) {
    throw new Error(`${template.id}: no training days set for role ${role}`);
  }
  const shapeForDayCount = template.sessionShape[trainingDays];
  if (!shapeForDayCount) {
    throw new Error(`${template.id}: no session shape for ${trainingDays} training days`);
  }
  const shape = resolveByRole(shapeForDayCount, role);
  const mainWorkScheme = resolveMainWorkScheme(template.mainWorkScheme, role, program.options);
  const supplemental = resolveByRole(template.supplemental, role);

  const sessions: Session[] = [];
  let sessionNumber = startingSessionNumber;

  function buildLiftEntry(liftKey: LiftKey, step: 0 | 1 | 2): SessionLiftEntry {
    const weekSets = mainWorkScheme[step];
    const lift = requireLift(lifts, liftKey);
    const tm = trainingMax(lift.trainingMaxSeed, lift.increment, cycleIndex);
    const percentage = effectivePercentage(lift, program);
    const prescription = resolveSupplemental(supplemental, percentage, template);

    const supplementalLiftKey = supplementalBasisLiftKey(liftKey, program.options);

    let supplementalSets: PlannedSet[] = [];
    if (prescription !== "none") {
      const basisPercentage = supplementalBasisPercentage(weekSets, prescription, liftKey, program.options);
      const supplementalLift = supplementalLiftKey === liftKey ? lift : requireLift(lifts, supplementalLiftKey);
      const supplementalTm = trainingMax(supplementalLift.trainingMaxSeed, supplementalLift.increment, cycleIndex);
      const supplementalWeight = workingWeight(supplementalTm, basisPercentage);
      supplementalSets = Array.from({ length: prescription.sets }, () => ({
        tmPercentage: basisPercentage,
        workingWeight: supplementalWeight,
        reps: prescription.reps,
        isPrSet: false,
      }));
    }

    return {
      liftKey,
      step: { kind: "main", index: step },
      mainWork: buildPlannedSets(weekSets, tm),
      supplemental: supplementalSets,
      supplementalLiftKey,
    };
  }

  if ("workouts" in shape) {
    // Fixed shape: every calendar week runs the same workouts, all stepping
    // through the same progression bracket together — the case every
    // template used before bbb-original's 3-day rotation.
    for (let step = 0; step < mainWorkScheme.length; step++) {
      for (const workout of shape.workouts) {
        const liftEntries = workout.liftKeys.map((liftKey) => buildLiftEntry(liftKey, step as 0 | 1 | 2));
        sessions.push({ sessionNumber: sessionNumber++, cycleNumber, lifts: liftEntries });
      }
    }
  } else {
    // Week rotation: a lift's day position — and which progression bracket
    // it uses — depends on the calendar week index, not a shared step
    // counter. Each lift tracks its own appearance count across the whole
    // rotation (docs/templates/boring-but-big.md "Session shape"): its Nth
    // appearance always uses progression step N-1, regardless of which
    // calendar week that appearance falls on. A full rotation is one cycle,
    // however many calendar weeks it spans — every lift still completes
    // exactly `mainWorkScheme.length` appearances by the time it wraps.
    const appearanceCount = new Map<LiftKey, number>();
    for (const weekWorkouts of shape.weeks) {
      for (const workout of weekWorkouts) {
        const liftEntries = workout.liftKeys.map((liftKey) => {
          const step = (appearanceCount.get(liftKey) ?? 0) as 0 | 1 | 2;
          appearanceCount.set(liftKey, step + 1);
          return buildLiftEntry(liftKey, step);
        });
        sessions.push({ sessionNumber: sessionNumber++, cycleNumber, lifts: liftEntries });
      }
    }
  }

  return { sessions, nextSessionNumber: sessionNumber };
}

/** The 7th Week Protocol's own day-count-keyed layout, independent of the
 * template's session shape — see docs/plan-structure.md "Session shape —
 * independent of the template". Two days is schema-legal but unreached: no
 * template yet supports it.
 */
const SEVENTH_WEEK_LAYOUT: Record<2 | 3 | 4, LiftKey[][]> = {
  4: [["squat"], ["bench"], ["deadlift"], ["press"]],
  3: [["squat"], ["bench"], ["deadlift", "press"]],
  2: [
    ["squat", "bench"],
    ["deadlift", "press"],
  ],
};

/** A set within a 7th Week Protocol scheme — deload or TM test. These are
 * plan-wide protocol weeks, not template prescriptions, so they're built
 * straight to this shape rather than routed through MainWorkSet/isPrSet:
 * neither variant is ever a PR set (docs/plan-structure.md: "every variant
 * has no supplemental work and limited assistance", and the book's own
 * tables carry no "+").
 */
interface SeventhWeekSet {
  tmPercentage: number;
  reps: PlannedSet["reps"];
}

/** 70/80/90% for 5 each, then 100% of the training max for a target rep
 * count that depends on the percentage in use — 3 reps at 90%, 5 reps at
 * 85%. See docs/plan-structure.md "Reading the TM test".
 */
function tmTestScheme(percentage: number): SeventhWeekSet[] {
  const targetReps = percentage >= 0.9 ? 3 : 5;
  return [
    { tmPercentage: 0.7, reps: 5 },
    { tmPercentage: 0.8, reps: 5 },
    { tmPercentage: 0.9, reps: 5 },
    { tmPercentage: 1, reps: targetReps },
  ];
}

/** 70/80/90/100% of the training max, working up to a single top set. The
 * second set's "3-5" is a genuine range — see PlannedSet.reps's doc
 * comment for why it isn't collapsed to one number the way the TM test's
 * own range is. Independent of the training max percentage in use, unlike
 * the TM test.
 */
function deloadScheme(): SeventhWeekSet[] {
  return [
    { tmPercentage: 0.7, reps: 5 },
    { tmPercentage: 0.8, reps: { min: 3, max: 5 } },
    { tmPercentage: 0.9, reps: 1 },
    { tmPercentage: 1, reps: 1 },
  ];
}

function buildSeventhWeekPlannedSets(scheme: SeventhWeekSet[], trainingMaxLb: number): PlannedSet[] {
  return scheme.map((set) => ({
    tmPercentage: set.tmPercentage,
    workingWeight: workingWeight(trainingMaxLb, set.tmPercentage),
    reps: set.reps,
    isPrSet: false,
  }));
}

/** Shared builder for both 7th Week Protocol variants this app generates
 * (deload and TM test — PR test stays unmodelled, per PRD §1's "the
 * closing week is always a TM test, never a PR test"). No supplemental
 * work and no template session shape — see docs/plan-structure.md
 * "Session shape — independent of the template".
 */
function buildSeventhWeekSessions(
  stepKind: "deload" | "tmTest",
  schemeForPercentage: (percentage: number) => SeventhWeekSet[],
  trainingDays: 2 | 3 | 4,
  lifts: Map<LiftKey, Lift>,
  program: Program,
  cycleNumber: number,
  cycleIndex: number,
  startingSessionNumber: number
): { sessions: Session[]; nextSessionNumber: number } {
  const layout = SEVENTH_WEEK_LAYOUT[trainingDays];
  let sessionNumber = startingSessionNumber;

  const sessions: Session[] = layout.map((liftKeys) => {
    const liftEntries: SessionLiftEntry[] = liftKeys.map((liftKey) => {
      const lift = requireLift(lifts, liftKey);
      const tm = trainingMax(lift.trainingMaxSeed, lift.increment, cycleIndex);
      const percentage = effectivePercentage(lift, program);
      return {
        liftKey,
        step: { kind: stepKind },
        mainWork: buildSeventhWeekPlannedSets(schemeForPercentage(percentage), tm),
        supplemental: [],
        supplementalLiftKey: liftKey,
      };
    });
    return { sessionNumber: sessionNumber++, cycleNumber, lifts: liftEntries };
  });

  return { sessions, nextSessionNumber: sessionNumber };
}

export function generatePlan(lifts: Lift[], program: Program): Plan {
  const phases = PROGRAMMING_MODELS[program.programmingModel];
  const liftMap = liftsByKey(lifts);
  const sessions: Session[] = [];
  let sessionNumber = 1;
  let cycleNumber = 1;
  let cycleIndex = 0;

  phases.forEach((phase, phaseIndex) => {
    const templateId = phase.role === "anchor" ? program.anchorTemplateId : program.leaderTemplateId;
    if (!templateId) {
      throw new Error(`Missing template id for role: ${phase.role}`);
    }
    const template = getTemplate(templateId);

    for (let i = 0; i < phase.cycles; i++) {
      const built = buildMainCycleSessions(template, phase.role, liftMap, program, cycleNumber, cycleIndex, sessionNumber);
      sessions.push(...built.sessions);
      sessionNumber = built.nextSessionNumber;
      cycleNumber++;
      cycleIndex++;
    }

    // Between every Leader and Anchor phase: a deload, unconditionally —
    // see docs/plan-structure.md "Placement rules". Attached to the phase
    // just completed, at the training max it just finished on.
    const isLastPhase = phaseIndex === phases.length - 1;
    if (!isLastPhase) {
      if (program.deloadTrainingDays === null) {
        throw new Error("Missing deloadTrainingDays for a plan with a phase transition");
      }
      const deload = buildSeventhWeekSessions(
        "deload",
        deloadScheme,
        program.deloadTrainingDays,
        liftMap,
        program,
        cycleNumber - 1,
        cycleIndex - 1,
        sessionNumber
      );
      sessions.push(...deload.sessions);
      sessionNumber = deload.nextSessionNumber;
    }
  });

  const lastCycleNumber = cycleNumber - 1;
  const lastCycleIndex = cycleIndex - 1;
  const tmTest = buildSeventhWeekSessions(
    "tmTest",
    tmTestScheme,
    program.tmTestTrainingDays,
    liftMap,
    program,
    lastCycleNumber,
    lastCycleIndex,
    sessionNumber
  );
  sessions.push(...tmTest.sessions);

  return { sessions };
}
