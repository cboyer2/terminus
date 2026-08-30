// Numbers in, numbers out. See docs/ARCHITECTURE.md §2, §7.
//
// This is the single module that owns rounding, TM-from-seed, and
// percentage-to-weight math, per CLAUDE.md's "hardcode math in only one
// place" rule. Every screen and every other generator module calls these
// functions rather than reimplementing the arithmetic.

/**
 * Round to the nearest 5 lb, ties rounding up (242.5 -> 245).
 * `Math.round` already rounds half-up for positive numbers, which is the
 * behavior every frozen fixture in this project assumes.
 */
export function roundToNearestFive(pounds: number): number {
  return Math.round(pounds / 5) * 5;
}

/**
 * Estimate a one-rep max from a weight and rep count actually performed.
 * `weight × reps × 0.0333 + weight`, rounded to the nearest 5 lb.
 */
export function estimatedMax(liftedWeightLb: number, repsCompleted: number): number {
  const rawEstimatedMax = liftedWeightLb * repsCompleted * 0.0333 + liftedWeightLb;
  return roundToNearestFive(rawEstimatedMax);
}

/**
 * A one-rep max from a weight actually lifted for some number of reps —
 * the shared entry point for both "enter your maxes" and "a failed 7th Week
 * TM test," which are the same question (what's this weight worth as a
 * max?) asked in two different screens. `repsCompleted <= 1` means the
 * weight itself already *is* the max, so the estimating formula is skipped
 * rather than run with reps=1, which would multiply the weight by 1.0333
 * instead of returning it unchanged.
 */
export function oneRepMaxFromPerformance(liftedWeightLb: number, repsCompleted: number): number {
  return repsCompleted <= 1 ? liftedWeightLb : estimatedMax(liftedWeightLb, repsCompleted);
}

/**
 * Derive a cycle's training max from a block's stored seed.
 * `cycleIndex` is 0-based: the first cycle of the block equals the seed
 * itself, and each subsequent cycle adds one more increment.
 */
export function trainingMax(
  trainingMaxSeed: number,
  incrementLb: number,
  cycleIndex: number
): number {
  return trainingMaxSeed + incrementLb * cycleIndex;
}

/**
 * Resolve a percentage of a training max to a displayable working weight,
 * rounded to the nearest 5 lb.
 */
export function workingWeight(trainingMaxLb: number, tmPercentage: number): number {
  return roundToNearestFive(trainingMaxLb * tmPercentage);
}

/**
 * Derive a training max seed from an entered one-rep max (actual or
 * estimated) and the effective TM percentage for that lift, rounded to the
 * nearest 5 lb. The seed, not the 1RM, is what's stored — see
 * docs/ARCHITECTURE.md §3: "The 1RM is not stored."
 */
export function trainingMaxSeedFromOneRepMax(oneRepMaxLb: number, tmPercentage: number): number {
  return roundToNearestFive(oneRepMaxLb * tmPercentage);
}

/**
 * Rescale a stored seed when the plan-wide TM percentage changes (e.g. a
 * new Leader template with a different declared percentage), rounded to
 * the nearest 5 lb. There's no stored 1RM to recompute from, so this
 * preserves whatever progression the seed has accumulated while honouring
 * the new percentage — see docs/ARCHITECTURE.md §3 "Changing the
 * percentage": `newSeed = oldSeed × (newPercentage / oldPercentage)`.
 */
export function rescaleTrainingMaxSeed(oldSeedLb: number, oldTmPercentage: number, newTmPercentage: number): number {
  return roundToNearestFive(oldSeedLb * (newTmPercentage / oldTmPercentage));
}
