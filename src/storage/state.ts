// The only I/O layer — one JSON blob in localStorage. See
// docs/ARCHITECTURE.md §4. No plan, position, or date is ever stored here;
// just the inputs the generator needs (lifts + program).

import type { Lift, Program } from "../generator/types";

export interface State {
  lifts: Lift[];
  program: Program | null;
}

const STORAGE_KEY = "terminus:state";

function emptyState(): State {
  return { lifts: [], program: null };
}

export function load(): State {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyState();
  try {
    const parsed = JSON.parse(raw) as Partial<State>;
    return { lifts: parsed.lifts ?? [], program: parsed.program ?? null };
  } catch {
    return emptyState();
  }
}

export function save(state: State): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
