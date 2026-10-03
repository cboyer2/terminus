<script lang="ts">
  // The cheat sheet — a cycle picker plus a swipeable pager over that
  // cycle's calendar weeks. Ported from the old app/(tabs)/index.tsx; see
  // that file's header comment (preserved in git history) and
  // docs/ARCHITECTURE.md "A cycle is three progression steps per lift, not
  // three calendar weeks" for why a calendar week isn't one plan-wide
  // constant. planStore is the only seam into generator/ this view uses.
  import { planStore } from "../stores/plan";
  import { stateStore } from "../stores/state";
  import { chunkCycleIntoWeeks, cycleLabel } from "./cheat-sheet-helpers";
  import WeekPager from "./WeekPager.svelte";

  let cyclePick: number | null = null;

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
</script>

<div class="cheat-sheet">
  {#if error}
    <p class="empty-text">{error.message}</p>
  {:else if !plan || !program}
    <p class="empty-text">Enter your training maxes and choose a template to generate your plan.</p>
  {:else}
    <div class="cycle-picker">
      <select value={selectedCycle} on:change={(e) => (cyclePick = Number(e.currentTarget.value))}>
        {#each cycleNumbers as n}
          <option value={n}>{cycleLabel(plan.sessions, n)}</option>
        {/each}
      </select>
    </div>
    {#key selectedCycle}
      <WeekPager {weeks} {program} />
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
  select {
    width: 100%;
    padding: var(--space-sm);
    border-radius: 6px;
    border: 1px solid var(--color-separator);
    background: var(--color-card-bg);
    color: var(--color-label);
  }
</style>
