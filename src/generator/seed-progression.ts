// Advancing a stored seed — PRD §1.9's paths. Numbers in, numbers out, same
// as every other generator module; no React, no Supabase, no storage.
// `use-lifts.ts` is the only thing that calls these and then persists the
// result via saveLift — this module never touches state.
//
// A third path, progressFailedTest (a failed 7th Week TM test: estimate a
// fresh 1RM from the weight/reps managed, then re-derive the seed at the
// lift's own already-effective percentage), used to live here. Removed:
// once it stopped asking for a fresh percentage choice, it became
// byte-for-byte the same computation as maxes.tsx's "enter a max" form —
// oneRepMaxFromPerformance then trainingMaxSeedFromOneRepMax at the same
// percentage — so the Failed TM Test control in the UI was pure
// duplication and came out too. See docs/plan-structure.md "Reading the
// TM test".

/**
 * Normal progression, applied once a whole plan (every Leader and Anchor
 * cycle) is complete: advance the seed by the increment for *every* cycle
 * the plan ran, not just one. A 2+1 plan runs 3 cycles total, so its next
 * seed is `seed + 3 x increment` — continuing the exact per-cycle rate
 * `cycles.ts` already uses inside a block (see `totalCyclesInModel`'s doc
 * comment), rather than resetting it at the plan boundary. `cycleCount`
 * comes from `totalCyclesInModel(program.programmingModel)`.
 */
export function progressNormal(seedLb: number, incrementLb: number, cycleCount: number): number {
  return seedLb + incrementLb * cycleCount;
}

/**
 * A stalled lift backs up three increments. Per-lift, arithmetic rather
 * than history — it can happen at any point in a block, not only at its
 * end, and needs no record of where the stall occurred.
 */
export function progressStall(seedLb: number, incrementLb: number): number {
  return seedLb - 3 * incrementLb;
}
