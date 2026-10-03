// The seam between storage/ and the generator — wraps storage/state.ts in a
// Svelte store. Synchronous throughout: there is no network, so none of the
// loading/error/cache plumbing the old Supabase-backed hooks needed applies
// here. See docs/ARCHITECTURE.md §5.
//
// Deliberately thin: saveLift/saveProgram just persist. The seed-rescale-on-
// percentage-change logic (docs/ARCHITECTURE.md §3 "Changing the
// percentage") depends on per-lift override picks that only the Program
// view holds, so that orchestration lives there, calling saveLift per
// affected lift — same shape as the original templates.tsx handler.

import { writable } from "svelte/store";

import type { Lift, Program } from "../generator/types";
import { load, save, type State } from "../storage/state";

function createStateStore() {
  const store = writable<State>(load());

  function saveLift(lift: Lift): void {
    store.update((state) => {
      const next = { ...state, lifts: [...state.lifts.filter((l) => l.liftKey !== lift.liftKey), lift] };
      save(next);
      return next;
    });
  }

  function saveProgram(program: Program): void {
    store.update((state) => {
      const next = { ...state, program };
      save(next);
      return next;
    });
  }

  function replaceState(next: State): void {
    save(next);
    store.set(next);
  }

  return { subscribe: store.subscribe, saveLift, saveProgram, replaceState };
}

export const stateStore = createStateStore();
