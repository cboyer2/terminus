<script lang="ts">
  import { LOGO_MARK_SVG } from "./assets/logo-mark";
  import { stateStore } from "./stores/state";
  import { viewStore, type View } from "./stores/view";
  import { exportJson, importJson } from "./storage/transfer";
  import CheatSheet from "./views/CheatSheet.svelte";
  import Maxes from "./views/Maxes.svelte";
  import Program from "./views/Program.svelte";

  const TABS: { id: View; label: string }[] = [
    { id: "cheatSheet", label: "Plan" },
    { id: "maxes", label: "Maxes" },
    { id: "program", label: "Program" },
  ];

  let fileInput: HTMLInputElement;
  let importMessage: string | null = null;

  async function handleImport(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const next = await importJson(file);
      stateStore.replaceState(next);
      importMessage = "Imported.";
    } catch (err) {
      importMessage = err instanceof Error ? err.message : String(err);
    }
    (e.currentTarget as HTMLInputElement).value = "";
  }
</script>

<header>
  <div class="brand">
    <span class="logo">{@html LOGO_MARK_SVG}</span>
    <span class="title">Terminus</span>
  </div>
  <div class="backup">
    <button on:click={exportJson}>Export</button>
    <button on:click={() => fileInput.click()}>Import</button>
    <input bind:this={fileInput} type="file" accept="application/json" on:change={handleImport} hidden />
  </div>
</header>

{#if importMessage}
  <p class="import-message">{importMessage}</p>
{/if}

<main>
  {#if $viewStore === "cheatSheet"}
    <CheatSheet />
  {:else if $viewStore === "maxes"}
    <Maxes />
  {:else}
    <Program />
  {/if}
</main>

<nav>
  {#each TABS as tab (tab.id)}
    <button class:active={$viewStore === tab.id} on:click={() => viewStore.set(tab.id)}>
      {tab.label}
    </button>
  {/each}
</nav>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--color-separator);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .logo {
    width: 28px;
    height: 28px;
    display: block;
  }
  .logo :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }
  .title {
    font-size: 17px;
    font-weight: 700;
  }
  .backup {
    display: flex;
    gap: var(--space-sm);
  }
  .backup button {
    background: none;
    border: 1px solid var(--color-separator);
    border-radius: 6px;
    padding: var(--space-xs) var(--space-sm);
    font-size: 13px;
    color: var(--color-secondary-label);
  }
  .import-message {
    text-align: center;
    font-size: 13px;
    color: var(--color-secondary-label);
    margin: var(--space-xs) 0 0;
  }
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  nav {
    display: flex;
    border-top: 1px solid var(--color-separator);
    padding-bottom: env(safe-area-inset-bottom);
  }
  nav button {
    flex: 1;
    background: none;
    border: none;
    padding: var(--space-md) 0;
    font-size: 13px;
    color: var(--color-secondary-label);
  }
  nav button.active {
    color: var(--color-blue);
    font-weight: 600;
  }
</style>
