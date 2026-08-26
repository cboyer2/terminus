// Domain types for the generator. Imports nothing — no React, no Supabase,
// no storage. See docs/ARCHITECTURE.md §2.

// ---------------------------------------------------------------------------
// Lift
// ---------------------------------------------------------------------------

/**
 * Must stay in sync with the `lift_key` CHECK constraint in
 * supabase/migrations/20260826000143_create_lifts_and_program.sql. Widen
 * both together when a template introduces a lift outside this set.
 */
export type LiftKey = "squat" | "bench" | "press" | "deadlift";

export type LiftRole = "main" | "supplemental";

/** The generator's view of a stored lift row — see docs/ARCHITECTURE.md §3. */
export interface Lift {
  liftKey: LiftKey;
  role: LiftRole;
  trainingMaxSeedLb: number;
  /** 0-1, never 85. Overrides `program.tmPercentage` for this lift only — never a per-phase override. */
  tmPercentageOverride: number | null;
  incrementLb: number;
}

// ---------------------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------------------

export type TrainingDayCount = 2 | 3 | 4;

export interface Range {
  min: number;
  max: number;
}

/**
 * Any prescription field may hold a plain value or a map keyed by role.
 * Setup-constraint fields (role eligibility, compatible anchors, supported
 * day counts, `tmPercentage`) are never wrapped in this — see
 * docs/ARCHITECTURE.md's "Role-keyed fields" section.
 */
export type ByRole<T> = T | { leader?: T; anchor?: T; standalone?: T; default: T };

// ---------------------------------------------------------------------------
// Template — setup constraints
// ---------------------------------------------------------------------------

/** Widen to a union as the library grows; currently just `"beginner"`. */
export type TemplateId = string;

/** Leader, Anchor, both, or neither. The Beginner template is neither. */
export type RoleEligibility = "leader" | "anchor" | "both" | "neither";

export type TmPercentageConstraint =
  | { kind: "fixed"; value: number }
  | { kind: "range"; min: number; max: number };

// ---------------------------------------------------------------------------
// Template — prescription
// ---------------------------------------------------------------------------

export interface Workout {
  /** Template-local id, e.g. Beginner's `"a"` / `"b"`. */
  id: string;
  /** Main lifts trained in this workout, in session order. */
  liftKeys: LiftKey[];
}

/**
 * Under-modelled on purpose — see docs/ARCHITECTURE.md §8. This covers a
 * template whose workouts repeat in a fixed rotation across sessions
 * (Beginner's A/B alternation). It does not yet cover a lift's day position
 * depending on the week index (Original BBB's 3-day rotation) or two main
 * lifts sharing a session with per-session-not-per-week rep schemes
 * (Original 5/3/1 A/B). Expect this to change when Original BBB lands.
 */
export interface SessionShape {
  workouts: Workout[];
}

export interface MainWorkSet {
  /** 0-1, never 85. */
  tmPercentage: number;
  reps: number;
  /** True for a "+"/AMRAP-style final set. Absent for straight-rep templates like Beginner. */
  isAmrap?: boolean;
}

/** One cycle's three progression steps for a lift — see docs/ARCHITECTURE.md's "A cycle is three progression steps." */
export type MainWorkScheme = [MainWorkSet[], MainWorkSet[], MainWorkSet[]];

export type SupplementalSource =
  | { kind: "flat-percentage"; tmPercentage: number }
  | { kind: "first-set-last" }
  | { kind: "second-set-last" };

export interface SupplementalPrescription {
  sets: number;
  reps: number;
  source: SupplementalSource;
}

export type AssistanceCategory = "push" | "pull" | "singleLegCore";

export type AssistanceTargets = Record<AssistanceCategory, Range>;

/**
 * Free-text reference guidance — conditioning and warm-up are shown for
 * reference only, never tracked or computed (see PRD §4). Covers cases that
 * don't reduce to a clean structure, like Beginner's running program
 * (mileage or track intervals) versus Original BBB's hard/easy
 * conditioning-day counts, or Beginner's assistance section, which offers
 * two exercise slots under `singleLegCore` rather than one rep range.
 */
export type Guidance = string;

/** Structured per-category targets where a template fits that shape; free text where it doesn't (see Beginner). */
export type AssistanceContent = AssistanceTargets | Guidance;

export interface Template {
  id: TemplateId;
  /** Paraphrased display name — never verbatim book text, per CLAUDE.md. */
  name: string;

  // Setup constraints — flat, never role-keyed.
  roleEligibility: RoleEligibility;
  /** Leader-eligible templates only; empty for Anchor-only or neither-eligible templates. */
  compatibleAnchors: TemplateId[];
  supportedDayCounts: TrainingDayCount[];
  tmPercentage: TmPercentageConstraint;

  /**
   * Per-lift override of a lift's own `incrementLb`, the fallback (see
   * docs/ARCHITECTURE.md §3). Not role-keyed — the book varies this by lift,
   * not by Leader/Anchor. Beginner overrides squat and deadlift to +5 lb.
   */
  incrementOverrides?: Partial<Record<LiftKey, number>>;

  // Prescription — may be role-keyed via ByRole<T>.
  sessionShape: Partial<Record<TrainingDayCount, SessionShape>>;
  mainWork: ByRole<MainWorkScheme>;
  supplemental: ByRole<SupplementalPrescription>;
  assistance: ByRole<AssistanceContent>;
  jumpsAndThrows: ByRole<Range>;
  /** PRD §1.8 lists warm-up/mobility as shown on the cheat sheet; ARCHITECTURE.md's prescription list omitted it. */
  warmUp?: ByRole<Guidance>;
  conditioning?: ByRole<Guidance>;
}

// ---------------------------------------------------------------------------
// ProgrammingModel
// ---------------------------------------------------------------------------

export type ProgrammingModelId = "beginner" | "2+1" | "2+2" | "3+2";

export type ProgrammingPhaseRole = "leader" | "anchor" | "standalone";

export interface ProgrammingPhase {
  role: ProgrammingPhaseRole;
  cycles: number;
}

/** A list of phases, not an enum — see docs/ARCHITECTURE.md's "A programming model is a list of phases." */
export interface ProgrammingModel {
  id: ProgrammingModelId;
  phases: ProgrammingPhase[];
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export interface PlannedSet {
  liftKey: LiftKey;
  role: LiftRole;
  reps: number;
  /** 0-1, never 85. */
  tmPercentage: number;
  weightLb: number;
  isAmrap?: boolean;
}

/**
 * Despite the name, this is not a calendar week — it's one session's worth
 * of prescribed sets. "Week" is the book's term (5's/3's/1's week) for what
 * is really a per-lift progression step; see docs/ARCHITECTURE.md's "A cycle
 * is three progression steps per lift, not three calendar weeks." A
 * discriminated union so every renderer is forced to handle every kind.
 */
export type Week =
  | { kind: "main"; progressionStep: 1 | 2 | 3; sets: PlannedSet[] }
  | { kind: "deload"; sets: PlannedSet[] }
  | { kind: "tmTest"; sets: PlannedSet[] }
  | { kind: "prTest"; sets: PlannedSet[] };

export interface Cycle {
  /** 1-based across the whole plan, not reset per phase. */
  cycleNumber: number;
  role: ProgrammingPhaseRole;
  /** An ordered, flat list of sessions — not a calendar-week grid. */
  weeks: Week[];
}

export interface Plan {
  cycles: Cycle[];
}
