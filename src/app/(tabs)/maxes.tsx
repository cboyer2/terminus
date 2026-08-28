// Enter/edit training maxes for the four main lifts. Gated on a program
// existing: per PRD §1, entering maxes comes after template selection, not
// before, because the effective TM percentage (which turns a 1RM into a
// stored seed) comes from the chosen Leader template.
//
// Deliberately not built here: per-lift TM percentage override editing
// (Beginner's 90%/85%-per-lift case) — an existing override is preserved on
// save, but there's no UI yet to set one fresh.

import { PrimaryButton } from "@/components/primary-button";
import { TextField } from "@/components/text-field";
import { ThemedText } from "@/components/themed-text";
import { estimatedMax, trainingMaxSeedFromOneRepMax } from "@/generator/calc";
import { DEFAULT_INCREMENT_LB } from "@/generator/types";
import type { Lift, LiftKey } from "@/generator/types";
import { useLifts } from "@/hooks/use-lifts";
import { usePlan } from "@/hooks/use-plan";
import { colors, spacing } from "@/theme";
import { Link } from "expo-router";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-screens/experimental";

const LIFT_ORDER: LiftKey[] = ["squat", "bench", "deadlift", "press"];

const LIFT_LABELS: Record<LiftKey, string> = {
  squat: "Squat",
  bench: "Bench Press",
  deadlift: "Deadlift",
  press: "Press",
};

function LiftRow({
  liftKey,
  existing,
  tmPercentage,
  onSave,
}: {
  liftKey: LiftKey;
  existing: Lift | undefined;
  tmPercentage: number;
  onSave: (lift: Lift) => Promise<void>;
}) {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("1");
  const [isSaving, setIsSaving] = useState(false);

  const percentage = existing?.tmPercentageOverride ?? tmPercentage;

  // Reps <= 1 means "this weight is my actual max" — the estimating
  // formula is skipped rather than run with reps=1, which would multiply
  // the weight by 1.0333 instead of returning it unchanged.
  const oneRepMax = useMemo(() => {
    const weightLb = Number(weight);
    const repsCompleted = Number(reps) || 1;
    if (!weightLb || weightLb <= 0) return null;
    return repsCompleted <= 1 ? weightLb : estimatedMax(weightLb, repsCompleted);
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
      <PrimaryButton title="Save" onPress={handleSave} loading={isSaving || seed === null} />
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
});
