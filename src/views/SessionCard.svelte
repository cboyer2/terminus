<script lang="ts">
  import { LIFT_LABELS } from "../lift-labels";
  import type { Session, SessionLiftEntry } from "../generator/types";
  import { stepLabel, repsLabel, groupSets, type SetGroup } from "./cheat-sheet-helpers";

  export let session: Session;

  $: primaryStep = session.lifts[0]?.step;

  function groupsFor(entry: SessionLiftEntry) {
    return {
      warmup: groupSets(entry.warmupSets),
      main: groupSets(entry.mainWork),
      supplemental: groupSets(entry.supplemental),
    };
  }

  function setLine(group: SetGroup): string {
    const { set, count } = group;
    const prefix = count > 1 ? `${count} x ` : "";
    const pr = set.isPrSet ? " · PR" : "";
    return `${prefix}${set.workingWeight} lb · ${Math.round(set.tmPercentage * 100)}% · ${repsLabel(set.reps)} reps${pr}`;
  }
</script>

<div class="session">
  <div class="session-header">
    <span class="session-number">Session {session.sessionNumber}</span>
    {#if primaryStep}
      <span class="session-meta">{stepLabel(primaryStep)}</span>
    {/if}
  </div>

  {#each session.lifts as entry (entry.liftKey)}
    {@const g = groupsFor(entry)}
    <div class="lift-entry">
      <div class="lift-name">{LIFT_LABELS[entry.liftKey]}</div>

      {#if g.warmup.length > 0}
        <div class="warmup-label">Warm-up</div>
        {#each g.warmup as group}
          <div class="set-text">{setLine(group)}</div>
        {/each}
      {/if}

      {#if g.main.length > 0}
        <div class="main-work-label">Main Work</div>
      {/if}
      {#each g.main as group}
        <div class="set-text">{setLine(group)}</div>
      {/each}

      {#if g.supplemental.length > 0}
        <div class="supplemental-label">
          {entry.supplementalLiftKey === entry.liftKey ? "Supplemental" : `Supplemental (${LIFT_LABELS[entry.supplementalLiftKey]})`}
        </div>
        {#each g.supplemental as group}
          <div class="set-text">{setLine(group)}</div>
        {/each}
      {/if}
    </div>
  {/each}
</div>

<style>
  .session {
    margin-bottom: var(--space-xl);
    padding-bottom: var(--space-lg);
    border-bottom: 1px solid var(--color-separator);
  }
  .session-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-sm);
  }
  .session-number {
    font-size: 16px;
    font-weight: 600;
  }
  .session-meta {
    font-size: 14px;
    color: var(--color-secondary-label);
  }
  .lift-entry {
    margin-top: var(--space-sm);
  }
  .lift-name {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: var(--space-xs);
  }
  .set-text {
    font-size: 14px;
    color: var(--color-secondary-label);
  }
  .supplemental-label {
    font-size: 13px;
    font-weight: 600;
    margin-top: var(--space-xs);
  }
  .warmup-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-secondary-label);
  }
  .main-work-label {
    font-size: 13px;
    font-weight: 600;
    margin-top: var(--space-xs);
  }
</style>
