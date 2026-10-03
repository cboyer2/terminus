<script lang="ts">
  import type { Program, Session } from "../generator/types";
  import PhaseReferenceCard from "./PhaseReferenceCard.svelte";
  import SessionCard from "./SessionCard.svelte";

  export let weeks: Session[][];
  export let program: Program;

  let scroller: HTMLDivElement;
  let pageIndex = 0;

  function onScroll() {
    if (!scroller || scroller.clientWidth === 0) return;
    pageIndex = Math.round(scroller.scrollLeft / scroller.clientWidth);
  }
</script>

<div class="pager">
  <div class="scroller" bind:this={scroller} on:scroll={onScroll}>
    {#each weeks as weekSessions, i (i)}
      <div class="page">
        {#if weekSessions[0]}
          <PhaseReferenceCard session={weekSessions[0]} {program} />
        {/if}
        {#each weekSessions as session (session.sessionNumber)}
          <SessionCard {session} />
        {/each}
      </div>
    {/each}
  </div>
  <div class="page-indicator">Week {pageIndex + 1} of {weeks.length}</div>
</div>

<style>
  .pager {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .scroller {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }
  .page {
    flex: 0 0 100%;
    scroll-snap-align: start;
    overflow-y: auto;
    padding: var(--space-lg);
  }
  .page-indicator {
    text-align: center;
    font-size: 13px;
    color: var(--color-secondary-label);
    padding: var(--space-sm) 0;
  }
</style>
