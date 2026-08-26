import { describe, expect, it } from "vitest";
import { estimatedMax, roundToNearestFive, trainingMax, workingWeight } from "../calc";

describe("roundToNearestFive", () => {
  it("rounds down below the midpoint", () => {
    expect(roundToNearestFive(347)).toBe(345);
  });

  it("rounds ties up, per docs/ARCHITECTURE.md §7", () => {
    expect(roundToNearestFive(242.5)).toBe(245);
  });

  it("leaves an exact multiple of 5 unchanged", () => {
    expect(roundToNearestFive(230)).toBe(230);
  });

  it("rounds a floating-point tie up despite representation noise", () => {
    // 175 * 0.7 === 122.49999999999999 in IEEE-754, not the mathematically
    // exact 122.5 - naive Math.round(x/5)*5 rounds this down to 120.
    expect(roundToNearestFive(175 * 0.7)).toBe(125);
    // 325 * 0.7 === 227.49999999999997, same failure mode.
    expect(roundToNearestFive(325 * 0.7)).toBe(230);
  });
});

describe("estimatedMax", () => {
  // Frozen against the book's own worked example (docs/ARCHITECTURE.md §7):
  // 275 lb x 8 reps -> 348.26 -> rounds to 350. A different number here is a
  // hard failure, not a style choice.
  it("matches the book's 275 lb x 8 rep example", () => {
    expect(estimatedMax(275, 8)).toBe(350);
  });

  it("adds a small buffer over the weight for a single rep", () => {
    // 300 x 1 x 0.0333 + 300 = 309.99 -> 310
    expect(estimatedMax(300, 1)).toBe(310);
  });
});

describe("trainingMax", () => {
  it("applies the TM percentage with no rounding needed", () => {
    expect(trainingMax(350, 0.9)).toBe(315);
  });

  it("rounds the result to the nearest 5 lb", () => {
    // 365 x 0.85 = 310.25 -> 310
    expect(trainingMax(365, 0.85)).toBe(310);
  });
});

describe("workingWeight", () => {
  it("applies a week's percentage with no rounding needed", () => {
    expect(workingWeight(350, 0.9)).toBe(315);
  });

  it("rounds a tie up, matching a classic 5/3/1 week-one first set", () => {
    // 350 x 0.65 = 227.5 -> 230
    expect(workingWeight(350, 0.65)).toBe(230);
  });

  it("rounds up at a 70% week-two first set despite floating-point noise", () => {
    // 325 x 0.7 === 227.49999999999997 in IEEE-754; the true tie is 227.5,
    // which must round up to 230, not down to 225. 70% is the book's
    // standard week-two first-set percentage, so this runs every cycle.
    expect(workingWeight(325, 0.7)).toBe(230);
  });
});
