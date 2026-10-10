<script lang="ts">
  // The cheat sheet — a cycle picker plus a swipeable pager over that
  // cycle's calendar weeks. Ported from the old app/(tabs)/index.tsx; see
  // that file's header comment (preserved in git history) and
  // docs/ARCHITECTURE.md "A cycle is three progression steps per lift, not
  // three calendar weeks" for why a calendar week isn't one plan-wide
  // constant. planStore is the only seam into generator/ this view uses.
  import { planStore } from "../stores/plan";
  import { stateStore } from "../stores/state";
  import { loadViewPosition, saveViewPosition } from "../storage/view-position";
  import { LIFT_LABELS } from "../lift-labels";
  import { chunkCycleIntoWeeks, cycleLabel, cycleTrainingMaxes } from "./cheat-sheet-helpers";
  import WeekPager from "./WeekPager.svelte";

  // Reopen on the last-viewed page — view state only, never a training
  // position. An out-of-range saved cycle falls through to the default
  // below; an out-of-range week is clamped by WeekPager.
  let savedPosition = loadViewPosition();
  let cyclePick: number | null = savedPosition?.cycleNumber ?? null;

  $: program = $stateStore.program;
  $: plan = $planStore.plan;
  $: error = $planStore.error;

  $: cycleNumbers = plan ? [...new Set(plan.sessions.map((s) => s.cycleNumber))].sort((a, b) => a - b) : [];
  // Cycle 1 (the plan's first real training cycle) is the more useful
  // default than cycle 0 (the opening TM test, a one-time event).
  $: defaultCycle = cycleNumbers.includes(1) ? 1 : cycleNumbers[0];
  $: selectedCycle = cyclePick !== null && cycleNumbers.includes(cyclePick) ? cyclePick : defaultCycle;
  $: cycleSessions = plan ? plan.sessions.filter((s) => s.cycleNumber === selectedCycle) : [];
  $: weeks = program ? chunkCycleIntoWeeks(cycleSessions, selectedCycle, program) : [];
  $: trainingMaxes = plan ? cycleTrainingMaxes(plan.sessions, selectedCycle) : [];
  $: initialWeekIndex = savedPosition && savedPosition.cycleNumber === selectedCycle ? savedPosition.weekIndex : 0;

  function pickCycle(cycleNumber: number) {
    cyclePick = cycleNumber;
    savedPosition = null; // restore only on launch; a picked cycle opens at its first week
    saveViewPosition({ cycleNumber, weekIndex: 0 });
  }
</script>

<div class="cheat-sheet">
  {#if error}
    <p class="empty-text">{error.message}</p>
  {:else if !plan || !program}
    <p class="empty-text">Enter your training maxes and choose a template to generate your plan.</p>
  {:else}
    <div class="cycle-picker">
      <select value={selectedCycle} on:change={(e) => pickCycle(Number(e.currentTarget.value))}>
        {#each cycleNumbers as n}
          <option value={n}>{cycleLabel(plan.sessions, n)}</option>
        {/each}
      </select>
    </div>
    {#if trainingMaxes.length > 0}
      <div class="tm-reference" aria-label="Training maxes for this cycle">
        <span class="tm-label">TM</span>
        <span class="tm-values">
          {#each trainingMaxes as { liftKey, trainingMax }}
            <span class="tm-value">{LIFT_LABELS[liftKey]} {trainingMax}</span>
          {/each}
        </span>
      </div>
    {/if}
    {#key selectedCycle}
      <WeekPager
        {weeks}
        {program}
        {initialWeekIndex}
        onWeekChange={(weekIndex) => saveViewPosition({ cycleNumber: selectedCycle, weekIndex })}
      />
    {/key}
  {/if}
</div>

<style>
  .cheat-sheet {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .empty-text {
    text-align: center;
    color: var(--color-secondary-label);
    padding: var(--space-xl);
  }
  .cycle-picker {
    padding: var(--space-sm) var(--space-lg) 0;
  }
  .tm-reference {
    display: flex;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-lg) 0;
    font-size: 14px;
  }
  .tm-label {
    font-weight: 600;
    color: var(--color-secondary-label);
  }
  .tm-values {
    display: grid;
    grid-template-columns: repeat(2, max-content);
    column-gap: var(--space-lg);
    row-gap: 2px;
    font-variant-numeric: tabular-nums;
  }
  .tm-value {
    white-space: nowrap;
  }
  select {
    width: 100%;
    padding: var(--space-sm);
    border-radius: 6px;
    border: 1px solid var(--color-separator);
    background: var(--color-card-bg);
    color: var(--color-label);
  }
</style>
