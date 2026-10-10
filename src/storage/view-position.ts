// Remembers which cycle and week page the cheat sheet last showed, so an
// installed PWA that iOS kills in the background reopens on the same page.
//
// This is view state, not training position: it records what was last on
// screen, never where the lifter is in the program. It lives under its own
// key, outside the State blob, so it is never exported, imported, or handed
// to the generator. Indices only — no weight is ever stored.

const STORAGE_KEY = "terminus:viewPosition";

export interface ViewPosition {
  cycleNumber: number;
  weekIndex: number;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function loadViewPosition(): ViewPosition | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ViewPosition>;
    if (!isNonNegativeInteger(parsed.cycleNumber) || !isNonNegativeInteger(parsed.weekIndex)) return null;
    return { cycleNumber: parsed.cycleNumber, weekIndex: parsed.weekIndex };
  } catch {
    return null;
  }
}

export function saveViewPosition(position: ViewPosition): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch {
    // Losing the remembered page is harmless; the view falls back to its default.
  }
}
