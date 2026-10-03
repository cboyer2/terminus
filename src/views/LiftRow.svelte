<script lang="ts">
  // Ported from maxes.tsx's LiftRow + ProgressSection. Deliberately not
  // built here: per-lift TM percentage override / increment override editing
  // — those live on the Program view's Advanced/Options sections, since
  // they're template/plan-level decisions, not something typed on this row.
  import { oneRepMaxFromPerformance, trainingMaxSeedFromOneRepMax } from "../generator/calc";
  import { progressNormal, progressStall } from "../generator/seed-progression";
  import { DEFAULT_INCREMENT_LB } from "../generator/types";
  import type { Lift, LiftKey } from "../generator/types";
  import { LIFT_LABELS } from "../lift-labels";
  import { stateStore } from "../stores/state";

  export let liftKey: LiftKey;
  export let existing: Lift | undefined;
  export let tmPercentage: number;
  export let cycleCount: number;
  export let isBeginnerModel: boolean;

  let weight = "";
  let reps = "1";
  let saveError: string | null = null;
  let progressMode: "normal" | "stall" | null = null;
  let progressError: string | null = null;

  $: percentage = existing?.tmPercentageOverride ?? tmPercentage;
  $: weightLb = Number(weight);
  $: repsCompleted = Number(reps) || 1;
  $: oneRepMax = weightLb > 0 ? oneRepMaxFromPerformance(weightLb, repsCompleted) : null;
  $: seed = oneRepMax !== null ? trainingMaxSeedFromOneRepMax(oneRepMax, percentage) : null;

  function handleSave() {
    if (seed === null) return;
    try {
      stateStore.saveLift({
        liftKey,
        role: "main",
        trainingMaxSeed: seed,
        tmPercentageOverride: existing?.tmPercentageOverride ?? null,
        increment: existing?.increment ?? DEFAULT_INCREMENT_LB[liftKey],
      });
      weight = "";
      reps = "1";
      saveError = null;
    } catch (err) {
      saveError = err instanceof Error ? err.message : String(err);
    }
  }

  function applyProgress(newSeed: number) {
    if (!existing) return;
    try {
      stateStore.saveLift({ ...existing, trainingMaxSeed: newSeed });
      progressMode = null;
      progressError = null;
    } catch (err) {
      progressError = err instanceof Error ? err.message : String(err);
    }
  }

  $: normalSeed = existing ? progressNormal(existing.trainingMaxSeed, existing.increment, cycleCount) : null;
  $: stallSeed = existing ? progressStall(existing.trainingMaxSeed, existing.increment) : null;
</script>

<div class="lift-card">
  <div class="lift-name">{LIFT_LABELS[liftKey]}</div>
  <div class="current-seed">
    {existing ? `Current training max: ${existing.trainingMaxSeed} lb` : "No training max set yet"}
  </div>

  <div class="row">
    <label class="field">
      <span>Weight</span>
      <input type="number" inputmode="numeric" placeholder="e.g. 275" bind:value={weight} />
    </label>
    <label class="field">
      <span>Reps</span>
      <input type="number" inputmode="numeric" placeholder="1 if this is your max" bind:value={reps} />
    </label>
  </div>

  {#if seed !== null}
    <p class="preview">{oneRepMax} lb 1RM x {Math.round(percentage * 100)}% = {seed} lb training max</p>
  {/if}
  {#if saveError}
    <p class="error-text">{saveError}</p>
  {/if}

  <button class="save-button" disabled={seed === null} on:click={handleSave}>Save</button>

  {#if existing}
    <div class="progress-section">
      <div class="progress-label">Progress</div>
      <div class="segment-row">
        <button
          class="segment"
          class:selected={progressMode === "normal"}
          on:click={() => (progressMode = progressMode === "normal" ? null : "normal")}
        >
          Normal
        </button>
        {#if isBeginnerModel}
          <button
            class="segment"
            class:selected={progressMode === "stall"}
            on:click={() => (progressMode = progressMode === "stall" ? null : "stall")}
          >
            Stalled
          </button>
        {/if}
      </div>

      {#if progressMode === "normal" && normalSeed !== null}
        <p class="progress-preview">
          {existing.trainingMaxSeed} lb + {cycleCount} × {existing.increment} lb = {normalSeed} lb
        </p>
        <button class="save-button" on:click={() => applyProgress(normalSeed as number)}>Confirm</button>
      {/if}

      {#if progressMode === "stall" && isBeginnerModel && stallSeed !== null}
        <p class="progress-preview">
          {existing.trainingMaxSeed} lb − 3 × {existing.increment} lb = {stallSeed} lb
        </p>
        <button class="save-button" on:click={() => applyProgress(stallSeed as number)}>Confirm</button>
      {/if}

      {#if progressError}
        <p class="error-text">{progressError}</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .lift-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding-bottom: var(--space-lg);
    border-bottom: 1px solid var(--color-separator);
  }
  .lift-name {
    font-size: 18px;
    font-weight: 700;
  }
  .current-seed {
    font-size: 14px;
    color: var(--color-secondary-label);
  }
  .row {
    display: flex;
    gap: var(--space-md);
  }
  .field {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    font-size: 13px;
    color: var(--color-secondary-label);
  }
  .field input {
    padding: var(--space-sm);
    border-radius: 6px;
    border: 1px solid var(--color-separator);
    background: var(--color-card-bg);
    color: var(--color-label);
  }
  .preview,
  .progress-preview {
    font-size: 14px;
    color: var(--color-secondary-label);
    margin: 0;
  }
  .error-text {
    font-size: 13px;
    color: #ff3b30;
    margin: 0;
  }
  .save-button {
    background: var(--color-blue);
    color: var(--color-on-tint);
    border: none;
    border-radius: 4px;
    padding: var(--space-md);
    font-size: 16px;
    font-weight: 600;
  }
  .save-button:disabled {
    opacity: 0.5;
  }
  .progress-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-separator);
  }
  .progress-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-secondary-label);
    text-transform: uppercase;
  }
  .segment-row {
    display: flex;
    gap: var(--space-sm);
  }
  .segment {
    flex: 1;
    padding: var(--space-sm) 0;
    border-radius: 4px;
    border: 1px solid var(--color-separator);
    background: transparent;
    color: var(--color-label);
    font-size: 14px;
    font-weight: 600;
  }
  .segment.selected {
    background: var(--color-blue);
    border-color: var(--color-blue);
    color: var(--color-on-tint);
  }
</style>
