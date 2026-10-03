// Programming model, training days, and Leader/Anchor template picker. See
// docs/ARCHITECTURE.md §5 — usePlan() is the seam into generator/; this
// screen reads the template library through it rather than importing
// generator/cycles.ts directly, since it never computes a Plan itself.
//
// Training days is four independent choices, not one: the Leader phase, the
// Anchor phase, the mid-plan 7th Week deload, and the closing 7th Week TM
// test can each run at a different day count — the book allows a 3-day
// Leader into a 4-day Anchor (Original 5/3/1 A/B into the canonical
// Original 5/3/1), and separately lets each 7th Week Protocol occurrence
// run at 2, 3, or 4 days regardless of either phase or the other
// occurrence. See docs/ARCHITECTURE.md §3 and docs/plan-structure.md
// "Placement rules".
//
// Scoped to the core picker (model, days x4, leader, anchor, percentage)
// plus every template's wired options so far — bbb-original's main-work
// base and per-lift supplemental percentage, and original-531-ab's
// assistance volume — a per-lift TM percentage override, and the
// architecture's seed-rescale-on-percentage-change formula. Every one of
// these "extra setting for a choice above" cases is a collapsible "Options"
// submenu nested under the setting it refines (the Leader Template picker,
// the Training Max Percentage picker), not off in its own unrelated section
// further down the form.

import { usePlan } from "@/hooks/use-plan";
import { useLifts } from "@/hooks/use-lifts";
import { BUTTON_DISABLED_STYLE, BUTTON_STYLE } from "@/components/primary-button";
import { rescaleTrainingMaxSeed } from "@/generator/calc";
import { TEMPLATES } from "@/generator/templates";
import type { AssistanceProfile, LiftKey, MainWorkBase, Program, ProgrammingModelId, Template, TemplateId, TemplateRole } from "@/generator/types";
import { DEFAULT_INCREMENT_LB, PROGRAMMING_MODELS } from "@/generator/types";
import { Button, Collapsible, FieldGroup, Host, Picker, Row, Spacer, Text as UIText } from "@expo/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-screens/experimental";

const MAIN_WORK_BASE_LABELS: Record<MainWorkBase, string> = {
  "3/5/1": "3/5/1 (all fives)",
  classic: "Classic (all fives)",
  prSet: "5/3/1 sets and reps (PR set)",
};

// docs/templates/original-531.md "original-531-ab" § Options: two flat
// choices, not a Leader/Anchor split (original-531-ab never runs as an
// Anchor) — see cycles.ts's resolveAssistance and the ab-template's own
// comment on why the "roleKeyed" value name doesn't mean this varies by
// role.
const ASSISTANCE_PROFILE_ITEMS: { label: string; value: AssistanceProfile }[] = [
  { label: "50-100 reps (default)", value: "flat" },
  { label: "100 reps", value: "roleKeyed" },
];

const LIFT_ORDER: LiftKey[] = ["squat", "bench", "deadlift", "press"];
const LIFT_LABELS: Record<LiftKey, string> = {
  squat: "Squat",
  bench: "Bench Press",
  deadlift: "Deadlift",
  press: "Press",
};

/** Sentinel meaning "no override — use the template's own default (50%)". */
const DEFAULT_SUPPLEMENTAL_PERCENT = "default" as const;
type SupplementalPercentPick = typeof DEFAULT_SUPPLEMENTAL_PERCENT | number;

// docs/templates/boring-but-big.md "Options": "40-60%, per lift ... 50-55%
// recommended." A small set of named steps, not a continuous range — same
// convention as every other percentage choice in this app. Listed in
// ascending order, with 50% appearing once (as the default sentinel) rather
// than twice.
const SUPPLEMENTAL_PERCENT_ITEMS: { label: string; value: SupplementalPercentPick }[] = [
  { label: "40%", value: 40 },
  { label: "45%", value: 45 },
  { label: "50% (default)", value: DEFAULT_SUPPLEMENTAL_PERCENT },
  { label: "55%", value: 55 },
  { label: "60%", value: 60 },
];

// docs/templates/boring-but-big.md "Options": "Supplemental lift: same as
// main · opposite — bench main, press supplemental." One program-wide
// choice, not per-lift, per the owner — squat/deadlift and bench/press are
// the only pairings, fixed in cycles.ts's OPPOSITE_LIFT.
type SupplementalLiftPick = "same" | "opposite";
const SUPPLEMENTAL_LIFT_ITEMS: { label: string; value: SupplementalLiftPick }[] = [
  { label: "Same as main", value: "same" },
  { label: "Opposite lift", value: "opposite" },
];

// docs/templates/beginner.md "Options": "Supplemental source, per lift —
// First Set Last / Second Set Last, derived from the lift's TM percentage
// (FSL at 90%, SSL at 85%) unless overridden here." Also the book's stall
// remedy 5, "switch to SSL."
const DEFAULT_SUPPLEMENTAL_SOURCE = "default" as const;
type SupplementalSourcePick = typeof DEFAULT_SUPPLEMENTAL_SOURCE | "firstSetLast" | "secondSetLast";
const SUPPLEMENTAL_SOURCE_ITEMS: { label: string; value: SupplementalSourcePick }[] = [
  { label: "Plan default", value: DEFAULT_SUPPLEMENTAL_SOURCE },
  { label: "First Set Last", value: "firstSetLast" },
  { label: "Second Set Last", value: "secondSetLast" },
];

// docs/templates/beginner.md "Options": "Supplemental set count — 5x5 /
// 7-10x5." Also stall remedy 3, "increase supplemental volume to 7-10 x 5 at
// FSL" — reps stay fixed at 5, only the set count changes.
const DEFAULT_SUPPLEMENTAL_SET_COUNT = "default" as const;
type SupplementalSetCountPick = typeof DEFAULT_SUPPLEMENTAL_SET_COUNT | number;
const SUPPLEMENTAL_SET_COUNT_ITEMS: { label: string; value: SupplementalSetCountPick }[] = [
  { label: "5 (default)", value: DEFAULT_SUPPLEMENTAL_SET_COUNT },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
  { label: "9", value: 9 },
  { label: "10", value: 10 },
];

// docs/templates/beginner.md "Options": "PR / goal set on the final main
// set — off / on." Also stall remedy 2, "push the last set for a PR or goal,
// if technique is sound."
const PR_SET_ITEMS: { label: string; value: "off" | "on" }[] = [
  { label: "Off", value: "off" },
  { label: "On", value: "on" },
];

// docs/templates/beginner.md "Options": "Squat and deadlift increment, per
// lift — 5 lb · 10 lb, default 10 lb." 10 lb is the standard lift-level
// default, unchanged by Beginner; 5 lb is the book's own alternative for a
// lift you're weak in (beginner.md "Progression"), not a blanket override.
// Unlike every other option on this screen, this one writes straight to
// Lift.increment (via saveLift), not program.options — the generator reads
// it directly off the lift, the same as tmPercentageOverride, with no
// template-level resolution step. Squat/deadlift only: bench/press's
// standard default is already 5 lb, so the book offers no alternative for
// them here.
type IncrementPick = 5 | 10;
const INCREMENT_ITEMS: { label: string; value: IncrementPick }[] = [
  { label: "5 lb", value: 5 },
  { label: "10 lb (default)", value: 10 },
];

/** Sentinel meaning "no override — use the plan-wide percentage." */
const PERCENTAGE_OVERRIDE_DEFAULT = "default" as const;
type PercentageOverridePick = typeof PERCENTAGE_OVERRIDE_DEFAULT | number;

// A per-lift override of the plan-wide TM percentage — niche (Beginner's
// 90%/85%-per-lift split is the book's own example, but most plans never
// touch this), so it lives in its own collapsed-by-default "Advanced"
// section rather than the main setup flow. Same discrete-steps convention
// as every other percentage choice in this app; the range spans what
// docs/plan-structure.md's "On training maxes generally" cites across the
// book (77% low end, 90% high end), rounded to 5% steps.
const PERCENTAGE_OVERRIDE_ITEMS: { label: string; value: PercentageOverridePick }[] = [
  { label: "Plan default", value: PERCENTAGE_OVERRIDE_DEFAULT },
  { label: "70%", value: 70 },
  { label: "75%", value: 75 },
  { label: "80%", value: 80 },
  { label: "85%", value: 85 },
  { label: "90%", value: 90 },
  { label: "95%", value: 95 },
];

const MODEL_LABELS: Record<ProgrammingModelId, string> = {
  beginner: "Beginner",
  "2+1": "2 Leader / 1 Anchor",
  "2+2": "2 Leader / 2 Anchor",
  "3+2": "3 Leader / 2 Anchor",
};

const MODEL_IDS = Object.keys(PROGRAMMING_MODELS) as ProgrammingModelId[];

function eligibleForRole(template: Template, role: TemplateRole): boolean {
  if (role === "standalone") return template.roleEligibility === "neither";
  if (role === "leader") return template.roleEligibility === "leader" || template.roleEligibility === "both";
  return template.roleEligibility === "anchor" || template.roleEligibility === "both";
}

function percentageChoicesFor(template: Template | undefined): number[] {
  if (!template) return [];
  const tp = template.tmPercentage;
  if (tp.kind === "fixed") return [tp.value];
  const steps: number[] = [];
  for (let p = tp.min; p <= tp.max + 1e-9; p += 0.05) {
    steps.push(Math.round(p * 100) / 100);
  }
  return steps;
}

function preferredPercentage(template: Template | undefined): number {
  const tp = template?.tmPercentage;
  if (!tp) return 0.9;
  return tp.kind === "fixed" ? tp.value : tp.default;
}

function PickerRow({
  label,
  selectedValue,
  onValueChange,
  items,
}: {
  label: string;
  selectedValue: string | number;
  onValueChange: (value: string | number) => void;
  items: { label: string; value: string | number }[];
}) {
  return (
    // alignment="center" — Row's own default ("start", i.e. top-aligned
    // cross-axis) top-aligns children instead of centering them, which
    // reads as the label sitting high whenever the Picker's rendered
    // height exceeds the label text's.
    <Row alignment="center">
      <UIText>{label}</UIText>
      <Spacer />
      <Picker selectedValue={selectedValue} onValueChange={onValueChange}>
        {items.map((item) => (
          <Picker.Item key={String(item.value)} label={item.label} value={item.value} />
        ))}
      </Picker>
    </Row>
  );
}

export default function TemplatesScreen() {
  const { program, saveProgram } = usePlan();
  const { lifts, saveLift } = useLifts();

  // Raw picks — the user's last explicit choice for each field, or the
  // program's saved value once it loads. These can go "stale" (e.g. a
  // training-days change can make the previously picked leader template
  // invalid) — that's resolved below by computing an *effective* value at
  // render time rather than by an effect writing a correction back into
  // state, which the React Compiler's lint rule flags as unnecessary
  // cascading renders (see "You Might Not Need an Effect").
  const [programmingModel, setProgrammingModel] = useState<ProgrammingModelId>("beginner");
  const [leaderTrainingDaysPick, setLeaderTrainingDaysPick] = useState<2 | 3 | 4>(3);
  const [anchorTrainingDaysPick, setAnchorTrainingDaysPick] = useState<2 | 3 | 4>(4);
  const [deloadTrainingDaysPick, setDeloadTrainingDaysPick] = useState<2 | 3 | 4>(4);
  const [tmTestTrainingDaysPick, setTmTestTrainingDaysPick] = useState<2 | 3 | 4>(3);
  const [leaderTemplateIdPick, setLeaderTemplateIdPick] = useState<TemplateId>("");
  const [anchorTemplateIdPick, setAnchorTemplateIdPick] = useState<TemplateId | null>(null);
  const [tmPercentagePick, setTmPercentagePick] = useState<number>(0.9);
  const [mainWorkBasePick, setMainWorkBasePick] = useState<MainWorkBase>("3/5/1");
  const [assistanceProfilePick, setAssistanceProfilePick] = useState<AssistanceProfile>("flat");
  const [supplementalPercentPicks, setSupplementalPercentPicks] = useState<Record<LiftKey, SupplementalPercentPick>>({
    squat: DEFAULT_SUPPLEMENTAL_PERCENT,
    bench: DEFAULT_SUPPLEMENTAL_PERCENT,
    deadlift: DEFAULT_SUPPLEMENTAL_PERCENT,
    press: DEFAULT_SUPPLEMENTAL_PERCENT,
  });
  const [supplementalLiftPick, setSupplementalLiftPick] = useState<SupplementalLiftPick>("same");
  const [supplementalSourcePicks, setSupplementalSourcePicks] = useState<Record<LiftKey, SupplementalSourcePick>>({
    squat: DEFAULT_SUPPLEMENTAL_SOURCE,
    bench: DEFAULT_SUPPLEMENTAL_SOURCE,
    deadlift: DEFAULT_SUPPLEMENTAL_SOURCE,
    press: DEFAULT_SUPPLEMENTAL_SOURCE,
  });
  const [supplementalSetCountPicks, setSupplementalSetCountPicks] = useState<Record<LiftKey, SupplementalSetCountPick>>({
    squat: DEFAULT_SUPPLEMENTAL_SET_COUNT,
    bench: DEFAULT_SUPPLEMENTAL_SET_COUNT,
    deadlift: DEFAULT_SUPPLEMENTAL_SET_COUNT,
    press: DEFAULT_SUPPLEMENTAL_SET_COUNT,
  });
  const [prSetOnFinalSetPicks, setPrSetOnFinalSetPicks] = useState<Record<LiftKey, "off" | "on">>({
    squat: "off",
    bench: "off",
    deadlift: "off",
    press: "off",
  });
  const [squatIncrementPick, setSquatIncrementPick] = useState<IncrementPick>(10);
  const [deadliftIncrementPick, setDeadliftIncrementPick] = useState<IncrementPick>(10);
  const [percentageOverridePicks, setPercentageOverridePicks] = useState<Record<LiftKey, PercentageOverridePick>>({
    squat: PERCENTAGE_OVERRIDE_DEFAULT,
    bench: PERCENTAGE_OVERRIDE_DEFAULT,
    deadlift: PERCENTAGE_OVERRIDE_DEFAULT,
    press: PERCENTAGE_OVERRIDE_DEFAULT,
  });
  const [isSaving, setIsSaving] = useState(false);
  // Collapsed by default — most templates have no options, so a template
  // that does shouldn't push its picker rows into view unasked.
  const [bbbOptionsOpen, setBbbOptionsOpen] = useState(false);
  const [originalAbOptionsOpen, setOriginalAbOptionsOpen] = useState(false);
  const [beginnerOptionsOpen, setBeginnerOptionsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Pre-fill once from the existing program, if any — after that, the
  // user's own edits win over a background refetch. This effect genuinely
  // syncs with an external, asynchronously-loaded resource, unlike the
  // derived values below.
  const initialized = useRef(false);
  useEffect(() => {
    if (program && !initialized.current) {
      initialized.current = true;
      setProgrammingModel(program.programmingModel);
      setLeaderTrainingDaysPick(program.leaderTrainingDays);
      setAnchorTrainingDaysPick(program.anchorTrainingDays ?? 4);
      setDeloadTrainingDaysPick(program.deloadTrainingDays ?? 4);
      setTmTestTrainingDaysPick(program.tmTestTrainingDays);
      setLeaderTemplateIdPick(program.leaderTemplateId);
      setAnchorTemplateIdPick(program.anchorTemplateId);
      setTmPercentagePick(program.tmPercentage);
      const savedBase = program.options?.mainWorkBase;
      setMainWorkBasePick(savedBase === "classic" || savedBase === "prSet" ? savedBase : "3/5/1");
      const savedAssistanceProfile = program.options?.assistanceProfile;
      setAssistanceProfilePick(savedAssistanceProfile === "roleKeyed" ? "roleKeyed" : "flat");
      const savedOverrides = program.options?.supplementalPercentageByLift as Partial<Record<LiftKey, number>> | undefined;
      setSupplementalPercentPicks({
        squat: savedOverrides?.squat !== undefined ? Math.round(savedOverrides.squat * 100) : DEFAULT_SUPPLEMENTAL_PERCENT,
        bench: savedOverrides?.bench !== undefined ? Math.round(savedOverrides.bench * 100) : DEFAULT_SUPPLEMENTAL_PERCENT,
        deadlift: savedOverrides?.deadlift !== undefined ? Math.round(savedOverrides.deadlift * 100) : DEFAULT_SUPPLEMENTAL_PERCENT,
        press: savedOverrides?.press !== undefined ? Math.round(savedOverrides.press * 100) : DEFAULT_SUPPLEMENTAL_PERCENT,
      });
      setSupplementalLiftPick(program.options?.supplementalOppositeLift === true ? "opposite" : "same");
      const savedSourceOverrides = program.options?.supplementalSourceByLift as
        | Partial<Record<LiftKey, "firstSetLast" | "secondSetLast">>
        | undefined;
      setSupplementalSourcePicks({
        squat: savedSourceOverrides?.squat ?? DEFAULT_SUPPLEMENTAL_SOURCE,
        bench: savedSourceOverrides?.bench ?? DEFAULT_SUPPLEMENTAL_SOURCE,
        deadlift: savedSourceOverrides?.deadlift ?? DEFAULT_SUPPLEMENTAL_SOURCE,
        press: savedSourceOverrides?.press ?? DEFAULT_SUPPLEMENTAL_SOURCE,
      });
      const savedSetCountOverrides = program.options?.supplementalSetCountByLift as Partial<Record<LiftKey, number>> | undefined;
      setSupplementalSetCountPicks({
        squat: savedSetCountOverrides?.squat ?? DEFAULT_SUPPLEMENTAL_SET_COUNT,
        bench: savedSetCountOverrides?.bench ?? DEFAULT_SUPPLEMENTAL_SET_COUNT,
        deadlift: savedSetCountOverrides?.deadlift ?? DEFAULT_SUPPLEMENTAL_SET_COUNT,
        press: savedSetCountOverrides?.press ?? DEFAULT_SUPPLEMENTAL_SET_COUNT,
      });
      const savedPrSetOverrides = program.options?.prSetOnFinalSetByLift as Partial<Record<LiftKey, boolean>> | undefined;
      setPrSetOnFinalSetPicks({
        squat: savedPrSetOverrides?.squat ? "on" : "off",
        bench: savedPrSetOverrides?.bench ? "on" : "off",
        deadlift: savedPrSetOverrides?.deadlift ? "on" : "off",
        press: savedPrSetOverrides?.press ? "on" : "off",
      });
    }
  }, [program]);

  // Lifts load independently of program (a separate hook, a separate
  // fetch), so this is its own pre-fill effect rather than folded into the
  // one above.
  const liftsInitialized = useRef(false);
  useEffect(() => {
    if (lifts && !liftsInitialized.current) {
      liftsInitialized.current = true;
      const overrideFor = (liftKey: LiftKey): PercentageOverridePick => {
        const override = lifts.find((l) => l.liftKey === liftKey)?.tmPercentageOverride;
        return override != null ? Math.round(override * 100) : PERCENTAGE_OVERRIDE_DEFAULT;
      };
      setPercentageOverridePicks({
        squat: overrideFor("squat"),
        bench: overrideFor("bench"),
        deadlift: overrideFor("deadlift"),
        press: overrideFor("press"),
      });
      setSquatIncrementPick(lifts.find((l) => l.liftKey === "squat")?.increment === 5 ? 5 : 10);
      setDeadliftIncrementPick(lifts.find((l) => l.liftKey === "deadlift")?.increment === 5 ? 5 : 10);
    }
  }, [lifts]);

  const isBeginnerModel = programmingModel === "beginner";
  const allTemplates = useMemo(() => Object.values(TEMPLATES), []);

  const leaderAvailableDayCounts = useMemo(() => {
    const role: TemplateRole = isBeginnerModel ? "standalone" : "leader";
    const days = new Set<number>();
    for (const t of allTemplates) {
      if (eligibleForRole(t, role)) {
        t.supportedDayCounts.forEach((d) => days.add(d));
      }
    }
    return [...days].sort((a, b) => a - b) as (2 | 3 | 4)[];
  }, [allTemplates, isBeginnerModel]);

  const leaderTrainingDays = leaderAvailableDayCounts.includes(leaderTrainingDaysPick)
    ? leaderTrainingDaysPick
    : (leaderAvailableDayCounts[0] ?? leaderTrainingDaysPick);

  const leaderOptions = useMemo(() => {
    const role: TemplateRole = isBeginnerModel ? "standalone" : "leader";
    return allTemplates.filter((t) => eligibleForRole(t, role) && t.supportedDayCounts.includes(leaderTrainingDays));
  }, [allTemplates, isBeginnerModel, leaderTrainingDays]);

  const leaderTemplateId = leaderOptions.some((t) => t.id === leaderTemplateIdPick) ? leaderTemplateIdPick : (leaderOptions[0]?.id ?? "");
  const leaderTemplate = leaderTemplateId ? TEMPLATES[leaderTemplateId] : undefined;

  // The Anchor's day count is chosen independently of the Leader's — the
  // book allows a 3-day Leader into a 4-day Anchor (e.g. Original 5/3/1 A/B
  // into the canonical Original 5/3/1). See the module comment.
  const anchorAvailableDayCounts = useMemo(() => {
    if (isBeginnerModel || !leaderTemplate) return [];
    const days = new Set<number>();
    for (const t of allTemplates) {
      if (eligibleForRole(t, "anchor") && leaderTemplate.compatibleAnchorIds.includes(t.id)) {
        t.supportedDayCounts.forEach((d) => days.add(d));
      }
    }
    return [...days].sort((a, b) => a - b) as (2 | 3 | 4)[];
  }, [allTemplates, isBeginnerModel, leaderTemplate]);

  const anchorTrainingDays = anchorAvailableDayCounts.includes(anchorTrainingDaysPick)
    ? anchorTrainingDaysPick
    : (anchorAvailableDayCounts[0] ?? anchorTrainingDaysPick);

  const anchorOptions = useMemo(() => {
    if (isBeginnerModel || !leaderTemplate) return [];
    return allTemplates.filter(
      (t) => eligibleForRole(t, "anchor") && t.supportedDayCounts.includes(anchorTrainingDays) && leaderTemplate.compatibleAnchorIds.includes(t.id)
    );
  }, [allTemplates, isBeginnerModel, leaderTemplate, anchorTrainingDays]);

  const anchorTemplateId = isBeginnerModel
    ? null
    : anchorOptions.some((t) => t.id === anchorTemplateIdPick)
      ? anchorTemplateIdPick
      : (anchorOptions[0]?.id ?? null);

  const percentageChoices = useMemo(() => percentageChoicesFor(leaderTemplate), [leaderTemplate]);
  const tmPercentage = percentageChoices.includes(tmPercentagePick)
    ? tmPercentagePick
    : percentageChoices.includes(preferredPercentage(leaderTemplate))
      ? preferredPercentage(leaderTemplate)
      : (percentageChoices[0] ?? tmPercentagePick);

  // Only bbb-original and original-531-ab have any options wired into the
  // generator so far — see docs/templates/boring-but-big.md "Options",
  // docs/templates/original-531.md "original-531-ab" § Options, and
  // cycles.ts's resolveMainWorkScheme / resolveAssistance.
  const isBbbOriginalLeader = leaderTemplateId === "bbb-original";
  const isOriginalAbLeader = leaderTemplateId === "original-531-ab";

  const handleSave = useCallback(async () => {
    if (!leaderTemplateId) {
      Alert.alert("Pick a template", "No template is available for this combination yet.");
      return;
    }
    const options: Record<string, unknown> = { ...program?.options };
    if (isBbbOriginalLeader) {
      options.mainWorkBase = mainWorkBasePick;
      const overrides: Partial<Record<LiftKey, number>> = {};
      for (const liftKey of LIFT_ORDER) {
        const pick = supplementalPercentPicks[liftKey];
        if (pick !== DEFAULT_SUPPLEMENTAL_PERCENT) {
          overrides[liftKey] = pick / 100;
        }
      }
      if (Object.keys(overrides).length > 0) {
        options.supplementalPercentageByLift = overrides;
      } else {
        delete options.supplementalPercentageByLift;
      }
      if (supplementalLiftPick === "opposite") {
        options.supplementalOppositeLift = true;
      } else {
        delete options.supplementalOppositeLift;
      }
    }
    if (isOriginalAbLeader) {
      options.assistanceProfile = assistanceProfilePick;
    }
    if (isBeginnerModel) {
      const sourceOverrides: Partial<Record<LiftKey, "firstSetLast" | "secondSetLast">> = {};
      const setCountOverrides: Partial<Record<LiftKey, number>> = {};
      const prSetOverrides: Partial<Record<LiftKey, boolean>> = {};
      for (const liftKey of LIFT_ORDER) {
        const sourcePick = supplementalSourcePicks[liftKey];
        if (sourcePick !== DEFAULT_SUPPLEMENTAL_SOURCE) {
          sourceOverrides[liftKey] = sourcePick;
        }
        const setCountPick = supplementalSetCountPicks[liftKey];
        if (setCountPick !== DEFAULT_SUPPLEMENTAL_SET_COUNT) {
          setCountOverrides[liftKey] = setCountPick;
        }
        if (prSetOnFinalSetPicks[liftKey] === "on") {
          prSetOverrides[liftKey] = true;
        }
      }
      if (Object.keys(sourceOverrides).length > 0) {
        options.supplementalSourceByLift = sourceOverrides;
      } else {
        delete options.supplementalSourceByLift;
      }
      if (Object.keys(setCountOverrides).length > 0) {
        options.supplementalSetCountByLift = setCountOverrides;
      } else {
        delete options.supplementalSetCountByLift;
      }
      if (Object.keys(prSetOverrides).length > 0) {
        options.prSetOnFinalSetByLift = prSetOverrides;
      } else {
        delete options.prSetOnFinalSetByLift;
      }
    }
    const next: Program = {
      programmingModel,
      leaderTrainingDays,
      anchorTrainingDays: isBeginnerModel ? null : anchorTrainingDays,
      deloadTrainingDays: isBeginnerModel ? null : deloadTrainingDaysPick,
      tmTestTrainingDays: tmTestTrainingDaysPick,
      leaderTemplateId,
      anchorTemplateId,
      tmPercentage,
      options,
    };
    setIsSaving(true);
    try {
      await saveProgram(next);

      // Rescale seeds wherever a lift's *effective* percentage just
      // changed — whether that's because the plan-wide default moved (a
      // lift with no override), because this save sets, changes, or clears
      // a per-lift override, or both at once. See docs/ARCHITECTURE.md §3
      // "Changing the percentage."
      const oldPercentage = program?.tmPercentage;
      if (oldPercentage !== undefined && lifts) {
        for (const lift of lifts) {
          const overridePick = percentageOverridePicks[lift.liftKey];
          const newOverride = overridePick === PERCENTAGE_OVERRIDE_DEFAULT ? null : overridePick / 100;
          const oldEffectivePercentage = lift.tmPercentageOverride ?? oldPercentage;
          const newEffectivePercentage = newOverride ?? tmPercentage;

          // Squat/deadlift increment override — a Lift field, not a
          // program.options entry, exactly like tmPercentageOverride above.
          // Only Beginner exposes this picker; every other model has no
          // surface for it at all, so a 5 lb override left over from a prior
          // Beginner run must reset to the standard default here rather than
          // linger on the lift indefinitely (bench/press never get touched —
          // neither model offers an override for them).
          const newIncrement =
            lift.liftKey !== "squat" && lift.liftKey !== "deadlift"
              ? lift.increment
              : isBeginnerModel
                ? lift.liftKey === "squat"
                  ? squatIncrementPick
                  : deadliftIncrementPick
                : DEFAULT_INCREMENT_LB[lift.liftKey];

          const percentageChanged = oldEffectivePercentage !== newEffectivePercentage;
          const overrideFieldChanged = newOverride !== lift.tmPercentageOverride;
          const incrementChanged = newIncrement !== lift.increment;
          if (!percentageChanged && !overrideFieldChanged && !incrementChanged) continue;

          const rescaledSeed = percentageChanged
            ? rescaleTrainingMaxSeed(lift.trainingMaxSeed, oldEffectivePercentage, newEffectivePercentage)
            : lift.trainingMaxSeed;
          await saveLift({ ...lift, tmPercentageOverride: newOverride, trainingMaxSeed: rescaledSeed, increment: newIncrement });
        }
      }

      Alert.alert("Saved", "Your program has been updated.");
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  }, [
    anchorTemplateId,
    anchorTrainingDays,
    assistanceProfilePick,
    deadliftIncrementPick,
    deloadTrainingDaysPick,
    isBbbOriginalLeader,
    isOriginalAbLeader,
    isBeginnerModel,
    leaderTemplateId,
    leaderTrainingDays,
    lifts,
    mainWorkBasePick,
    percentageOverridePicks,
    prSetOnFinalSetPicks,
    squatIncrementPick,
    tmTestTrainingDaysPick,
    supplementalLiftPick,
    supplementalPercentPicks,
    supplementalSetCountPicks,
    supplementalSourcePicks,
    program,
    programmingModel,
    saveLift,
    saveProgram,
    tmPercentage,
  ]);

  return (
    <SafeAreaView edges={{ bottom: true }} style={styles.safeArea}>
      <Host style={styles.host}>
        <FieldGroup>
          <FieldGroup.Section title="Programming Model">
            <PickerRow
              label="Model"
              selectedValue={programmingModel}
              onValueChange={(v) => setProgrammingModel(v as ProgrammingModelId)}
              items={MODEL_IDS.map((id) => ({ label: MODEL_LABELS[id], value: id }))}
            />
          </FieldGroup.Section>

          <FieldGroup.Section title={isBeginnerModel ? "Training Days" : "Leader Training Days"}>
            <PickerRow
              label="Days per week"
              selectedValue={leaderTrainingDays}
              onValueChange={(v) => setLeaderTrainingDaysPick(v as 2 | 3 | 4)}
              items={leaderAvailableDayCounts.map((d) => ({ label: String(d), value: d }))}
            />
          </FieldGroup.Section>

          <FieldGroup.Section title={isBeginnerModel ? "Template" : "Leader Template"}>
            <PickerRow
              label="Template"
              selectedValue={leaderTemplateId}
              onValueChange={(v) => setLeaderTemplateIdPick(v as TemplateId)}
              items={leaderOptions.map((t) => ({ label: t.name, value: t.id }))}
            />
            {/* A submenu nested under the template it configures, rather
                than its own always-open section — most templates have no
                options at all, so a disclosure row reads as "extra settings
                for this choice" instead of permanently claiming form space. */}
            {isBbbOriginalLeader && (
              <Collapsible isOpen={bbbOptionsOpen} onOpenChange={setBbbOptionsOpen} label="Options">
                <PickerRow
                  label="Main Work Base"
                  selectedValue={mainWorkBasePick}
                  onValueChange={(v) => setMainWorkBasePick(v as MainWorkBase)}
                  items={(Object.keys(MAIN_WORK_BASE_LABELS) as MainWorkBase[]).map((base) => ({
                    label: MAIN_WORK_BASE_LABELS[base],
                    value: base,
                  }))}
                />
                {/* Program-wide, not per-lift — squat/deadlift and
                    bench/press are the only pairings, fixed in cycles.ts. */}
                <PickerRow
                  label="Supplemental Lift"
                  selectedValue={supplementalLiftPick}
                  onValueChange={(v) => setSupplementalLiftPick(v as SupplementalLiftPick)}
                  items={SUPPLEMENTAL_LIFT_ITEMS}
                />
                {LIFT_ORDER.map((liftKey) => (
                  <PickerRow
                    key={liftKey}
                    label={`${LIFT_LABELS[liftKey]} Supplemental %`}
                    selectedValue={supplementalPercentPicks[liftKey]}
                    onValueChange={(v) => setSupplementalPercentPicks((prev) => ({ ...prev, [liftKey]: v as SupplementalPercentPick }))}
                    items={SUPPLEMENTAL_PERCENT_ITEMS}
                  />
                ))}
              </Collapsible>
            )}
            {isOriginalAbLeader && (
              <Collapsible isOpen={originalAbOptionsOpen} onOpenChange={setOriginalAbOptionsOpen} label="Options">
                <PickerRow
                  label="Assistance Volume"
                  selectedValue={assistanceProfilePick}
                  onValueChange={(v) => setAssistanceProfilePick(v as AssistanceProfile)}
                  items={ASSISTANCE_PROFILE_ITEMS}
                />
              </Collapsible>
            )}
            {/* Beginner's stall remedies (docs/templates/beginner.md
                "Stall") aren't a single event — each is a per-lift knob a
                lifter reaches for independently, so all three live together
                in one submenu rather than being scattered near whichever
                setting they most resemble. */}
            {isBeginnerModel && (
              <Collapsible isOpen={beginnerOptionsOpen} onOpenChange={setBeginnerOptionsOpen} label="Options">
                {LIFT_ORDER.map((liftKey) => (
                  <PickerRow
                    key={`source-${liftKey}`}
                    label={`${LIFT_LABELS[liftKey]} Supplemental Source`}
                    selectedValue={supplementalSourcePicks[liftKey]}
                    onValueChange={(v) => setSupplementalSourcePicks((prev) => ({ ...prev, [liftKey]: v as SupplementalSourcePick }))}
                    items={SUPPLEMENTAL_SOURCE_ITEMS}
                  />
                ))}
                {LIFT_ORDER.map((liftKey) => (
                  <PickerRow
                    key={`setcount-${liftKey}`}
                    label={`${LIFT_LABELS[liftKey]} Supplemental Sets`}
                    selectedValue={supplementalSetCountPicks[liftKey]}
                    onValueChange={(v) => setSupplementalSetCountPicks((prev) => ({ ...prev, [liftKey]: v as SupplementalSetCountPick }))}
                    items={SUPPLEMENTAL_SET_COUNT_ITEMS}
                  />
                ))}
                {LIFT_ORDER.map((liftKey) => (
                  <PickerRow
                    key={`prset-${liftKey}`}
                    label={`${LIFT_LABELS[liftKey]} PR/Goal Set`}
                    selectedValue={prSetOnFinalSetPicks[liftKey]}
                    onValueChange={(v) => setPrSetOnFinalSetPicks((prev) => ({ ...prev, [liftKey]: v as "off" | "on" }))}
                    items={PR_SET_ITEMS}
                  />
                ))}
                {/* Increment lives on the lift's own row (Lift.increment),
                    not program.options — only shown once the lift itself
                    exists, same gating as the TM percentage override below. */}
                {lifts?.some((l) => l.liftKey === "squat") && (
                  <PickerRow
                    label="Squat Increment"
                    selectedValue={squatIncrementPick}
                    onValueChange={(v) => setSquatIncrementPick(v as IncrementPick)}
                    items={INCREMENT_ITEMS}
                  />
                )}
                {lifts?.some((l) => l.liftKey === "deadlift") && (
                  <PickerRow
                    label="Deadlift Increment"
                    selectedValue={deadliftIncrementPick}
                    onValueChange={(v) => setDeadliftIncrementPick(v as IncrementPick)}
                    items={INCREMENT_ITEMS}
                  />
                )}
              </Collapsible>
            )}
          </FieldGroup.Section>

          {/* Sits between the Leader and Anchor sections — it's the plan's
              transition point between the two phases (docs/plan-structure.md
              "Placement rules"), so it reads more naturally there than
              lumped in with the plan-wide pickers below. Independent of
              every phase's day count and of the closing TM test's — the
              book allows each 7th Week Protocol occurrence to run at 2, 3,
              or 4 days regardless of the surrounding phase or the other
              occurrence. No deload exists for the Beginner model (a single
              phase has no transition to deload between). */}
          {!isBeginnerModel && (
            <FieldGroup.Section title="7th Week Deload">
              <PickerRow
                label="Days per week"
                selectedValue={deloadTrainingDaysPick}
                onValueChange={(v) => setDeloadTrainingDaysPick(v as 2 | 3 | 4)}
                items={[2, 3, 4].map((d) => ({ label: String(d), value: d }))}
              />
            </FieldGroup.Section>
          )}

          {!isBeginnerModel && (
            <FieldGroup.Section title="Anchor Training Days">
              <PickerRow
                label="Days per week"
                selectedValue={anchorTrainingDays}
                onValueChange={(v) => setAnchorTrainingDaysPick(v as 2 | 3 | 4)}
                items={anchorAvailableDayCounts.map((d) => ({ label: String(d), value: d }))}
              />
            </FieldGroup.Section>
          )}

          {!isBeginnerModel && (
            <FieldGroup.Section title="Anchor Template">
              <PickerRow
                label="Template"
                selectedValue={anchorTemplateId ?? ""}
                onValueChange={(v) => setAnchorTemplateIdPick(v as TemplateId)}
                items={anchorOptions.map((t) => ({ label: t.name, value: t.id }))}
              />
            </FieldGroup.Section>
          )}

          <FieldGroup.Section title="7th Week TM Test">
            <PickerRow
              label="Days per week"
              selectedValue={tmTestTrainingDaysPick}
              onValueChange={(v) => setTmTestTrainingDaysPick(v as 2 | 3 | 4)}
              items={[2, 3, 4].map((d) => ({ label: String(d), value: d }))}
            />
          </FieldGroup.Section>

          <FieldGroup.Section title="Training Max Percentage">
            <PickerRow
              label="Percentage"
              selectedValue={tmPercentage}
              onValueChange={(v) => setTmPercentagePick(v as number)}
              items={percentageChoices.map((p) => ({ label: `${Math.round(p * 100)}%`, value: p }))}
            />
            {/* Nested the same way as bbb-original's own Options submenu
                under Leader Template — a submenu under the setting it
                refines, collapsed by default since it's used rarely. Only
                shown once at least one lift exists: an override lives on
                the lift's own stored row (data/lifts.ts), which doesn't
                exist until a first max is entered on the Maxes tab, so
                there's nothing yet to attach an override to before then. */}
            {lifts && lifts.length > 0 && (
              <Collapsible isOpen={advancedOpen} onOpenChange={setAdvancedOpen} label="Options">
                {LIFT_ORDER.filter((liftKey) => lifts.some((l) => l.liftKey === liftKey)).map((liftKey) => (
                  <PickerRow
                    key={liftKey}
                    label={LIFT_LABELS[liftKey]}
                    selectedValue={percentageOverridePicks[liftKey]}
                    onValueChange={(v) => setPercentageOverridePicks((prev) => ({ ...prev, [liftKey]: v as PercentageOverridePick }))}
                    items={PERCENTAGE_OVERRIDE_ITEMS}
                  />
                ))}
              </Collapsible>
            )}
            {/* A section footer, not a row — moving the button to a plain
                RN sibling below the Host cleared the gray row background
                but then sat outside the Form's own native, safe-area-aware
                scrolling, so it rendered underneath the floating NativeTabs
                bar (whose footprint isn't exposed to RN's layout system —
                see _layout.tsx). SwiftUI renders a Section's footer below
                its grouped box in the plain page background, which drops
                the row background *and* keeps the button inside the Form's
                own scroll content, so it inherits the same tab-bar-safe
                bottom inset every other row already gets for free. */}
            <FieldGroup.SectionFooter>
              <Row alignment="center">
                <Spacer />
                <Button
                  variant="filled"
                  label={isSaving ? "Saving..." : "Save"}
                  onPress={handleSave}
                  disabled={isSaving}
                  style={isSaving ? BUTTON_DISABLED_STYLE : BUTTON_STYLE}
                />
                <Spacer />
              </Row>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  host: {
    flex: 1,
  },
});
