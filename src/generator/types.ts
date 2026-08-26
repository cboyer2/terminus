// Domain types for the plan generator. This is the one export surface for
// domain types — see docs/ARCHITECTURE.md §2: "There is no separate
// domain/ directory — it would add a hop without adding a boundary."
//
// generator/ imports nothing. Everything here is plain data; values flow in
// from data/ and app/ as arguments, never the other way around.
//
// Scoped to what the Beginner template needs. Per docs/ARCHITECTURE.md §8,
// several shapes here (Week's deload/tmTest/prTest kinds, multi-day-count
// session shapes, AMRAP/PR-set flags) are expected to be exercised — and
// possibly reshaped — once a second template and a non-Beginner programming
// model are built. That churn is planned, not a bug in this first pass.

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

export type TmPercentage = { kind: "fixed"; value: number } | { kind: "range"; min: number; max: number };

export interface Workout {
  /** Display label, e.g. "Workout A". */
  label: string;
  liftKeys: LiftKey[];
}

/**
 * The repeating sequence of workouts a template runs, for a given role.
 * Not yet a function of day count too — every template so far supports
 * only one day count, so this hasn't been exercised. See
 * docs/ARCHITECTURE.md §8: "Session shape is a function of template and
 * training days."
 */
export type SessionShape = ByRole<Workout[]>;

export interface MainWorkSet {
  tmPercentage: number;
  reps: number;
}

/** Indexed by 0-based progression step (the book's "5s/3s/1s week", whatever a template calls it). */
export type MainWorkScheme = ByRole<MainWorkSet[][]>;

export type SupplementalSourceKind = "firstSetLast" | "secondSetLast" | "percentageOfTrainingMax";

export interface SupplementalPrescription {
  sets: number;
  reps: number;
  source: SupplementalSourceKind;
}

/**
 * Beginner assigns each lift 85% or 90% individually (docs/templates/
 * beginner.md), and its supplemental source depends on which: Second Set
 * Last for a lift at the template's lower declared percentage, First Set
 * Last otherwise. A template that doesn't vary supplemental by percentage
 * just supplies one SupplementalPrescription.
 */
export type Supplemental =
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
  trainingDays: 2 | 3 | 4;
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
  reps: number;
}

export interface SessionLiftEntry {
  liftKey: LiftKey;
  week: Week;
  mainWork: PlannedSet[];
  supplemental: PlannedSet[];
}

export interface Session {
  /** 1-based, ordered across the whole plan — not a calendar week. See docs/ARCHITECTURE.md "Weeks are not all the same shape". */
  sessionNumber: number;
  cycleNumber: number;
  lifts: SessionLiftEntry[];
}

/**
 * A discriminated union, not one type with optional fields, so a renderer
 * that forgets a kind fails to compile instead of rendering blank. See
 * docs/ARCHITECTURE.md "Weeks are not all the same shape".
 */
export type Week =
  | { kind: "main"; progressionStep: 0 | 1 | 2 }
  | { kind: "deload" }
  | { kind: "tmTest" }
  | { kind: "prTest" };

export interface Plan {
  sessions: Session[];
}
