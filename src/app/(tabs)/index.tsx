// The cheat sheet — a cycle picker plus a swipeable pager over that cycle's
// calendar weeks. A calendar week is `program.trainingDays` consecutive
// sessions — that holds for every template's main-work sessions (each
// template's own workout rotation aside) and for the 7th Week Protocol
// sessions too, since both are keyed by the same trainingDays setting.
// Per docs/ARCHITECTURE.md, a "week" bucket built this way isn't always a
// uniform progression step for every lift inside it (Beginner's alternating
// two-lift sessions mix progression steps within one such bucket) — a
// known, accepted imprecision; individual SessionCards still show each
// session's own correct progression step (labelled "Step N", never "Week
// N" — that word is reserved for the calendar-week grouping this file
// swipes over, see generator/types.ts's ProgressionStep), so no numbers are
// ever wrong, only the page-level grouping is approximate for that one
// template. The cycle/page
// selections are local component state only, never persisted, so this
// doesn't reintroduce the position-tracking CLAUDE.md rules out — the user
// is choosing where to look, not the app remembering "today's workout."
// usePlan() is the only seam into generator/ — this screen never imports
// from it directly.

import { ThemedText } from "@/components/themed-text";
import { usePlan } from "@/hooks/use-plan";
import { colors, spacing } from "@/theme";
import type { LiftKey, PlannedSet, ProgressionStep, Session, SessionLiftEntry } from "@/generator/types";
import { Host, Picker } from "@expo/ui";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-screens/experimental";

const LIFT_LABELS: Record<LiftKey, string> = {
  squat: "Squat",
  bench: "Bench Press",
  deadlift: "Deadlift",
  press: "Press",
};

function stepLabel(step: ProgressionStep): string {
  switch (step.kind) {
    case "main":
      return `Step ${step.index + 1}`;
    case "deload":
      return "Deload";
    case "tmTest":
      return "TM Test";
    case "prTest":
      return "PR Test";
  }
}

function repsLabel(reps: PlannedSet["reps"]): string {
  return typeof reps === "number" ? `${reps}` : `${reps.min}-${reps.max}`;
}

function repsEqual(a: PlannedSet["reps"], b: PlannedSet["reps"]): boolean {
  if (typeof a === "number" || typeof b === "number") {
    return a === b;
  }
  return a.min === b.min && a.max === b.max;
}

interface SetGroup {
  count: number;
  set: PlannedSet;
}

/** Collapses consecutive identical sets (e.g. 5 identical supplemental sets)
 * into one row — "5 x 200 lb x 10" rather than five repeated lines.
 */
function groupSets(sets: PlannedSet[]): SetGroup[] {
  const groups: SetGroup[] = [];
  for (const set of sets) {
    const last = groups[groups.length - 1];
    const matchesLast =
      last &&
      last.set.tmPercentage === set.tmPercentage &&
      last.set.workingWeight === set.workingWeight &&
      last.set.isPrSet === set.isPrSet &&
      repsEqual(last.set.reps, set.reps);
    if (matchesLast) {
      last.count++;
    } else {
      groups.push({ count: 1, set });
    }
  }
  return groups;
}

/**
 * Plain React Native, not @expo/ui's List/ListItem — reverted after two
 * failed fix attempts (a matchContents sizing variant, then wrapping the
 * string children in @expo/ui's own Text) still didn't render on iOS,
 * despite both being independently confirmed correct on the web fallback.
 * That divergence itself is the signal: @expo/ui's native List bridging has
 * some other problem here we don't have a diagnosis path for without
 * another native round trip, and a working plain-RN row beats a broken
 * "correctly native" one. See the expo-ui skill's own fallback allowance:
 * "Only fall back to RN built-ins when @expo/ui is missing the component."
 */
function SetRow({ group }: { group: SetGroup }) {
  const { set, count } = group;
  return (
    <ThemedText style={styles.setText}>
      {count > 1 ? `${count} x ` : ""}
      {set.workingWeight} lb · {Math.round(set.tmPercentage * 100)}% · {repsLabel(set.reps)} reps
      {set.isPrSet ? " · PR" : ""}
    </ThemedText>
  );
}

function LiftEntryRow({ entry }: { entry: SessionLiftEntry }) {
  const mainGroups = groupSets(entry.mainWork);
  const supplementalGroups = groupSets(entry.supplemental);
  return (
    <View style={styles.liftEntry}>
      <ThemedText style={styles.liftName}>{LIFT_LABELS[entry.liftKey]}</ThemedText>
      {mainGroups.map((group, i) => (
        <SetRow key={`main-${i}`} group={group} />
      ))}
      {supplementalGroups.length > 0 && (
        <>
          <ThemedText style={styles.supplementalLabel}>Supplemental</ThemedText>
          {supplementalGroups.map((group, i) => (
            <SetRow key={`supp-${i}`} group={group} />
          ))}
        </>
      )}
    </View>
  );
}

function SessionCard({ session }: { session: Session }) {
  const primaryStep = session.lifts[0]?.step;
  return (
    <View style={styles.session}>
      <View style={styles.sessionHeader}>
        <ThemedText style={styles.sessionNumber}>Session {session.sessionNumber}</ThemedText>
        {primaryStep && <ThemedText style={styles.sessionMeta}>{stepLabel(primaryStep)}</ThemedText>}
      </View>
      {session.lifts.map((entry) => (
        <LiftEntryRow key={entry.liftKey} entry={entry} />
      ))}
    </View>
  );
}

/** A short label for the cycle picker — flags whichever 7th Week Protocol
 * variant is attached to this cycle (see cycles.ts: deload/tmTest sessions
 * share the cycleNumber of the cycle they close out). */
function cycleLabel(sessions: Session[], cycleNumber: number): string {
  const stepKinds = new Set(sessions.filter((s) => s.cycleNumber === cycleNumber).map((s) => s.lifts[0]?.step.kind));
  if (stepKinds.has("tmTest")) return `Cycle ${cycleNumber} + TM Test`;
  if (stepKinds.has("deload")) return `Cycle ${cycleNumber} + Deload`;
  return `Cycle ${cycleNumber}`;
}

/** Splits an already cycle-filtered, already ordered session list into
 * chunks of `sessionsPerWeek` — see the module comment for why that's a
 * calendar week for every template built so far.
 */
function chunkIntoWeeks(sessions: Session[], sessionsPerWeek: number): Session[][] {
  const weeks: Session[][] = [];
  for (let i = 0; i < sessions.length; i += sessionsPerWeek) {
    weeks.push(sessions.slice(i, i + sessionsPerWeek));
  }
  return weeks;
}

/** Swipes one calendar week at a time within a single cycle — every session
 * in that week, not just one. Plain RN ScrollView, not @expo/ui —
 * pagingEnabled + horizontal is a long-established cross-platform pattern,
 * unlike the native-bridging components that have caused trouble elsewhere
 * in this app.
 */
function WeekSwiper({ sessions, sessionsPerWeek }: { sessions: Session[]; sessionsPerWeek: number }) {
  const { width } = useWindowDimensions();
  const [pageIndex, setPageIndex] = useState(0);
  const weeks = useMemo(() => chunkIntoWeeks(sessions, sessionsPerWeek), [sessions, sessionsPerWeek]);

  return (
    <View style={styles.swiperContainer}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {weeks.map((weekSessions, i) => (
          <ScrollView key={i} style={{ width }} contentContainerStyle={styles.listContent}>
            {weekSessions.map((session) => (
              <SessionCard key={session.sessionNumber} session={session} />
            ))}
          </ScrollView>
        ))}
      </ScrollView>
      <ThemedText style={styles.pageIndicator}>
        Week {pageIndex + 1} of {weeks.length}
      </ThemedText>
    </View>
  );
}

/** A dropdown to jump to a cycle, plus a swiper over that cycle's weeks.
 * The cycle picker's own selection is a raw pick corrected to an effective
 * value at render time (same pattern as templates.tsx) rather than an
 * effect — and the swiper is remounted (via `key`) on cycle change instead
 * of an effect resetting its page index, per the same "you might not need
 * an effect" reasoning.
 */
function CyclePager({ sessions, sessionsPerWeek }: { sessions: Session[]; sessionsPerWeek: number }) {
  const cycleNumbers = useMemo(() => [...new Set(sessions.map((s) => s.cycleNumber))].sort((a, b) => a - b), [sessions]);
  const [cyclePick, setCyclePick] = useState<number | null>(null);
  const selectedCycle = cyclePick !== null && cycleNumbers.includes(cyclePick) ? cyclePick : cycleNumbers[0];

  const cycleSessions = useMemo(() => sessions.filter((s) => s.cycleNumber === selectedCycle), [sessions, selectedCycle]);

  return (
    <View style={styles.pagerContainer}>
      <Host matchContents={{ vertical: true }} style={styles.cyclePickerHost}>
        <Picker selectedValue={selectedCycle} onValueChange={(v) => setCyclePick(v as number)}>
          {cycleNumbers.map((n) => (
            <Picker.Item key={String(n)} label={cycleLabel(sessions, n)} value={n} />
          ))}
        </Picker>
      </Host>
      <WeekSwiper key={selectedCycle} sessions={cycleSessions} sessionsPerWeek={sessionsPerWeek} />
    </View>
  );
}

export default function PlanScreen() {
  const { plan, program, isLoading, error } = usePlan();

  let content: ReactNode;
  if (isLoading && !plan) {
    content = (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  } else if (error) {
    content = (
      <View style={styles.centered}>
        <ThemedText style={styles.errorText}>{error.message}</ThemedText>
      </View>
    );
  } else if (!plan || !program) {
    content = (
      <View style={styles.centered}>
        <ThemedText style={styles.emptyText}>Enter your training maxes and choose a template to generate your plan.</ThemedText>
      </View>
    );
  } else {
    content = <CyclePager sessions={plan.sessions} sessionsPerWeek={program.trainingDays} />;
  }

  // NativeTabs renders no header and doesn't handle top safe area for a
  // plain FlatList/View the way it can for the bottom tab-bar area — see
  // the matching note in _layout.tsx. Both edges are handled explicitly.
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  emptyText: {
    textAlign: "center",
    color: colors.secondaryLabel,
  },
  errorText: {
    textAlign: "center",
    color: colors.secondaryLabel,
  },
  pagerContainer: {
    flex: 1,
  },
  cyclePickerHost: {
    alignSelf: "stretch",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  swiperContainer: {
    flex: 1,
  },
  pageIndicator: {
    textAlign: "center",
    fontSize: 13,
    color: colors.secondaryLabel,
    paddingVertical: spacing.sm,
  },
  listContent: {
    padding: spacing.lg,
  },
  session: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sessionNumber: {
    fontSize: 16,
    fontWeight: "600",
  },
  sessionMeta: {
    fontSize: 14,
    color: colors.secondaryLabel,
  },
  liftEntry: {
    marginTop: spacing.sm,
  },
  liftName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  setText: {
    fontSize: 14,
    color: colors.secondaryLabel,
  },
  supplementalLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
});
