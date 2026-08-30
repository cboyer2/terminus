// Enter/edit training maxes for the four main lifts. Gated on a program
// existing: per PRD §1, entering maxes comes after template selection, not
// before, because the effective TM percentage (which turns a 1RM into a
// stored seed) comes from the chosen Leader template.
//
// Deliberately not built here: per-lift TM percentage override editing
// (Beginner's 90%/85%-per-lift case) — an existing override is preserved on
// save, but setting one fresh lives on the Templates tab's "Advanced"
// section, not here, since it's a template/plan-level decision, not a
// number typed on this screen.

import { TextField } from "@/components/text-field";
import { ThemedText } from "@/components/themed-text";
import { oneRepMaxFromPerformance, trainingMaxSeedFromOneRepMax } from "@/generator/calc";
import { progressNormal, progressStall } from "@/generator/seed-progression";
import { DEFAULT_INCREMENT_LB, totalCyclesInModel } from "@/generator/types";
import type { Lift, LiftKey } from "@/generator/types";
import { useLifts } from "@/hooks/use-lifts";
import { usePlan } from "@/hooks/use-plan";
import { colors, spacing } from "@/theme";
import { Link } from "expo-router";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-screens/experimental";

const LIFT_ORDER: LiftKey[] = ["squat", "bench", "deadlift", "press"];

const LIFT_LABELS: Record<LiftKey, string> = {
  squat: "Squat",
  bench: "Bench Press",
  deadlift: "Deadlift",
  press: "Press",
};

/**
 * Plain React Native, not @expo/ui's PrimaryButton — reverted after four
 * failed fix attempts (a content-container padding nudge, remounting the
 * button's Host via `key`, a trailing scroll-content spacer) at a bug
 * confirmed positional via a temporary reorder test: whichever card is last
 * in this repeated list gets its `Host`-wrapped, `matchContents`-sized
 * button rendered too tight against its own fields on first layout, and a
 * real relayout (e.g. focusing any field) fixes it — even a freshly
 * remounted Host reproduces the bug in the last position, so it isn't a
 * stale-measurement issue localized to one instance. Same call already made
 * for the Plan tab's set/rep rows: a working plain-RN button beats a broken
 * "correctly native" one in this specific repeated-list context. Not a
 * blanket revert of PrimaryButton itself — login/signup's single, non-listed
 * buttons aren't known to have this problem.
 */
function SaveButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.saveButton, disabled && styles.saveButtonDisabled, pressed && !disabled && styles.saveButtonPressed]}
    >
      <ThemedText style={styles.saveButtonLabel}>{title}</ThemedText>
    </Pressable>
  );
}

/** A single toggleable choice — used for the progression mode (Normal, plus
 * either Stalled or Failed TM Test depending on the template). Plain RN for
 * the same reason as SaveButton: this screen has already hit real
 * native-only bugs with @expo/ui components, so new additions here stay
 * consistent with what's already proven to work.
 */
function SegmentButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, selected && styles.segmentSelected]}>
      <ThemedText style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>{label}</ThemedText>
    </Pressable>
  );
}

/** PRD §1.9's progression paths, gated on an existing seed to progress
 * from. Normal is available on every template. Stalled is Beginner-only —
 * "back up three cycles" is Beginner's own documented remedy (beginner.md:
 * "All five remedies begin identically — back up three cycles"), not a
 * generic mechanic; other templates' own stall guidance is deferred, not
 * yet built, so this app shouldn't offer it there until it's actually
 * modelled.
 *
 * Failed TM Test was here for Leader/Anchor templates too, but it's gone —
 * once it stopped asking for a fresh percentage (using the lift's own
 * already-effective one instead, like everything else on this screen), it
 * became byte-for-byte the same computation as the "enter a max" form
 * above: weight+reps -> oneRepMaxFromPerformance -> apply that same
 * percentage -> overwrite trainingMaxSeed. A second control for the exact
 * same action was pure duplication, per the owner.
 *
 * Normal computes its resulting seed from data already in hand and shows
 * it before the user confirms — nothing is applied until Confirm is
 * pressed. Saving preserves every other field on the lift (role,
 * tmPercentageOverride, increment); only trainingMaxSeed changes.
 */
function ProgressSection({
  existing,
  cycleCount,
  isBeginnerModel,
  onSave,
}: {
  existing: Lift;
  cycleCount: number;
  isBeginnerModel: boolean;
  onSave: (lift: Lift) => Promise<void>;
}) {
  const [mode, setMode] = useState<"normal" | "stall" | null>(null);
  const [isProgressing, setIsProgressing] = useState(false);

  const normalSeed = progressNormal(existing.trainingMaxSeed, existing.increment, cycleCount);
  const stallSeed = progressStall(existing.trainingMaxSeed, existing.increment);

  const applyProgress = useCallback(
    async (newSeed: number) => {
      setIsProgressing(true);
      try {
        await onSave({ ...existing, trainingMaxSeed: newSeed });
        setMode(null);
      } catch (err) {
        Alert.alert("Couldn't progress", err instanceof Error ? err.message : String(err));
      } finally {
        setIsProgressing(false);
      }
    },
    [existing, onSave]
  );

  return (
    <View style={styles.progressSection}>
      <ThemedText style={styles.progressLabel}>Progress</ThemedText>
      <View style={styles.segmentRow}>
        <SegmentButton label="Normal" selected={mode === "normal"} onPress={() => setMode(mode === "normal" ? null : "normal")} />
        {isBeginnerModel && (
          <SegmentButton label="Stalled" selected={mode === "stall"} onPress={() => setMode(mode === "stall" ? null : "stall")} />
        )}
      </View>

      {mode === "normal" && (
        <>
          <ThemedText style={styles.progressPreview}>
            {existing.trainingMaxSeed} lb + {cycleCount} × {existing.increment} lb = {normalSeed} lb
          </ThemedText>
          <SaveButton title="Confirm" onPress={() => applyProgress(normalSeed)} disabled={isProgressing} />
        </>
      )}

      {mode === "stall" && isBeginnerModel && (
        <>
          <ThemedText style={styles.progressPreview}>
            {existing.trainingMaxSeed} lb − 3 × {existing.increment} lb = {stallSeed} lb
          </ThemedText>
          <SaveButton title="Confirm" onPress={() => applyProgress(stallSeed)} disabled={isProgressing} />
        </>
      )}
    </View>
  );
}

function LiftRow({
  liftKey,
  existing,
  tmPercentage,
  cycleCount,
  isBeginnerModel,
  onSave,
}: {
  liftKey: LiftKey;
  existing: Lift | undefined;
  tmPercentage: number;
  cycleCount: number;
  isBeginnerModel: boolean;
  onSave: (lift: Lift) => Promise<void>;
}) {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("1");
  const [isSaving, setIsSaving] = useState(false);

  const percentage = existing?.tmPercentageOverride ?? tmPercentage;

  const oneRepMax = useMemo(() => {
    const weightLb = Number(weight);
    const repsCompleted = Number(reps) || 1;
    if (!weightLb || weightLb <= 0) return null;
    return oneRepMaxFromPerformance(weightLb, repsCompleted);
  }, [weight, reps]);

  const seed = oneRepMax !== null ? trainingMaxSeedFromOneRepMax(oneRepMax, percentage) : null;

  const handleSave = useCallback(async () => {
    if (seed === null) return;
    setIsSaving(true);
    try {
      await onSave({
        liftKey,
        role: "main",
        trainingMaxSeed: seed,
        tmPercentageOverride: existing?.tmPercentageOverride ?? null,
        increment: existing?.increment ?? DEFAULT_INCREMENT_LB[liftKey],
      });
      setWeight("");
      setReps("1");
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  }, [seed, onSave, liftKey, existing]);

  return (
    <View style={styles.liftCard}>
      <ThemedText style={styles.liftName}>{LIFT_LABELS[liftKey]}</ThemedText>
      <ThemedText style={styles.currentSeed}>
        {existing ? `Current training max: ${existing.trainingMaxSeed} lb` : "No training max set yet"}
      </ThemedText>
      <View style={styles.row}>
        <View style={styles.field}>
          <TextField label="Weight" value={weight} onChangeText={setWeight} placeholder="e.g. 275" keyboardType="numeric" />
        </View>
        <View style={styles.field}>
          <TextField label="Reps" value={reps} onChangeText={setReps} placeholder="1 if this is your max" keyboardType="numeric" />
        </View>
      </View>
      {seed !== null && (
        <ThemedText style={styles.preview}>
          {oneRepMax} lb 1RM x {Math.round(percentage * 100)}% = {seed} lb training max
        </ThemedText>
      )}
      <SaveButton title="Save" onPress={handleSave} disabled={isSaving || seed === null} />
      {existing && (
        <ProgressSection existing={existing} cycleCount={cycleCount} isBeginnerModel={isBeginnerModel} onSave={onSave} />
      )}
    </View>
  );
}

export default function MaxesScreen() {
  const { lifts, isLoading, error, saveLift } = useLifts();
  const { program } = usePlan();

  let content: ReactNode;
  if (isLoading) {
    content = (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  } else if (error) {
    content = (
      <View style={styles.centered}>
        <ThemedText style={styles.emptyText}>{error.message}</ThemedText>
      </View>
    );
  } else if (!program) {
    content = (
      <View style={styles.centered}>
        <ThemedText style={styles.emptyText}>Choose a template first, then come back to enter your training maxes.</ThemedText>
        <Link href="/templates">
          <ThemedText style={styles.link}>Go to Templates</ThemedText>
        </Link>
      </View>
    );
  } else {
    content = (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {LIFT_ORDER.map((liftKey) => (
            <LiftRow
              key={liftKey}
              liftKey={liftKey}
              existing={lifts?.find((l) => l.liftKey === liftKey)}
              tmPercentage={program.tmPercentage}
              cycleCount={totalCyclesInModel(program.programmingModel)}
              isBeginnerModel={program.programmingModel === "beginner"}
              onSave={saveLift}
            />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Same top/bottom safe-area handling as the Plan tab — see the note there
  // and in _layout.tsx.
  return (
    <SafeAreaView edges={{ top: true, bottom: true }} style={styles.safeArea}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    textAlign: "center",
    color: colors.secondaryLabel,
  },
  link: {
    color: colors.systemBlue,
    fontWeight: "600",
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  liftCard: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  liftName: {
    fontSize: 18,
    fontWeight: "700",
  },
  currentSeed: {
    fontSize: 14,
    color: colors.secondaryLabel,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  field: {
    flex: 1,
  },
  preview: {
    fontSize: 14,
    color: colors.secondaryLabel,
  },
  saveButton: {
    backgroundColor: colors.systemBlue,
    borderRadius: 4,
    padding: spacing.md,
    alignItems: "center",
  },
  saveButtonPressed: {
    opacity: 0.8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonLabel: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  progressSection: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.secondaryLabel,
    textTransform: "uppercase",
  },
  segmentRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    alignItems: "center",
  },
  segmentSelected: {
    backgroundColor: colors.systemBlue,
    borderColor: colors.systemBlue,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  segmentLabelSelected: {
    color: "#fff",
  },
  progressPreview: {
    fontSize: 14,
    color: colors.secondaryLabel,
  },
});
