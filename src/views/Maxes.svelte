<script lang="ts">
  // Enter/edit training maxes for the four main lifts. Gated on a program
  // existing — per PRD §1, entering maxes comes after template selection,
  // since the effective TM percentage comes from the chosen Leader template.
  import { totalCyclesInModel } from "../generator/types";
  import { LIFT_ORDER } from "../lift-labels";
  import { stateStore } from "../stores/state";
  import { viewStore } from "../stores/view";
  import LiftRow from "./LiftRow.svelte";

  $: lifts = $stateStore.lifts;
  $: program = $stateStore.program;
</script>

<div class="maxes">
  {#if !program}
    <div class="empty">
      <p class="empty-text">Choose a template first, then come back to enter your training maxes.</p>
      <button class="link" on:click={() => viewStore.set("program")}>Go to Program</button>
    </div>
  {:else}
    <div class="scroll-content">
      {#each LIFT_ORDER as liftKey (liftKey)}
        <LiftRow
          {liftKey}
          existing={lifts.find((l) => l.liftKey === liftKey)}
          tmPercentage={program.tmPercentage}
          cycleCount={totalCyclesInModel(program.programmingModel)}
          isBeginnerModel={program.programmingModel === "beginner"}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .maxes {
    flex: 1;
    overflow-y: auto;
  }
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-xl);
    text-align: center;
  }
  .empty-text {
    color: var(--color-secondary-label);
  }
  .link {
    background: none;
    border: none;
    color: var(--color-blue);
    font-weight: 600;
    font-size: 15px;
    padding: 0;
  }
  .scroll-content {
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
  }
</style>
