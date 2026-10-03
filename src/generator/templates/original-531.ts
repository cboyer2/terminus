// The canonical program. See docs/templates/original-531.md — the
// hand-verification reference for every field below. The family's other two
// templates are implemented alongside this one: original-531-10rep.ts and
// original-531-ab.ts.

import type { AssistanceTarget, Template } from "../types";

const LEADER_ASSISTANCE: AssistanceTarget[] = [
  { category: "push", exerciseOptions: ["Dip", "Push-up", "Overhead triceps extension"], totalReps: { min: 100, max: 100 } },
  { category: "pull", exerciseOptions: ["Row", "Chin-up"], totalReps: { min: 100, max: 100 } },
  { category: "single-leg-core", exerciseOptions: ["Ab wheel", "Hanging leg raise", "Lunge"], totalReps: { min: 100, max: 100 } },
];

export const original531Template: Template = {
  id: "original-531",
  name: "Original 5/3/1",
  // Role-keyed assistance (below) makes this genuinely both — the book is
  // explicit that main work, jumps/throws and conditioning don't change
  // between Leader and Anchor use, only assistance volume does.
  roleEligibility: "both",
  // Self-pairing: the book's own answer to "how do I run Original 5/3/1 as
  // both a Leader and an Anchor" is this template feeding into itself,
  // dropping assistance volume for the Anchor cycles — see
  // docs/templates/original-531.md "Pairings named in the source".
  compatibleAnchorIds: ["original-531"],
  supportedDayCounts: [4],
  tmPercentage: { kind: "range", min: 0.8, max: 0.9, default: 0.9 },
  // Moot for this self-pairing (leader and anchor are the same template
  // either way) but set for consistency with the rest of the family and in
  // case a future Leader ever names original-531 as a compatible anchor
  // without itself setting this flag.
  anchorAssistanceFollowsLeader: true,

  sessionShape: {
    4: {
      workouts: [
        { label: "Squat", liftKeys: ["squat"] },
        { label: "Bench Press", liftKeys: ["bench"] },
        { label: "Deadlift", liftKeys: ["deadlift"] },
        { label: "Press", liftKeys: ["press"] },
      ],
    },
  },

  // Canonical week ordering (week one opens at 65%, not 70%), PR set on the
  // final set of every week. Not role-keyed — unchanged between Leader and
  // Anchor use.
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

  // No supplemental work in this family at all.
  supplemental: "none",

  // Role-keyed — the only field that differs between Leader and Anchor use.
  // "default" is unreachable in practice (this template is never run
  // standalone) but ByRole's object form requires it; the higher (Leader)
  // volume is the safer fallback.
  assistance: {
    default: LEADER_ASSISTANCE,
    leader: LEADER_ASSISTANCE,
    anchor: [
      { category: "push", exerciseOptions: ["Dip", "Push-up", "Overhead triceps extension"], totalReps: { min: 50, max: 75 } },
      { category: "pull", exerciseOptions: ["Row", "Chin-up"], totalReps: { min: 50, max: 75 } },
      { category: "single-leg-core", exerciseOptions: ["Ab wheel", "Hanging leg raise", "Lunge"], totalReps: { min: 50, max: 75 } },
    ],
  },

  // 20 total, the high end of the family's 10-20 range — this template is
  // one main lift per day.
  jumpsOrThrows: {
    totalReps: { min: 20, max: 20 },
    guidance: "One main lift per session — use the high end of the family's range.",
  },

  conditioning: {
    sessionsPerWeek: 4,
    guidance: "Up to 4 hard days, preferably on training days; off days for a recovery circuit. Restrict assistance volume if pushing conditioning hard.",
  },

  // No specific circuit is printed for this template.
  warmup: [],
};
