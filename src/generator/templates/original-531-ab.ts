// Original 5/3/1, A/B split. See docs/templates/original-531.md
// "original-531-ab" — the hand-verification reference for every field below.
// Percentages confirmed by the owner as identical to original-531's
// canonical table; the "3×5"/"3×3"/"5/3/1" session labels describe each
// session's set/rep shape, not a different percentage table.
//
// Two lifts per session, over a 6-session/2-calendar-week rotation, is
// expressed with the same mechanism bbb-original's 3-day rotation already
// uses: `weeks: Workout[][]` plus per-lift appearance counting in
// buildMainCycleSessions. Each Workout's liftKeys was already an array —
// bbb-original just never populated it with more than one key. Squat and
// bench always appear together, so they always share an appearance count
// (and therefore a progression step); deadlift and press likewise. No
// generator change was needed for the two-lifts-per-session shape itself —
// see docs/ARCHITECTURE.md "Known model gaps", corrected alongside this
// template.

import type { AssistanceTarget, Template } from "../types";

const ASSISTANCE_EXERCISES: Pick<AssistanceTarget, "category" | "exerciseOptions">[] = [
  { category: "push", exerciseOptions: ["Dip", "Push-up", "Overhead triceps extension"] },
  { category: "pull", exerciseOptions: ["Row", "Chin-up"] },
  { category: "single-leg-core", exerciseOptions: ["Ab wheel", "Hanging leg raise", "Lunge"] },
];

function assistanceAt(totalReps: { min: number; max: number }): AssistanceTarget[] {
  return ASSISTANCE_EXERCISES.map((entry) => ({ ...entry, totalReps }));
}

export const original531AbTemplate: Template = {
  id: "original-531-ab",
  name: "Original 5/3/1 — A/B",
  // Leader only, like original-531-10rep — confirmed by the owner: the
  // book's only compatible anchor for A/B is original-531 (the
  // 3-day-into-4-day transition, docs/plan-structure.md, CLAUDE.md's
  // Original 5/3/1 A/B example), and it is never itself named as a book
  // Anchor destination, so it never runs in the "anchor" role.
  roleEligibility: "leader",
  compatibleAnchorIds: ["original-531"],
  supportedDayCounts: [3],
  tmPercentage: { kind: "range", min: 0.8, max: 0.9, default: 0.9 },
  // original-531 as Anchor uses this template's own resolved assistance
  // profile (50-100 flat, or 100/50-75 role-keyed) instead of its own 50-75
  // default — confirmed by the owner. See
  // Template.anchorAssistanceFollowsLeader.
  anchorAssistanceFollowsLeader: true,

  // "A" is squat/bench, "B" is deadlift/press. Week 1: A(fives), B(fives),
  // A(threes). Week 2: B(threes), A(5/3/1), B(5/3/1) — docs/templates/
  // original-531.md's session table. Squat/bench and deadlift/press each
  // accumulate their own appearance count across the 6 sessions, landing on
  // mainWorkScheme steps 0/1/2 in order regardless of which calendar week
  // they fall in.
  sessionShape: {
    3: {
      weeks: [
        [
          { label: "A", liftKeys: ["squat", "bench"] },
          { label: "B", liftKeys: ["deadlift", "press"] },
          { label: "A", liftKeys: ["squat", "bench"] },
        ],
        [
          { label: "B", liftKeys: ["deadlift", "press"] },
          { label: "A", liftKeys: ["squat", "bench"] },
          { label: "B", liftKeys: ["deadlift", "press"] },
        ],
      ],
    },
  },

  // Identical to original-531's canonical week ordering and PR-set
  // placement — confirmed by the owner. Not role-keyed, same as canonical.
  mainWorkScheme: [
    [
      { tmPercentage: 0.65, reps: 5, isPrSet: false },
      { tmPercentage: 0.75, reps: 5, isPrSet: false },
      { tmPercentage: 0.85, reps: 5, isPrSet: true },
    ],
    [
      { tmPercentage: 0.7, reps: 3, isPrSet: false },
      { tmPercentage: 0.8, reps: 3, isPrSet: false },
      { tmPercentage: 0.9, reps: 3, isPrSet: true },
    ],
    [
      { tmPercentage: 0.75, reps: 5, isPrSet: false },
      { tmPercentage: 0.85, reps: 3, isPrSet: false },
      { tmPercentage: 0.95, reps: 1, isPrSet: true },
    ],
  ],

  supplemental: "none",

  // docs/templates/original-531.md "original-531-ab" § Options: two choices,
  // confirmed by the owner against the book's own four printed
  // Leader/Anchor-assistance options for this family (canonical; 10-rep;
  // A/B flat; A/B role-keyed) —
  //   flat: 50-100 reps per category, every cycle (the default).
  //   roleKeyed: 100 reps as Leader, 50-75 as Anchor — identical numbers to
  //     canonical's own role-keyed table (docs/templates/original-531.md
  //     "Assistance — role-keyed").
  // The `anchor` branch here is genuinely reached: original-531-ab is
  // roleEligibility "leader" and never itself runs in the "anchor" role,
  // but anchorAssistanceFollowsLeader (below) makes cycles.ts resolve
  // *this* template's assistance, in the "anchor" role, for whichever
  // original-531 Anchor cycles follow it — which is exactly this branch.
  assistance: {
    byAssistanceProfile: {
      flat: assistanceAt({ min: 50, max: 100 }),
      roleKeyed: {
        default: assistanceAt({ min: 100, max: 100 }),
        leader: assistanceAt({ min: 100, max: 100 }),
        anchor: assistanceAt({ min: 50, max: 75 }),
      },
    },
    defaultAssistanceProfile: "flat",
  },

  // 10 total — the low end of the family's 10-20 range, for two main lifts
  // per session.
  jumpsOrThrows: {
    totalReps: { min: 10, max: 10 },
    guidance: "Two main lifts per session — use the low end of the family's range.",
  },

  conditioning: {
    sessionsPerWeek: 4,
    guidance: "Up to 4 hard days, preferably on training days; off days for a recovery circuit. Restrict assistance volume if pushing conditioning hard.",
  },

  // No specific circuit is printed for this template.
  warmup: [],
};
