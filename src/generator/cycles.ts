// Composes stored lifts + a program selection into a derived Plan.
// (lifts, program) => Plan — the one function the rest of the app calls.
// See docs/ARCHITECTURE.md §2.

import { trainingMax, workingWeight } from "./calc";
import { getTemplate } from "./templates";
import {
  type AssistancePrescription,
  type AssistanceProfile,
  type AssistanceTarget,
  type Conditioning,
  type JumpsOrThrows,
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
  type WarmupExercise,
  PROGRAMMING_MODELS,
  resolveByRole,
} from "./types";

function effectivePercentage(lift: Lift, program: Program): number {
  return lift.tmPercentageOverride ?? program.tmPercentage;
}

/**
 * Joe DeFranco's "Agile 8" — the owner's chosen default warm-up/mobility
 * circuit for whenever a role has no printed circuit of its own.
 * `bbb-original` and `original-531` both declare an empty `warmup` for
 * every role today, and the 7th Week Protocol never has one either
 * (independent of whichever template is running the surrounding phase) —
 * see `resolveWarmup` below.
 */
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

/** Falls back to the Agile 8 whenever a template's own role-resolved
 * warmup circuit is empty. */
function resolveWarmup(circuit: WarmupExercise[]): WarmupExercise[] {
  return circuit.length > 0 ? circuit : AGILE_8;
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
 *
 * `program.options.supplementalSourceByLift` overrides the derived default
 * per lift — Beginner's stall remedy 5, "switch to SSL" (docs/templates/
 * beginner.md "Stall"). A lift with no override falls back to the
 * percentage-derived choice, same as before this option existed.
 */
function resolveSupplemental(
  supplemental: Supplemental,
  percentage: number,
  template: Template,
  liftKey: LiftKey,
  options: Record<string, unknown>
): "none" | SupplementalPrescription {
  if (supplemental === "none") {
    return "none";
  }
  if ("sets" in supplemental) {
    return supplemental;
  }
  const sourceOverrides = options.supplementalSourceByLift as Partial<Record<LiftKey, "firstSetLast" | "secondSetLast">> | undefined;
  const sourceOverride = sourceOverrides?.[liftKey];
  if (sourceOverride === "firstSetLast") return supplemental.atHigherTmPercentage;
  if (sourceOverride === "secondSetLast") return supplemental.atLowerTmPercentage;
  if (template.tmPercentage.kind !== "range") {
    throw new Error(`${template.id}: percentage-keyed supplemental requires a percentage range`);
  }
  const midpoint = (template.tmPercentage.min + template.tmPercentage.max) / 2;
  return percentage <= midpoint ? supplemental.atLowerTmPercentage : supplemental.atHigherTmPercentage;
}

/**
 * Beginner's stall remedy 2, "push the last set for a PR or goal" (docs/
 * templates/beginner.md "Stall") — forces the final set of a progression
 * step's main work to a PR set, per lift via
 * `program.options.prSetOnFinalSetByLift`. A copy, not a mutation: the
 * underlying MainWorkSet[] is shared template data, reused across every
 * cycle and every lift that doesn't have this option on.
 */
function applyFinalSetPr(weekSets: MainWorkSet[]): MainWorkSet[] {
  if (weekSets.length === 0) return weekSets;
  return weekSets.map((set, i) => (i === weekSets.length - 1 ? { ...set, isPrSet: true } : set));
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
 * Resolves an AssistancePrescription for a given role/option combination —
 * same shape as resolveMainWorkScheme, one level up (the profile choice picks
 * a ByRole<AssistanceTarget[]>, which then still resolves by role).
 */
function resolveAssistance(assistance: AssistancePrescription, role: TemplateRole, options: Record<string, unknown>): AssistanceTarget[] {
  if ("byAssistanceProfile" in assistance) {
    const profile = (options.assistanceProfile as AssistanceProfile | undefined) ?? assistance.defaultAssistanceProfile;
    return resolveByRole(assistance.byAssistanceProfile[profile], role);
  }
  return resolveByRole(assistance, role);
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

/**
 * Fixed across every template, before main work only — see
 * docs/plan-structure.md "Warm-up sets". Applies identically to a regular
 * main-work session and a 7th Week Protocol session; only the training max
 * it's a percentage of ever changes.
 */
const WARMUP_SET_SCHEME: { tmPercentage: number; reps: number }[] = [
  { tmPercentage: 0.4, reps: 5 },
  { tmPercentage: 0.5, reps: 5 },
  { tmPercentage: 0.6, reps: 3 },
];

function buildWarmupSets(trainingMaxLb: number): PlannedSet[] {
  return WARMUP_SET_SCHEME.map(({ tmPercentage, reps }) => ({
    tmPercentage,
    workingWeight: workingWeight(trainingMaxLb, tmPercentage),
    reps,
    isPrSet: false,
  }));
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
  startingSessionNumber: number,
  // Defaults to `template` — only generatePlan's phase loop ever passes
  // something else, when the just-completed Leader declares
  // anchorAssistanceFollowsLeader (see that field's doc comment in
  // types.ts). Every other prescription field still resolves from
  // `template` itself; only assistance can come from elsewhere.
  assistanceSourceTemplate: Template = template
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

  // Per-workout, not per-progression-step — identical for every session
  // this call builds, so resolved once rather than inside buildLiftEntry.
  const assistance = resolveAssistance(assistanceSourceTemplate.assistance, role, program.options);
  const jumpsOrThrows = resolveByRole(template.jumpsOrThrows, role);
  const warmupCircuit = resolveWarmup(resolveByRole(template.warmup, role));
  const conditioning = resolveByRole(template.conditioning, role);

  const sessions: Session[] = [];
  let sessionNumber = startingSessionNumber;

  function buildLiftEntry(liftKey: LiftKey, step: 0 | 1 | 2): SessionLiftEntry {
    const weekSets = mainWorkScheme[step];
    const lift = requireLift(lifts, liftKey);
    const tm = trainingMax(lift.trainingMaxSeed, lift.increment, cycleIndex);
    const percentage = effectivePercentage(lift, program);
    const prescription = resolveSupplemental(supplemental, percentage, template, liftKey, program.options);

    const prSetOverrides = program.options.prSetOnFinalSetByLift as Partial<Record<LiftKey, boolean>> | undefined;
    const effectiveWeekSets = prSetOverrides?.[liftKey] ? applyFinalSetPr(weekSets) : weekSets;

    const supplementalLiftKey = supplementalBasisLiftKey(liftKey, program.options);

    let supplementalSets: PlannedSet[] = [];
    if (prescription !== "none") {
      const basisPercentage = supplementalBasisPercentage(effectiveWeekSets, prescription, liftKey, program.options);
      const supplementalLift = supplementalLiftKey === liftKey ? lift : requireLift(lifts, supplementalLiftKey);
      const supplementalTm = trainingMax(supplementalLift.trainingMaxSeed, supplementalLift.increment, cycleIndex);
      const supplementalWeight = workingWeight(supplementalTm, basisPercentage);
      const setCountOverrides = program.options.supplementalSetCountByLift as Partial<Record<LiftKey, number>> | undefined;
      const effectiveSets = setCountOverrides?.[liftKey] ?? prescription.sets;
      supplementalSets = Array.from({ length: effectiveSets }, () => ({
        tmPercentage: basisPercentage,
        workingWeight: supplementalWeight,
        reps: prescription.reps,
        isPrSet: false,
      }));
    }

    return {
      liftKey,
      step: { kind: "main", index: step },
      trainingMax: tm,
      warmupSets: buildWarmupSets(tm),
      mainWork: buildPlannedSets(effectiveWeekSets, tm),
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
        sessions.push({ sessionNumber: sessionNumber++, cycleNumber, lifts: liftEntries, assistance, jumpsOrThrows, warmupCircuit, conditioning });
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
        sessions.push({ sessionNumber: sessionNumber++, cycleNumber, lifts: liftEntries, assistance, jumpsOrThrows, warmupCircuit, conditioning });
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
/**
 * docs/plan-structure.md "Assistance and conditioning" — fixed across every
 * 7th Week Protocol variant (deload, TM test), independent of whichever
 * template is running the surrounding phase. No specific exercises are
 * named in the source for this table, unlike a template's own assistance
 * choices, so `exerciseOptions` is left empty rather than invented.
 */
const SEVENTH_WEEK_ASSISTANCE: AssistanceTarget[] = [
  { category: "push", exerciseOptions: [], totalReps: { min: 25, max: 50 } },
  { category: "pull", exerciseOptions: [], totalReps: { min: 25, max: 50 } },
  { category: "single-leg-core", exerciseOptions: [], totalReps: { min: 25, max: 50 } },
];

/** docs/plan-structure.md "Session shape — independent of the template":
 * "jumps/throws (10 total)". No specific variation is named for this table. */
const SEVENTH_WEEK_JUMPS_OR_THROWS: JumpsOrThrows = {
  totalReps: { min: 10, max: 10 },
  guidance: "Any jump or throw variation.",
};

/** docs/plan-structure.md "Assistance and conditioning": "3-5 easy days.
 * Hard conditioning is avoided unless the lifter wants a conditioning
 * test." `sessionsPerWeek` holds the upper end, same convention as every
 * template's own conditioning field (e.g. original-531's "up to 4 hard
 * days" is also a cap, not an exact count) — the "3-5" and "easy, no hard
 * days" nuance lives in guidance instead. */
const SEVENTH_WEEK_CONDITIONING: Conditioning = {
  sessionsPerWeek: 5,
  guidance: "3-5 easy days for recovery; avoid hard conditioning unless testing a mile or a Prowler goal.",
};

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
        trainingMax: tm,
        warmupSets: buildWarmupSets(tm),
        mainWork: buildSeventhWeekPlannedSets(schemeForPercentage(percentage), tm),
        supplemental: [],
        supplementalLiftKey: liftKey,
      };
    });
    return {
      sessionNumber: sessionNumber++,
      cycleNumber,
      lifts: liftEntries,
      assistance: SEVENTH_WEEK_ASSISTANCE,
      jumpsOrThrows: SEVENTH_WEEK_JUMPS_OR_THROWS,
      warmupCircuit: AGILE_8,
      conditioning: SEVENTH_WEEK_CONDITIONING,
    };
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

  // Prior to any Leader template, the book recommends a training max test
  // week — docs/plan-structure.md "Placement rules". Run at cycleIndex 0,
  // the exact training max the plan's first cycle itself starts from (no
  // special-cased math: trainingMax(seed, increment, 0) is just the seed).
  // Every model gets one, Beginner included, for the same reason every
  // model already gets a closing one — consistency, not a book requirement
  // for Beginner specifically. Given cycleNumber 0 rather than sharing
  // cycle 1's: it precedes the first real cycle rather than closing one
  // out, and 0 is otherwise never used, so there's no ambiguity in the
  // cycle picker between "the plan's actual first cycle" and this
  // standalone test week — see index.tsx's cycleLabel.
  const openingTmTest = buildSeventhWeekSessions("tmTest", tmTestScheme, program.tmTestTrainingDays, liftMap, program, 0, 0, sessionNumber);
  sessions.push(...openingTmTest.sessions);
  sessionNumber = openingTmTest.nextSessionNumber;

  phases.forEach((phase, phaseIndex) => {
    const templateId = phase.role === "anchor" ? program.anchorTemplateId : program.leaderTemplateId;
    if (!templateId) {
      throw new Error(`Missing template id for role: ${phase.role}`);
    }
    const template = getTemplate(templateId);

    // Some Leaders declare that whoever follows them as Anchor should
    // resolve assistance from the Leader's own template instead of the
    // Anchor's — see Template.anchorAssistanceFollowsLeader's doc comment.
    // program.leaderTemplateId is always set (every programming model has a
    // Leader/standalone phase), so this is safe to compute unconditionally.
    const leaderTemplate = getTemplate(program.leaderTemplateId);
    const assistanceSourceTemplate = phase.role === "anchor" && leaderTemplate.anchorAssistanceFollowsLeader ? leaderTemplate : template;

    for (let i = 0; i < phase.cycles; i++) {
      const built = buildMainCycleSessions(template, phase.role, liftMap, program, cycleNumber, cycleIndex, sessionNumber, assistanceSourceTemplate);
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
