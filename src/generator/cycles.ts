// Expands stored lifts + a resolved template selection into a displayable
// Plan. Imports nothing but calc.ts and types.ts — no React, no Supabase, no
// storage. See docs/ARCHITECTURE.md §2.
//
// Guidance fields (assistance, jumps/throws, warm-up, conditioning) are not
// threaded through here — they don't depend on training maxes, so the UI
// reads them straight off the selected Template record instead.

import { trainingMax, workingWeight } from "./calc";
import type {
  ByRole,
  Cycle,
  Lift,
  LiftKey,
  MainWorkSet,
  PlannedSet,
  Plan,
  ProgrammingModel,
  ProgrammingPhaseRole,
  Range,
  SupplementalPrescription,
  SupplementalSource,
  Template,
  TrainingDayCount,
  Week,
  Workout,
} from "./types";

/** Every 5/3/1 cycle gives each lift three progression steps — see docs/ARCHITECTURE.md. */
const PROGRESSION_STEPS = [1, 2, 3] as const;

export interface GeneratePlanInput {
  lifts: Lift[];
  programmingModel: ProgrammingModel;
  /** Plan-wide default; a lift's own `tmPercentageOverride` wins when set. */
  tmPercentage: number;
  templatesByRole: Partial<Record<ProgrammingPhaseRole, Template>>;
  trainingDays: TrainingDayCount;
}

/**
 * The one function the rest of the app calls to turn stored inputs into a
 * displayable plan. See docs/ARCHITECTURE.md §2.
 */
export function generatePlan(input: GeneratePlanInput): Plan {
  if (input.programmingModel.phases.length > 1) {
    // A phase transition needs a 7th Week Protocol deload, and the plan
    // always closes with a TM test — neither is implemented yet, since no
    // template with a Leader/Anchor pairing exists to generate one from.
    // See docs/ARCHITECTURE.md §8. Note for whoever implements this: a
    // later phase's training max can't just keep applying cycleNumber
    // against its own template's incrementOverrides — already-elapsed
    // cycles progressed under an earlier phase's template, which may
    // override a lift's increment differently.
    throw new Error("Multi-phase programming models are not yet implemented");
  }

  const liftsByKey = new Map(input.lifts.map((lift) => [lift.liftKey, lift]));
  const cycles: Cycle[] = [];
  let cycleNumber = 1;

  for (const phase of input.programmingModel.phases) {
    const template = input.templatesByRole[phase.role];
    if (!template) {
      throw new Error(`No template provided for the "${phase.role}" phase`);
    }

    for (let i = 0; i < phase.cycles; i++) {
      cycles.push(
        generateCycle({
          template,
          phaseRole: phase.role,
          cycleNumber,
          liftsByKey,
          planTmPercentage: input.tmPercentage,
          trainingDays: input.trainingDays,
        }),
      );
      cycleNumber++;
    }
  }

  return { cycles };
}

interface ResolvedLift {
  trainingMaxLb: number;
  effectivePercentage: number;
}

interface GenerateCycleInput {
  template: Template;
  phaseRole: ProgrammingPhaseRole;
  cycleNumber: number;
  liftsByKey: Map<LiftKey, Lift>;
  planTmPercentage: number;
  trainingDays: TrainingDayCount;
}

function generateCycle(input: GenerateCycleInput): Cycle {
  const { template, phaseRole, cycleNumber, liftsByKey, planTmPercentage, trainingDays } = input;

  const sessionShape = template.sessionShape[trainingDays];
  if (!sessionShape) {
    throw new Error(`"${template.id}" does not support ${trainingDays} training days`);
  }

  const mainWorkScheme = resolveByRole(template.mainWork, phaseRole);
  const supplementalPrescription = resolveByRole(template.supplemental, phaseRole);

  // Resolved once per cycle, not once per session — a lift's training max
  // and effective percentage don't vary across the cycle's progression
  // steps, only across cycles.
  const liftKeysInSession = new Set(sessionShape.workouts.flatMap((workout) => workout.liftKeys));
  const resolvedLifts = new Map<LiftKey, ResolvedLift>();
  for (const liftKey of liftKeysInSession) {
    const lift = liftsByKey.get(liftKey);
    if (!lift) {
      throw new Error(`Missing lift data for "${liftKey}"`);
    }
    if (lift.role !== "main") {
      // Every LiftKey today is inherently a main lift, so this can't fire
      // yet — but the data model allows role: "supplemental", and nothing
      // downstream knows how to schedule one as main work.
      throw new Error(`"${liftKey}" is scheduled as main work by "${template.id}" but is stored with role "${lift.role}"`);
    }
    const incrementLb = template.incrementOverrides?.[liftKey] ?? lift.incrementLb;
    resolvedLifts.set(liftKey, {
      trainingMaxLb: trainingMax(lift.trainingMaxSeedLb, incrementLb, cycleNumber),
      effectivePercentage: lift.tmPercentageOverride ?? planTmPercentage,
    });
  }

  // A cycle is an ordered, flat list of sessions, not a calendar-week grid —
  // see the Week type's own comment in types.ts.
  const weeks: Week[] = [];
  for (const progressionStep of PROGRESSION_STEPS) {
    for (const workout of sessionShape.workouts) {
      weeks.push(
        generateSession({
          template,
          workout,
          progressionStep,
          mainWorkSets: mainWorkScheme[progressionStep - 1],
          supplementalPrescription,
          resolvedLifts,
        }),
      );
    }
  }

  return { cycleNumber, role: phaseRole, weeks };
}

interface GenerateSessionInput {
  template: Template;
  workout: Workout;
  progressionStep: 1 | 2 | 3;
  mainWorkSets: MainWorkSet[];
  supplementalPrescription: SupplementalPrescription;
  resolvedLifts: Map<LiftKey, ResolvedLift>;
}

function generateSession(input: GenerateSessionInput): Week {
  const sets: PlannedSet[] = [];

  for (const liftKey of input.workout.liftKeys) {
    // generateCycle resolves every lift key its own session shape
    // references before generating any session, so this is unreachable —
    // guarded rather than asserted with `!`, since a thrown error beats a
    // silent `undefined` crash deeper in the call stack.
    const resolved = input.resolvedLifts.get(liftKey);
    if (!resolved) {
      throw new Error(`No resolved data for "${liftKey}"`);
    }
    const { trainingMaxLb, effectivePercentage } = resolved;

    for (const mainSet of input.mainWorkSets) {
      sets.push({
        liftKey,
        role: "main",
        reps: mainSet.reps,
        tmPercentage: mainSet.tmPercentage,
        weightLb: workingWeight(trainingMaxLb, mainSet.tmPercentage),
        isAmrap: mainSet.isAmrap,
      });
    }

    const supplementalPercentage = resolveSupplementalPercentage({
      template: input.template,
      effectivePercentage,
      mainWorkSets: input.mainWorkSets,
      source: input.supplementalPrescription.source,
    });

    for (let i = 0; i < input.supplementalPrescription.sets; i++) {
      sets.push({
        liftKey,
        role: "supplemental",
        reps: input.supplementalPrescription.reps,
        tmPercentage: supplementalPercentage,
        weightLb: workingWeight(trainingMaxLb, supplementalPercentage),
      });
    }
  }

  return { kind: "main", progressionStep: input.progressionStep, sets };
}

interface ResolveSupplementalPercentageInput {
  template: Template;
  effectivePercentage: number;
  mainWorkSets: MainWorkSet[];
  source: SupplementalSource;
}

function resolveSupplementalPercentage(input: ResolveSupplementalPercentageInput): number {
  const source = effectiveSupplementalSource(input.template, input.effectivePercentage, input.source);

  switch (source.kind) {
    case "flat-percentage":
      return source.tmPercentage;
    case "first-set-last":
      return requireMainWorkSet(input.template, input.mainWorkSets, 0).tmPercentage;
    case "second-set-last":
      return requireMainWorkSet(input.template, input.mainWorkSets, 1).tmPercentage;
    default: {
      const exhaustiveCheck: never = source;
      throw new Error(`Unhandled supplemental source: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}

/**
 * `MainWorkSet[]` carries no minimum-length guarantee — a future template
 * with, say, a single top-set progression step paired with a Second Set
 * Last supplemental source would otherwise crash on an unguarded index.
 */
function requireMainWorkSet(template: Template, mainWorkSets: MainWorkSet[], index: number): MainWorkSet {
  const set = mainWorkSets[index];
  if (!set) {
    throw new Error(
      `"${template.id}"'s supplemental source needs at least ${index + 1} main work set(s) this progression step, but only ${mainWorkSets.length} exist`,
    );
  }
  return set;
}

/**
 * Beginner-specific: lifts assigned the weaker end of its TM range use
 * Second Set Last instead of the template's declared First Set Last.
 * Deliberate, temporary branch on template id, per CLAUDE.md — remove or
 * generalize when a second template needs its own per-lift supplemental
 * rule. See docs/templates/beginner.md's supplemental section.
 */
function effectiveSupplementalSource(
  template: Template,
  effectivePercentage: number,
  declaredSource: SupplementalSource,
): SupplementalSource {
  if (template.id === "beginner" && template.tmPercentage.kind === "range" && isWeakLiftPercentage(effectivePercentage, template.tmPercentage)) {
    return { kind: "second-set-last" };
  }
  return declaredSource;
}

/**
 * Closer to a TM range's low end than its high end. The book assigns each
 * lift one of two values (90% for stronger lifts, 85% for weaker ones), so
 * this is a binary classification, not a continuous one — but it's checked
 * by proximity rather than exact equality to the range minimum, so an
 * override that isn't a bit-identical 0.85 (0.87, say, entered through a
 * future non-binary percentage picker) still lands on the correct side.
 *
 * A percentage landing exactly on the midpoint (0.875 for Beginner) is
 * deliberately classified "strong" — the book's assignment is genuinely
 * binary and never produces this tie, so there's no book guidance either
 * way; defaulting to the template's own declared source rather than the
 * override is the more conservative of two equally arbitrary choices.
 */
function isWeakLiftPercentage(percentage: number, range: Range): boolean {
  const midpoint = (range.min + range.max) / 2;
  return percentage < midpoint;
}

/**
 * Exported so the UI can resolve the guidance fields (assistance,
 * jumpsAndThrows, warmUp, conditioning) this module deliberately doesn't
 * thread through Plan — one shared helper for every role-keyed field, per
 * CLAUDE.md, not a private copy per consumer.
 */
export function resolveByRole<T>(field: ByRole<T>, role: ProgrammingPhaseRole): T {
  if (isRoleMap(field)) {
    return field[role] ?? field.default;
  }
  return field;
}

function isRoleMap<T>(field: ByRole<T>): field is { leader?: T; anchor?: T; standalone?: T; default: T } {
  return typeof field === "object" && field !== null && "default" in field;
}
