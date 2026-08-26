// Expands stored lifts + a resolved template selection into a displayable
// Plan. Imports nothing but calc.ts and types.ts — no React, no Supabase, no
// storage. See docs/ARCHITECTURE.md §2.
//
// Guidance fields (assistance, jumps/throws, warm-up, conditioning) are not
// threaded through here — they don't depend on training maxes, so the UI
// reads them straight off the selected Template record instead.

import { workingWeight } from "./calc";
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
    // See docs/ARCHITECTURE.md §8.
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
          cycleNumber,
          liftsByKey,
          planTmPercentage,
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
  cycleNumber: number;
  liftsByKey: Map<LiftKey, Lift>;
  planTmPercentage: number;
}

function generateSession(input: GenerateSessionInput): Week {
  const sets: PlannedSet[] = [];

  for (const liftKey of input.workout.liftKeys) {
    const lift = input.liftsByKey.get(liftKey);
    if (!lift) {
      throw new Error(`Missing lift data for "${liftKey}"`);
    }

    const trainingMaxLb = lift.trainingMaxSeedLb + (input.cycleNumber - 1) * lift.incrementLb;
    const effectivePercentage = lift.tmPercentageOverride ?? input.planTmPercentage;

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
      return input.mainWorkSets[0].tmPercentage;
    case "second-set-last":
      return input.mainWorkSets[1].tmPercentage;
    default: {
      const exhaustiveCheck: never = source;
      throw new Error(`Unhandled supplemental source: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
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
  if (
    template.id === "beginner" &&
    template.tmPercentage.kind === "range" &&
    effectivePercentage === template.tmPercentage.min
  ) {
    return { kind: "second-set-last" };
  }
  return declaredSource;
}

function resolveByRole<T>(field: ByRole<T>, role: ProgrammingPhaseRole): T {
  if (isRoleMap(field)) {
    return field[role] ?? field.default;
  }
  return field;
}

function isRoleMap<T>(field: ByRole<T>): field is { leader?: T; anchor?: T; standalone?: T; default: T } {
  return typeof field === "object" && field !== null && "default" in field;
}
