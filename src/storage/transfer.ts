// Manual backup — not sync. localStorage is the only copy of a user's state
// (docs/ARCHITECTURE.md §4), so clearing site data destroys everything with
// no copy anywhere else. exportJson/importJson is the mitigation: an export
// the user triggers to a file, and an import that reads one back.

import { load, save, type State } from "./state";

export function serialize(state: State): string {
  return JSON.stringify(state, null, 2);
}

export function deserialize(json: string): State {
  const parsed = JSON.parse(json) as Partial<State>;
  return { lifts: parsed.lifts ?? [], program: parsed.program ?? null };
}

export function exportJson(): void {
  const blob = new Blob([serialize(load())], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "terminus-data-export.json";
  a.click();
  URL.revokeObjectURL(url);
}

export async function importJson(file: File): Promise<State> {
  const state = deserialize(await file.text());
  save(state);
  return state;
}
