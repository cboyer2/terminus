<script lang="ts">
  import type { Program, Session } from "../generator/types";
  import { formatCategory, phaseLabel, totalRepsLabel } from "./cheat-sheet-helpers";

  export let session: Session;
  export let program: Program;

  $: jumps = session.jumpsOrThrows;
</script>

<div class="phase-reference">
  <div class="phase-title">{phaseLabel(session, program)}</div>

  {#if session.warmupCircuit.length > 0}
    <div class="ref-section">
      <div class="ref-heading">Warm-up / Mobility</div>
      {#each session.warmupCircuit as exercise}
        <div class="ref-line">{exercise.name} — {exercise.sets > 1 ? `${exercise.sets} x ` : ""}{exercise.reps}</div>
      {/each}
    </div>
  {/if}

  <div class="ref-section">
    <div class="ref-heading">Jumps / Throws</div>
    <div class="ref-line">{totalRepsLabel(jumps.totalReps)} total{jumps.guidance ? ` — ${jumps.guidance}` : ""}</div>
  </div>

  <div class="ref-section">
    <div class="ref-heading">Assistance</div>
    {#each session.assistance as target}
      <div class="ref-line">
        {formatCategory(target.category)}: {totalRepsLabel(target.totalReps)} reps{target.exerciseOptions.length > 0
          ? ` (${target.exerciseOptions.join(", ")})`
          : ""}
      </div>
    {/each}
  </div>

  <div class="ref-section">
    <div class="ref-heading">Conditioning</div>
    <div class="ref-line">Up to {session.conditioning.sessionsPerWeek} sessions/week — {session.conditioning.guidance}</div>
  </div>
</div>

<style>
  .phase-reference {
    margin-bottom: var(--space-xl);
    padding: var(--space-md);
    border-radius: 8px;
    border: 1px solid var(--color-separator);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  .phase-title {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--color-secondary-label);
  }
  .ref-section {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ref-heading {
    font-size: 13px;
    font-weight: 600;
  }
  .ref-line {
    font-size: 13px;
    color: var(--color-secondary-label);
  }
</style>
