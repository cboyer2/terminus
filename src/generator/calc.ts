// The single source of 5/3/1 arithmetic. Imports nothing — no React, no
// Supabase, no storage. Numbers in, numbers out. See docs/ARCHITECTURE.md §2, §7.

/**
 * Rounds to the nearest 5 lb, ties rounding up (242.5 -> 245). The one
 * rounding rule in the app, applied at every rounding point below. Takes no
 * mode parameter on purpose — see docs/ARCHITECTURE.md §7.
 *
 * Snaps to hundredths before dividing: a training max times a percentage
 * like 0.7 can land on a binary floating-point value a hair under the exact
 * .5 tie (175 * 0.7 === 122.49999999999999), which would otherwise round
 * down and silently break the ties-round-up rule.
 */
export function roundToNearestFive(valueLb: number): number {
  const cleanedLb = Math.round(valueLb * 100) / 100;
  return Math.round(cleanedLb / 5) * 5;
}

/**
 * Estimates a one-rep max from a lighter set: weight x reps x 0.0333 +
 * weight, rounded to the nearest 5 lb. Matches the book's worked example:
 * 275 lb x 8 reps -> 348.26 -> 350.
 */
export function estimatedMax(weightLb: number, reps: number): number {
  return roundToNearestFive(weightLb * reps * 0.0333 + weightLb);
}

/**
 * Derives a training max from a one-rep max and a TM percentage, rounded to
 * the nearest 5 lb. This is what produces a lift's `trainingMaxSeed` at
 * setup; `tmPercentage` is 0-1, never 85.
 */
export function trainingMax(oneRepMaxLb: number, tmPercentage: number): number {
  return roundToNearestFive(oneRepMaxLb * tmPercentage);
}

/**
 * Derives a displayable, rounded weight for a set: a percentage of a
 * training max. Used for main work, supplemental, and anything else
 * expressed as a percentage of a training max.
 */
export function workingWeight(trainingMaxLb: number, percentage: number): number {
  return roundToNearestFive(trainingMaxLb * percentage);
}
