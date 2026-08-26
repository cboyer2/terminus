// The single source of 5/3/1 arithmetic. Imports nothing — no React, no
// Supabase, no storage. Numbers in, numbers out. See docs/ARCHITECTURE.md §2, §7.

/**
 * Rounds to the nearest 5 lb, ties rounding up (242.5 -> 245). The one
 * rounding rule in the app, applied at every rounding point below. Takes no
 * mode parameter on purpose — see docs/ARCHITECTURE.md §7.
 *
 * Nudges by a magnitude-scaled epsilon before rounding: a training max times
 * a percentage like 0.7 can land on a binary floating-point value a few ULPs
 * under the exact .5 tie (175 * 0.7 === 122.49999999999999), which would
 * otherwise round down and silently break the ties-round-up rule. The
 * epsilon is scaled to the value's own magnitude and kept many orders of
 * magnitude smaller than any real-world fractional pound, so it corrects
 * only true floating-point noise — a flat "round to hundredths" first pass
 * is too blunt and can flip a genuinely non-tie value (e.g. 152.49609375,
 * meant to round down to 150) up across the boundary instead.
 */
export function roundToNearestFive(valueLb: number): number {
  const quotient = valueLb / 5;
  const epsilon = Math.abs(quotient) * Number.EPSILON * 100;
  return Math.round(quotient + epsilon) * 5;
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
 * Derives a displayable, rounded weight: a percentage of a base weight.
 * Used for main work, supplemental work, and — since a training max seed is
 * itself just a rounded percentage of a one-rep max — for computing that
 * seed at setup too.
 */
export function workingWeight(baseLb: number, percentage: number): number {
  return roundToNearestFive(baseLb * percentage);
}

/**
 * Derives a cycle's training max from a lift's stored seed: the seed plus
 * one increment per cycle already elapsed. `cycleNumber` is 1-based, so
 * cycle 1 returns the seed unchanged.
 *
 * Deliberately not rounded — docs/ARCHITECTURE.md §7 names exactly two
 * rounding points, estimated max and working weight, and this isn't either
 * of them. Rounding here too would double-round: for a seed that somehow
 * isn't 5 lb-aligned (lifts.training_max_seed_lb has no CHECK constraint
 * enforcing it), trainingMax(203, 0, 1) rounded first gives 205, and
 * workingWeight(205, 0.65) then gives 135 - a full 5 lb off from just
 * rounding the true product once (workingWeight(203, 0.65) = 130). Passing
 * the raw sum through and letting workingWeight round once, at the one
 * point a displayable number actually gets produced, is what keeps that a
 * single rounding pass instead of two compounding ones.
 */
export function trainingMax(seedLb: number, incrementLb: number, cycleNumber: number): number {
  return seedLb + (cycleNumber - 1) * incrementLb;
}
