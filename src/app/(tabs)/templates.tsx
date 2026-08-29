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
// plus bbb-original's two wired options (main-work base, per-lift
// supplemental percentage — the only template with any options wired into
// the generator) and the architecture's seed-rescale-on-percentage-change
// formula. A template's own option rows live in a collapsible "Options"
// submenu nested under its picker, not off in their own unrelated section
// further down the form.

import { usePlan } from "@/hooks/use-plan";
import { useLifts } from "@/hooks/use-lifts";
import { BUTTON_DISABLED_STYLE, BUTTON_STYLE } from "@/components/primary-button";
import { rescaleTrainingMaxSeed } from "@/generator/calc";
import { TEMPLATES } from "@/generator/templates";
import type { LiftKey, MainWorkBase, Program, ProgrammingModelId, Template, TemplateId, TemplateRole } from "@/generator/types";
import { PROGRAMMING_MODELS } from "@/generator/types";
import { Button, Collapsible, FieldGroup, Host, Picker, Row, Spacer, Text as UIText } from "@expo/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-screens/experimental";

const MAIN_WORK_BASE_LABELS: Record<MainWorkBase, string> = {
  "3/5/1": "3/5/1 (all fives)",
  classic: "Classic (all fives)",
  prSet: "5/3/1 sets and reps (PR set)",
};

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
  const [supplementalPercentPicks, setSupplementalPercentPicks] = useState<Record<LiftKey, SupplementalPercentPick>>({
    squat: DEFAULT_SUPPLEMENTAL_PERCENT,
    bench: DEFAULT_SUPPLEMENTAL_PERCENT,
    deadlift: DEFAULT_SUPPLEMENTAL_PERCENT,
    press: DEFAULT_SUPPLEMENTAL_PERCENT,
  });
  const [supplementalLiftPick, setSupplementalLiftPick] = useState<SupplementalLiftPick>("same");
  const [isSaving, setIsSaving] = useState(false);
  // Collapsed by default — most templates have no options, so a template
  // that does shouldn't push its picker rows into view unasked.
  const [bbbOptionsOpen, setBbbOptionsOpen] = useState(false);

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
      const savedOverrides = program.options?.supplementalPercentageByLift as Partial<Record<LiftKey, number>> | undefined;
      setSupplementalPercentPicks({
        squat: savedOverrides?.squat !== undefined ? Math.round(savedOverrides.squat * 100) : DEFAULT_SUPPLEMENTAL_PERCENT,
        bench: savedOverrides?.bench !== undefined ? Math.round(savedOverrides.bench * 100) : DEFAULT_SUPPLEMENTAL_PERCENT,
        deadlift: savedOverrides?.deadlift !== undefined ? Math.round(savedOverrides.deadlift * 100) : DEFAULT_SUPPLEMENTAL_PERCENT,
        press: savedOverrides?.press !== undefined ? Math.round(savedOverrides.press * 100) : DEFAULT_SUPPLEMENTAL_PERCENT,
      });
      setSupplementalLiftPick(program.options?.supplementalOppositeLift === true ? "opposite" : "same");
    }
  }, [program]);

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

  // Only bbb-original has any option wired into the generator so far — see
  // docs/templates/boring-but-big.md "Options" and cycles.ts's
  // resolveMainWorkScheme.
  const isBbbOriginalLeader = leaderTemplateId === "bbb-original";

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

      // Rescale seeds for lifts using the plan-wide default — a lift with
      // its own override keeps it regardless of the program's percentage,
      // so its effective percentage (and therefore its seed) doesn't
      // change. See docs/ARCHITECTURE.md §3 "Changing the percentage."
      const oldPercentage = program?.tmPercentage;
      if (oldPercentage !== undefined && oldPercentage !== tmPercentage && lifts) {
        for (const lift of lifts) {
          if (lift.tmPercentageOverride === null) {
            const rescaledSeed = rescaleTrainingMaxSeed(lift.trainingMaxSeed, oldPercentage, tmPercentage);
            if (rescaledSeed !== lift.trainingMaxSeed) {
              await saveLift({ ...lift, trainingMaxSeed: rescaledSeed });
            }
          }
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
    deloadTrainingDaysPick,
    isBbbOriginalLeader,
    isBeginnerModel,
    leaderTemplateId,
    leaderTrainingDays,
    lifts,
    mainWorkBasePick,
    tmTestTrainingDaysPick,
    supplementalLiftPick,
    supplementalPercentPicks,
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
