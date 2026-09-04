// The cheat sheet — a cycle picker plus a swipeable pager over that cycle's
// calendar weeks. A calendar week is that cycle's own training-days count of
// consecutive sessions — but that count isn't a single plan-wide constant:
// the Leader phase, the Anchor phase, and the 7th Week Protocol can each run
// at a different day count (docs/ARCHITECTURE.md §3), so a cycle bucket's
// main-work sessions are chunked using whichever phase that cycle belongs to
// (via PROGRAMMING_MODELS), while any trailing deload/tmTest sessions in the
// same bucket are chunked separately using seventhWeekTrainingDays.
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
import type { LiftKey, PlannedSet, Program, ProgressionStep, Session, SessionLiftEntry } from "@/generator/types";
import { PROGRAMMING_MODELS } from "@/generator/types";
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
  const warmupGroups = groupSets(entry.warmupSets);
  const mainGroups = groupSets(entry.mainWork);
  const supplementalGroups = groupSets(entry.supplemental);
  return (
    <View style={styles.liftEntry}>
      <ThemedText style={styles.liftName}>{LIFT_LABELS[entry.liftKey]}</ThemedText>
      {warmupGroups.length > 0 && (
        <>
          <ThemedText style={styles.warmupLabel}>Warm-up</ThemedText>
          {warmupGroups.map((group, i) => (
            <SetRow key={`warmup-${i}`} group={group} />
          ))}
        </>
      )}
      {mainGroups.length > 0 && <ThemedText style={styles.mainWorkLabel}>Main Work</ThemedText>}
      {mainGroups.map((group, i) => (
        <SetRow key={`main-${i}`} group={group} />
      ))}
      {supplementalGroups.length > 0 && (
        <>
          <ThemedText style={styles.supplementalLabel}>
            {entry.supplementalLiftKey === entry.liftKey
              ? "Supplemental"
              : `Supplemental (${LIFT_LABELS[entry.supplementalLiftKey]})`}
          </ThemedText>
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
 * share the cycleNumber of the cycle they close out). Cycle 0 is a special
 * case: cycles.ts's generatePlan attaches the opening TM test there
 * precisely because it isn't a real training cycle — nothing else ever
 * shares that number, so it gets its own label rather than "Cycle 0 + ...". */
function cycleLabel(sessions: Session[], cycleNumber: number): string {
  if (cycleNumber === 0) return "Starting TM Test";
  const stepKinds = new Set(sessions.filter((s) => s.cycleNumber === cycleNumber).map((s) => s.lifts[0]?.step.kind));
  if (stepKinds.has("tmTest")) return `Cycle ${cycleNumber} + TM Test`;
  if (stepKinds.has("deload")) return `Cycle ${cycleNumber} + Deload`;
  return `Cycle ${cycleNumber}`;
}

/** Splits an already-ordered session list into chunks of `sessionsPerWeek`. */
function chunkIntoWeeks(sessions: Session[], sessionsPerWeek: number): Session[][] {
  const weeks: Session[][] = [];
  for (let i = 0; i < sessions.length; i += sessionsPerWeek) {
    weeks.push(sessions.slice(i, i + sessionsPerWeek));
  }
  return weeks;
}

/** Which programming-model phase a cycle number belongs to — Leader (or
 * standalone, for the Beginner model) vs Anchor — by counting off the
 * declared cycle counts in PROGRAMMING_MODELS. Needed because a cycle
 * bucket's main-work sessions must be chunked using *that phase's* day
 * count, not a single plan-wide one — see the module comment.
 */
function isAnchorCycle(cycleNumber: number, programmingModel: Program["programmingModel"]): boolean {
  const phases = PROGRAMMING_MODELS[programmingModel];
  const leaderPhase = phases.find((p) => p.role !== "anchor");
  return cycleNumber > (leaderPhase?.cycles ?? 0);
}

/** Which phase view a week-page belongs to — every session within one phase
 * view carries identical assistance/jumps/warmup (see generator/types.ts's
 * Session doc comment), so this labels the once-per-week-page reference
 * card rather than repeating the label on every SessionCard.
 */
function phaseLabel(session: Session, program: Program): string {
  const kind = session.lifts[0]?.step.kind;
  if (kind === "deload" || kind === "tmTest" || kind === "prTest") return "7th Week Protocol";
  if (program.programmingModel === "beginner") return "Beginner";
  return isAnchorCycle(session.cycleNumber, program.programmingModel) ? "Anchor" : "Leader";
}

/** Templates define their own assistance category strings freely (e.g.
 * "single-leg-core", "squat/hip-hinge" — see generator/types.ts's
 * AssistanceTarget), so this is a light formatting pass, not a lookup
 * table keyed to a closed set of categories. */
function formatCategory(category: string): string {
  const spaced = category.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Collapses a {min,max} rep range to a single number when they're equal
 * (e.g. original-531's Leader assistance is a fixed 100, not "100-100") —
 * a range is only worth printing as a range when it's actually one. */
function totalRepsLabel(totalReps: { min: number; max: number }): string {
  return totalReps.min === totalReps.max ? `${totalReps.min}` : `${totalReps.min}-${totalReps.max}`;
}

/** Shown once per week-page, not once per session — repeating identical
 * assistance/jumps/warmup content on every SessionCard within the same
 * phase view would be pure noise, per the owner's call. */
function PhaseReferenceCard({ session, program }: { session: Session; program: Program }) {
  const jumps = session.jumpsOrThrows;

  return (
    <View style={styles.phaseReference}>
      <ThemedText style={styles.phaseReferenceTitle}>{phaseLabel(session, program)}</ThemedText>

      {session.warmupCircuit.length > 0 && (
        <View style={styles.referenceSection}>
          <ThemedText style={styles.referenceHeading}>Warm-up / Mobility</ThemedText>
          {session.warmupCircuit.map((exercise, i) => (
            <ThemedText key={i} style={styles.referenceLine}>
              {exercise.name} — {exercise.sets > 1 ? `${exercise.sets} x ` : ""}
              {exercise.reps}
            </ThemedText>
          ))}
        </View>
      )}

      <View style={styles.referenceSection}>
        <ThemedText style={styles.referenceHeading}>Jumps / Throws</ThemedText>
        <ThemedText style={styles.referenceLine}>
          {totalRepsLabel(jumps.totalReps)} total
          {jumps.guidance ? ` — ${jumps.guidance}` : ""}
        </ThemedText>
      </View>

      <View style={styles.referenceSection}>
        <ThemedText style={styles.referenceHeading}>Assistance</ThemedText>
        {session.assistance.map((target, i) => (
          <ThemedText key={i} style={styles.referenceLine}>
            {formatCategory(target.category)}: {totalRepsLabel(target.totalReps)} reps
            {target.exerciseOptions.length > 0 ? ` (${target.exerciseOptions.join(", ")})` : ""}
          </ThemedText>
        ))}
      </View>

      <View style={styles.referenceSection}>
        <ThemedText style={styles.referenceHeading}>Conditioning</ThemedText>
        <ThemedText style={styles.referenceLine}>
          Up to {session.conditioning.sessionsPerWeek} sessions/week — {session.conditioning.guidance}
        </ThemedText>
      </View>
    </View>
  );
}

/** Chunks one cycle's sessions into calendar weeks, honouring that a single
 * cycle bucket can mix two different day counts: its main-work sessions
 * (Leader's or Anchor's day count, whichever phase this cycle belongs to)
 * and, trailing them, an optional 7th Week Protocol block — a deload or a
 * TM test, each its own independent day count — at its own independent day
 * count. See cycles.ts's generatePlan — a 7th-week block shares the
 * cycleNumber of the cycle it closes out, and a cycle bucket has at most
 * one such block (deload and TM test never both attach to the same cycle).
 */
function chunkCycleIntoWeeks(cycleSessions: Session[], cycleNumber: number, program: Program): Session[][] {
  const mainSessions = cycleSessions.filter((s) => s.lifts[0]?.step.kind === "main");
  const seventhWeekSessions = cycleSessions.filter((s) => s.lifts[0]?.step.kind !== "main");
  const mainSessionsPerWeek =
    (isAnchorCycle(cycleNumber, program.programmingModel) ? program.anchorTrainingDays : program.leaderTrainingDays) ??
    program.leaderTrainingDays;
  const seventhWeekKind = seventhWeekSessions[0]?.lifts[0]?.step.kind;
  const seventhWeekSessionsPerWeek =
    (seventhWeekKind === "deload" ? program.deloadTrainingDays : program.tmTestTrainingDays) ?? program.tmTestTrainingDays;
  return [
    ...chunkIntoWeeks(mainSessions, mainSessionsPerWeek),
    ...chunkIntoWeeks(seventhWeekSessions, seventhWeekSessionsPerWeek),
  ];
}

/** Swipes one calendar week at a time within a single cycle — every session
 * in that week, not just one. Plain RN ScrollView, not @expo/ui —
 * pagingEnabled + horizontal is a long-established cross-platform pattern,
 * unlike the native-bridging components that have caused trouble elsewhere
 * in this app.
 */
function WeekSwiper({ sessions, cycleNumber, program }: { sessions: Session[]; cycleNumber: number; program: Program }) {
  const { width } = useWindowDimensions();
  const [pageIndex, setPageIndex] = useState(0);
  const weeks = useMemo(() => chunkCycleIntoWeeks(sessions, cycleNumber, program), [sessions, cycleNumber, program]);

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
            {weekSessions[0] && <PhaseReferenceCard session={weekSessions[0]} program={program} />}
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
function CyclePager({ sessions, program }: { sessions: Session[]; program: Program }) {
  const cycleNumbers = useMemo(() => [...new Set(sessions.map((s) => s.cycleNumber))].sort((a, b) => a - b), [sessions]);
  const [cyclePick, setCyclePick] = useState<number | null>(null);
  // Cycle 1 (the plan's first real training cycle) is always present and
  // is the more useful default than cycle 0 (the opening TM test, a
  // one-time event) — that one's still reachable from the picker, just not
  // what the app opens on every time. See cycles.ts's generatePlan.
  const defaultCycle = cycleNumbers.includes(1) ? 1 : cycleNumbers[0];
  const selectedCycle = cyclePick !== null && cycleNumbers.includes(cyclePick) ? cyclePick : defaultCycle;

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
      <WeekSwiper key={selectedCycle} sessions={cycleSessions} cycleNumber={selectedCycle} program={program} />
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
    content = <CyclePager sessions={plan.sessions} program={program} />;
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
  warmupLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.secondaryLabel,
  },
  mainWorkLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  phaseReference: {
    marginBottom: spacing.xl,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    gap: spacing.sm,
  },
  phaseReferenceTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    color: colors.secondaryLabel,
  },
  referenceSection: {
    gap: 2,
  },
  referenceHeading: {
    fontSize: 13,
    fontWeight: "600",
  },
  referenceLine: {
    fontSize: 13,
    color: colors.secondaryLabel,
  },
});
