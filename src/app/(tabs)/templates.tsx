// Programming model, training days, and Leader/Anchor template picker. See
// docs/ARCHITECTURE.md §5 — usePlan() is the seam into generator/; this
// screen reads the template library through it rather than importing
// generator/cycles.ts directly, since it never computes a Plan itself.
//
// Scoped to the core picker (model, days, leader, anchor, percentage) plus
// bbb-original's two wired options (main-work base, per-lift supplemental
// percentage — the only template with any options wired into the generator)
// and the architecture's seed-rescale-on-percentage-change formula. A
// template's own option rows sit directly under its picker, not off in
// their own unrelated section further down the form.

import { usePlan } from "@/hooks/use-plan";
import { useLifts } from "@/hooks/use-lifts";
import { rescaleTrainingMaxSeed } from "@/generator/calc";
import { TEMPLATES } from "@/generator/templates";
import type { LiftKey, MainWorkBase, Program, ProgrammingModelId, Template, TemplateId, TemplateRole } from "@/generator/types";
import { PROGRAMMING_MODELS } from "@/generator/types";
import { Button, FieldGroup, Host, Picker, Row, Spacer, Text as UIText } from "@expo/ui";
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

// docs/templates/boring-but-big.md "Options": "40-60%, per lift ... 50-55%
// recommended." A small set of named steps, not a continuous range — same
// convention as every other percentage choice in this app.
const SUPPLEMENTAL_PERCENT_CHOICES = [40, 45, 50, 55, 60];
/** Sentinel meaning "no override — use the template's own default (50%)". */
const DEFAULT_SUPPLEMENTAL_PERCENT = "default" as const;
type SupplementalPercentPick = typeof DEFAULT_SUPPLEMENTAL_PERCENT | number;

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
    <Row>
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
  const [trainingDaysPick, setTrainingDaysPick] = useState<2 | 3 | 4>(3);
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
  const [isSaving, setIsSaving] = useState(false);

  // Pre-fill once from the existing program, if any — after that, the
  // user's own edits win over a background refetch. This effect genuinely
  // syncs with an external, asynchronously-loaded resource, unlike the
  // derived values below.
  const initialized = useRef(false);
  useEffect(() => {
    if (program && !initialized.current) {
      initialized.current = true;
      setProgrammingModel(program.programmingModel);
      setTrainingDaysPick(program.trainingDays);
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
    }
  }, [program]);

  const isBeginnerModel = programmingModel === "beginner";
  const allTemplates = useMemo(() => Object.values(TEMPLATES), []);

  const availableDayCounts = useMemo(() => {
    const role: TemplateRole = isBeginnerModel ? "standalone" : "leader";
    const days = new Set<number>();
    for (const t of allTemplates) {
      if (eligibleForRole(t, role)) {
        t.supportedDayCounts.forEach((d) => days.add(d));
      }
    }
    return [...days].sort((a, b) => a - b) as (2 | 3 | 4)[];
  }, [allTemplates, isBeginnerModel]);

  const trainingDays = availableDayCounts.includes(trainingDaysPick) ? trainingDaysPick : (availableDayCounts[0] ?? trainingDaysPick);

  const leaderOptions = useMemo(() => {
    const role: TemplateRole = isBeginnerModel ? "standalone" : "leader";
    return allTemplates.filter((t) => eligibleForRole(t, role) && t.supportedDayCounts.includes(trainingDays));
  }, [allTemplates, isBeginnerModel, trainingDays]);

  const leaderTemplateId = leaderOptions.some((t) => t.id === leaderTemplateIdPick) ? leaderTemplateIdPick : (leaderOptions[0]?.id ?? "");
  const leaderTemplate = leaderTemplateId ? TEMPLATES[leaderTemplateId] : undefined;

  const anchorOptions = useMemo(() => {
    if (isBeginnerModel || !leaderTemplate) return [];
    return allTemplates.filter(
      (t) => eligibleForRole(t, "anchor") && t.supportedDayCounts.includes(trainingDays) && leaderTemplate.compatibleAnchorIds.includes(t.id)
    );
  }, [allTemplates, isBeginnerModel, leaderTemplate, trainingDays]);

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
    }
    const next: Program = {
      programmingModel,
      trainingDays,
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
    isBbbOriginalLeader,
    leaderTemplateId,
    lifts,
    mainWorkBasePick,
    supplementalPercentPicks,
    program,
    programmingModel,
    saveLift,
    saveProgram,
    tmPercentage,
    trainingDays,
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

          <FieldGroup.Section title="Training Days">
            <PickerRow
              label="Days per week"
              selectedValue={trainingDays}
              onValueChange={(v) => setTrainingDaysPick(v as 2 | 3 | 4)}
              items={availableDayCounts.map((d) => ({ label: String(d), value: d }))}
            />
          </FieldGroup.Section>

          <FieldGroup.Section title={isBeginnerModel ? "Template" : "Leader Template"}>
            <PickerRow
              label="Template"
              selectedValue={leaderTemplateId}
              onValueChange={(v) => setLeaderTemplateIdPick(v as TemplateId)}
              items={leaderOptions.map((t) => ({ label: t.name, value: t.id }))}
            />
          </FieldGroup.Section>

          {/* Sits directly under the template it configures, not off in its
              own section further down the form. */}
          {isBbbOriginalLeader && (
            <FieldGroup.Section title="Boring But Big Options">
              <PickerRow
                label="Main Work Base"
                selectedValue={mainWorkBasePick}
                onValueChange={(v) => setMainWorkBasePick(v as MainWorkBase)}
                items={(Object.keys(MAIN_WORK_BASE_LABELS) as MainWorkBase[]).map((base) => ({
                  label: MAIN_WORK_BASE_LABELS[base],
                  value: base,
                }))}
              />
              {LIFT_ORDER.map((liftKey) => (
                <PickerRow
                  key={liftKey}
                  label={`${LIFT_LABELS[liftKey]} Supplemental %`}
                  selectedValue={supplementalPercentPicks[liftKey]}
                  onValueChange={(v) => setSupplementalPercentPicks((prev) => ({ ...prev, [liftKey]: v as SupplementalPercentPick }))}
                  items={[
                    { label: "Template default (50%)", value: DEFAULT_SUPPLEMENTAL_PERCENT },
                    ...SUPPLEMENTAL_PERCENT_CHOICES.map((p) => ({ label: `${p}%`, value: p })),
                  ]}
                />
              ))}
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

          <FieldGroup.Section title="Training Max Percentage">
            <PickerRow
              label="Percentage"
              selectedValue={tmPercentage}
              onValueChange={(v) => setTmPercentagePick(v as number)}
              items={percentageChoices.map((p) => ({ label: `${Math.round(p * 100)}%`, value: p }))}
            />
          </FieldGroup.Section>

          {/* Part of the scrollable form, not a fixed bottom element — the
              floating NativeTabs bar sits above screen content in the view
              hierarchy and its footprint can't be measured (per the
              expo-router skill), so anything fixed near the bottom risks
              being visually clipped *and* having its taps intercepted by
              the tab bar itself. */}
          {/* variant="text" — "filled" rendered as a small pill that didn't
              fill its row's width even with style.width: "100%", leaving an
              odd small-button-in-a-big-row look. A plain colored text row
              (no pill competing with the row's own background) matches the
              common native-Settings "Save"/"Done" row convention instead. */}
          <FieldGroup.Section>
            <Button variant="text" label={isSaving ? "Saving..." : "Save"} onPress={handleSave} disabled={isSaving} />
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
