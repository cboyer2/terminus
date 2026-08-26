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
