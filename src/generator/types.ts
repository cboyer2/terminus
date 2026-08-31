// Domain types for the plan generator. This is the one export surface for
// domain types — see docs/ARCHITECTURE.md §2: "There is no separate
// domain/ directory — it would add a hop without adding a boundary."
//
// generator/ imports nothing. Everything here is plain data; values flow in
// from data/ and app/ as arguments, never the other way around.
//
// Scoped to what the Beginner template needs. Per docs/ARCHITECTURE.md §8,
// some shapes here (multi-day-count session shapes, AMRAP/PR-set flags) are
// expected to be exercised — and possibly reshaped — once a second template
// and a non-Beginner programming model are built. That churn is planned,
// not a bug in this first pass.
//
// ProgressionStep's "deload" and "tmTest" kinds are both exercised by
// Beginner despite it being single-phase: every plan, Beginner included,
// closes with a 7th Week TM test (PRD §1), so Beginner's plan is [cycle of
// "main" sessions, then one closing "tmTest" session] — it just never
// produces a mid-plan "deload" (that only occurs between Leader and Anchor
// phases). "prTest" stays unused everywhere per PRD §1: "The closing week
// is always a TM test, never a PR test."

// ---------------------------------------------------------------------------
// Lifts
// ---------------------------------------------------------------------------

/**
 * Stable identifiers the generator keys on. Matches the check constraint on
 * public.lifts.lift_key. Widen this union — and the constraint — together
 * when a template introduces a new lift.
 */
export type LiftKey = "squat" | "bench" | "press" | "deadlift";

export type LiftRole = "main" | "supplemental";

/** A stored lift: numbers in, nothing derived, nothing computed. */
export interface Lift {
  liftKey: LiftKey;
  role: LiftRole;
  trainingMaxSeed: number;
  /** Overrides program.tmPercentage for this lift only. Never per-phase. */
  tmPercentageOverride: number | null;
  increment: number;
}

/**
 * The lift-level default increment (PRD §1.9), applied whenever a lift is
 * first created — the same default for every template, Beginner included.
 * `increment` is a concrete value the generator reads straight off `Lift`
 * (cycles.ts never consults the template), decided once at creation and
 * from then on editable per lift, not re-resolved on every plan generation
 * the way `tmPercentage` is. Beginner additionally exposes a per-lift
 * override down to 5 lb for squat/deadlift (docs/templates/beginner.md
 * "Options") — the book's own alternative for a lift you're weak in, not a
 * different default for the template as a whole.
 */
export const DEFAULT_INCREMENT_LB: Record<LiftKey, number> = {
  squat: 10,
  deadlift: 10,
  bench: 5,
  press: 5,
};

// ---------------------------------------------------------------------------
// Role-keyed prescription fields
// ---------------------------------------------------------------------------

export type TemplateRole = "leader" | "anchor" | "standalone";

/**
 * A prescription field that may vary by the role a template is run in.
 * Setup-constraint fields (role eligibility, compatible anchors, supported
 * day counts, tmPercentage) are never wrapped in this — they're flat by
 * definition. See docs/ARCHITECTURE.md "Role-keyed fields".
 */
export type ByRole<T> = T | { leader?: T; anchor?: T; standalone?: T; default: T };

/** The one shared resolver every role-keyed field goes through. */
export function resolveByRole<T>(field: ByRole<T>, role: TemplateRole): T {
  if (typeof field !== "object" || field === null || !("default" in field)) {
    return field as T;
  }
  return field[role] ?? field.default;
}

// ---------------------------------------------------------------------------
// Programming model
// ---------------------------------------------------------------------------

export type ProgrammingModelId = "beginner" | "2+1" | "2+2" | "3+2";

export interface ProgrammingPhase {
  role: TemplateRole;
  cycles: number;
}

/**
 * A programming model is a list of phases, not an enum — see
 * docs/ARCHITECTURE.md "A programming model is a list of phases". Adding a
 * model later (e.g. a fixed-cycle challenge program) is a new entry here,
 * not a new branch in the generator.
 */
export const PROGRAMMING_MODELS: Record<ProgrammingModelId, ProgrammingPhase[]> = {
  beginner: [{ role: "standalone", cycles: 1 }],
  "2+1": [
    { role: "leader", cycles: 2 },
    { role: "anchor", cycles: 1 },
  ],
  "2+2": [
    { role: "leader", cycles: 2 },
    { role: "anchor", cycles: 2 },
  ],
  "3+2": [
    { role: "leader", cycles: 3 },
    { role: "anchor", cycles: 2 },
  ],
};

/**
 * The total number of cycles a programming model runs — every phase's
 * `cycles` summed. `cycles.ts`'s `trainingMax(seed, increment, cycleIndex)`
 * already treats each cycle within a block as one more increment (cycle 0
 * = the seed itself, cycle 1 = seed+increment, ...), so a block with `n`
 * total cycles runs through cycle indices 0 through n-1. Normal progression
 * to the *next* block continues that same rate rather than resetting it —
 * see seed-progression.ts's `progressNormal`.
 */
export function totalCyclesInModel(programmingModel: ProgrammingModelId): number {
  return PROGRAMMING_MODELS[programmingModel].reduce((sum, phase) => sum + phase.cycles, 0);
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/**
 * References a template record's `id` in generator/templates/*.ts — not a
 * closed union. Adding a template means adding a record, not widening a
 * type here (PRD §3's "adding the second template requires no changes to
 * the plan generator").
 */
export type TemplateId = string;

export type RoleEligibility = "leader" | "anchor" | "both" | "neither";

/**
 * A range is a small set of discrete steps the book names (e.g. 80/85/90%),
 * never a continuous interval — `default` is which of those steps the setup
 * flow pre-selects, per PRD §1.4: "A fixed percentage is shown for approval;
 * a range requires a choice."
 */
export type TmPercentage = { kind: "fixed"; value: number } | { kind: "range"; min: number; max: number; default: number };

export interface Workout {
  /** Display label, e.g. "Workout A". */
  label: string;
  liftKeys: LiftKey[];
}

/**
 * Either a fixed, calendar-week-independent sequence of workouts repeated
 * every week (every template before bbb-original's 3-day rotation), or a
 * week rotation — an ordered list of weeks, each naming that week's
 * workouts, indexed by calendar week modulo `weeks.length`. `bbb-original`'s
 * 3-day schedule needs this because a lift's day position — and which of
 * its 3 progression steps a given calendar week uses — depends on the week
 * index (docs/templates/boring-but-big.md "Session shape"). The two are
 * told apart by their distinct keys, never by structural guessing, same
 * convention as `MainWorkScheme`.
 */
export type SessionShapeVariant = { workouts: Workout[] } | { weeks: Workout[][] };

/**
 * Session shape is a function of template AND training days, not a
 * template property alone (docs/ARCHITECTURE.md §2) — keyed here by day
 * count first, then by role via `ByRole`. Every template before
 * bbb-original supported exactly one day count, so this axis went
 * unexercised until its 3-day rotation needed a genuinely different shape
 * (a week rotation) alongside its existing 4-day one (a fixed list).
 */
export type SessionShape = Partial<Record<2 | 3 | 4, ByRole<SessionShapeVariant>>>;

export interface MainWorkSet {
  tmPercentage: number;
  reps: number;
  /**
   * True for a set the book marks with "+" — beat the prior rep count or
   * estimated max, rather than stopping at `reps`. `reps` still holds the
   * printed minimum. See docs/ARCHITECTURE.md §8 "Main work needs per-set
   * flags" and the `original-531` / `bbb-original` (PR-set base) specs.
   */
  isPrSet: boolean;
}

/**
 * `bbb-original`'s three printed main-work bases (docs/templates/
 * boring-but-big.md "Main work") — an option, not a template split, per the
 * variation/option test: it changes no setup-constraint field.
 */
export type MainWorkBase = "3/5/1" | "classic" | "prSet";

/**
 * Indexed by 0-based progression step (the book's "5s/3s/1s week", whatever
 * a template calls it). A template whose main work is chosen from named
 * bases (rather than varying by role) supplies the option-keyed form
 * instead — `resolveMainWorkScheme` in cycles.ts is the one resolver for
 * both shapes. The two are told apart by their distinct keys (`byRole`
 * fields are the plain-value/role-map union in `ByRole`; this one is
 * `byMainWorkBase`), never by structural guessing.
 */
export type MainWorkScheme =
  | ByRole<MainWorkSet[][]>
  | { byMainWorkBase: Record<MainWorkBase, MainWorkSet[][]>; defaultMainWorkBase: MainWorkBase };

export type SupplementalSourceKind = "firstSetLast" | "secondSetLast" | "percentageOfTrainingMax";

/**
 * FSL/SSL derive their percentage from that week's own main-work sets, so
 * they carry no percentage of their own. "percentageOfTrainingMax" (BBB's
 * flat supplemental scheme) has no main-work set to derive from, so it must
 * state one — a template default, overridable per lift via
 * `program.options` (docs/templates/boring-but-big.md "Options").
 */
export type SupplementalPrescription =
  | { sets: number; reps: number; source: "firstSetLast" | "secondSetLast" }
  | { sets: number; reps: number; source: "percentageOfTrainingMax"; percentageOfTrainingMax: number };

/**
 * Beginner assigns each lift 85% or 90% individually (docs/templates/
 * beginner.md), and its supplemental source depends on which: Second Set
 * Last for a lift at the template's lower declared percentage, First Set
 * Last otherwise. A template that doesn't vary supplemental by percentage
 * just supplies one SupplementalPrescription. "none" is Original 5/3/1's
 * case — no template in that family has any supplemental work at all,
 * rather than a prescription with zero sets standing in for "none".
 */
export type Supplemental =
  | "none"
  | SupplementalPrescription
  | { atLowerTmPercentage: SupplementalPrescription; atHigherTmPercentage: SupplementalPrescription };

export interface AssistanceTarget {
  /** e.g. "push", "pull", "single-leg-core" — Original 5/3/1's categories; Beginner's own groupings reuse this shape. */
  category: string;
  /** Paraphrased exercise choices, not verbatim book text. */
  exerciseOptions: string[];
  totalReps: { min: number; max: number };
}

export interface JumpsOrThrows {
  totalReps: { min: number; max: number };
  guidance: string;
}

export interface Conditioning {
  sessionsPerWeek: number;
  guidance: string;
}

export interface WarmupExercise {
  name: string;
  sets: number;
  /** Free text since notation varies ("25", "10 per leg"). */
  reps: string;
}

export interface Template {
  id: TemplateId;
  name: string;
  roleEligibility: RoleEligibility;
  /** Anchor template ids this Leader may be followed by. Empty when not Leader-eligible. */
  compatibleAnchorIds: TemplateId[];
  supportedDayCounts: (2 | 3 | 4)[];
  tmPercentage: TmPercentage;

  sessionShape: SessionShape;
  mainWorkScheme: MainWorkScheme;
  supplemental: ByRole<Supplemental>;
  assistance: ByRole<AssistanceTarget[]>;
  jumpsOrThrows: ByRole<JumpsOrThrows>;
  conditioning: ByRole<Conditioning>;
  warmup: ByRole<WarmupExercise[]>;
}

// ---------------------------------------------------------------------------
// Program (the one stored setup row)
// ---------------------------------------------------------------------------

export interface Program {
  programmingModel: ProgrammingModelId;
  /** Also the standalone template's day count when programmingModel is "beginner". */
  leaderTrainingDays: 2 | 3 | 4;
  /** Null exactly when anchorTemplateId is null (programmingModel is "beginner") — the
   * book allows the Anchor to run at a different day count than the Leader (e.g. a
   * 3-day Original 5/3/1 A/B Leader into a 4-day canonical Original 5/3/1 Anchor). */
  anchorTrainingDays: (2 | 3 | 4) | null;
  /** The mid-plan 7th Week deload, between the Leader and Anchor phases. Its own
   * independent day-count choice — 2, 3, or 4 — per the book, not inherited from
   * leaderTrainingDays or anchorTrainingDays. Null exactly when anchorTemplateId is
   * null (no phase transition, so no deload). */
  deloadTrainingDays: (2 | 3 | 4) | null;
  /** The closing 7th Week TM test (or a future PR test, per PRD — not generated yet).
   * Always set: every plan closes with one. Independent of leaderTrainingDays,
   * anchorTrainingDays, and deloadTrainingDays alike. */
  tmTestTrainingDays: 2 | 3 | 4;
  /** Holds the standalone template id when programmingModel is "beginner". */
  leaderTemplateId: TemplateId;
  anchorTemplateId: TemplateId | null;
  tmPercentage: number;
  /** Template-specific optional selections (PRD §1.5) — shape grows per template. */
  options: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// The generated plan
// ---------------------------------------------------------------------------

export interface PlannedSet {
  tmPercentage: number;
  workingWeight: number;
  /**
   * A plain number for every set a template or protocol prints as one. The
   * `{min,max}` form exists only for the 7th Week Deload's second set
   * (70%x5, 80%x3-5, 90%x1, 100%x1) — unlike the TM test's own "3-5", which
   * the book explains away by percentage (90%->3, 85%->5) and which
   * resolves to a plain number, nothing ties the deload's range to
   * anything. It reads as genuine autoregulation ("don't grind"), not a
   * fact this app should collapse to a single number. No MainWorkSet ever
   * needs this — it's confined to the one generated (not template-authored)
   * set that has it.
   */
  reps: number | { min: number; max: number };
  /** Carried from MainWorkSet.isPrSet; always false for a supplemental set. */
  isPrSet: boolean;
}

export interface SessionLiftEntry {
  liftKey: LiftKey;
  step: ProgressionStep;
  /**
   * Fixed across every template and every progression step, main-work
   * sessions and 7th Week Protocol sessions alike — 40% x5, 50% x5, 60% x3
   * off this lift's own training max, before main work only, never before
   * supplemental. See docs/plan-structure.md "Warm-up sets". Not a template
   * field: unlike everything else on this type, the ramp itself never
   * varies, so there's nothing for a template to declare.
   */
  warmupSets: PlannedSet[];
  mainWork: PlannedSet[];
  supplemental: PlannedSet[];
  /**
   * Which lift's training max `supplemental` was computed from — equal to
   * `liftKey` unless `program.options.supplementalOppositeLift` is set
   * (see cycles.ts's supplementalBasisLiftKey). Meaningless when
   * `supplemental` is empty, but always defined rather than optional, same
   * as every other field here.
   */
  supplementalLiftKey: LiftKey;
}

export interface Session {
  /** 1-based, ordered across the whole plan — not a calendar week. See docs/ARCHITECTURE.md "Weeks are not all the same shape". */
  sessionNumber: number;
  cycleNumber: number;
  lifts: SessionLiftEntry[];
  /**
   * Per-workout, not per-lift — the book prescribes these once per session
   * regardless of how many lifts that session trains, so they live here
   * rather than on SessionLiftEntry. Identical across every session within
   * one role (Leader, Anchor, or a 7th Week Protocol occurrence) — the UI
   * displays them once per phase view rather than repeating them on every
   * SessionCard, matching the owner's "keep noise to a minimum" call.
   * `warmupCircuit` is deliberately distinct from SessionLiftEntry's
   * `warmupSets` — one is the fixed bodyweight/mobility circuit before any
   * work, the other is the per-lift percentage ramp before that lift's own
   * main work.
   */
  assistance: AssistanceTarget[];
  jumpsOrThrows: JumpsOrThrows;
  warmupCircuit: WarmupExercise[];
}

/**
 * A discriminated union, not one type with optional fields, so a renderer
 * that forgets a kind fails to compile instead of rendering blank. See
 * docs/ARCHITECTURE.md "Weeks are not all the same shape".
 *
 * Named ProgressionStep, not Week, because the UI also has an actual
 * calendar week (that phase's own training-days count of consecutive
 * sessions) and the two are not the same thing — see the module comment in
 * app/(tabs)/index.tsx.
 */
export type ProgressionStep =
  | { kind: "main"; index: 0 | 1 | 2 }
  | { kind: "deload" }
  | { kind: "tmTest" }
  | { kind: "prTest" };

export interface Plan {
  sessions: Session[];
}
