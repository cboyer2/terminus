import { describe, expect, it } from "vitest";

import { estimatedMax, rescaleTrainingMaxSeed, roundToNearestFive, trainingMax, trainingMaxSeedFromOneRepMax, workingWeight } from "../calc";

describe("roundToNearestFive", () => {
  it("rounds down when closer to the lower multiple of 5", () => {
    expect(roundToNearestFive(263)).toBe(265);
    expect(roundToNearestFive(261)).toBe(260);
  });

  it("rounds ties up, per docs/ARCHITECTURE.md §7", () => {
    expect(roundToNearestFive(242.5)).toBe(245);
    expect(roundToNearestFive(227.5)).toBe(230);
  });

  it("leaves an exact multiple of 5 unchanged", () => {
    expect(roundToNearestFive(300)).toBe(300);
  });
});

describe("estimatedMax", () => {
  it("matches the book's worked example: 275x8 -> 350", () => {
    // docs/ARCHITECTURE.md §7: the raw formula gives ~348, which rounds to 350.
    expect(estimatedMax(275, 8)).toBe(350);
  });

  it("computes the raw formula before rounding", () => {
    // 200 x 1 x 0.0333 + 200 = 206.66 -> rounds to 205.
    expect(estimatedMax(200, 1)).toBe(205);
  });
});

describe("trainingMax", () => {
  it("returns the seed unchanged for the first cycle of a block", () => {
    expect(trainingMax(405, 10, 0)).toBe(405);
  });

  it("adds one increment per subsequent cycle", () => {
    expect(trainingMax(405, 10, 1)).toBe(415);
    expect(trainingMax(405, 10, 2)).toBe(425);
  });

  it("supports the smaller upper-body increment", () => {
    expect(trainingMax(200, 5, 3)).toBe(215);
  });
});

describe("workingWeight", () => {
  it("resolves an exact percentage with no rounding needed", () => {
    expect(workingWeight(400, 0.65)).toBe(260);
    expect(workingWeight(400, 0.75)).toBe(300);
    expect(workingWeight(400, 0.85)).toBe(340);
  });

  it("rounds a non-multiple-of-5 result to the nearest 5 lb", () => {
    // 405 x 0.65 = 263.25 -> rounds to 265.
    expect(workingWeight(405, 0.65)).toBe(265);
  });

  it("rounds a tie up, per the shared rounding rule", () => {
    // 350 x 0.65 = 227.5, an exact tie -> rounds to 230, not 225.
    expect(workingWeight(350, 0.65)).toBe(230);
  });
});

describe("trainingMaxSeedFromOneRepMax", () => {
  it("applies the TM percentage to an entered 1RM, rounded to the nearest 5 lb", () => {
    expect(trainingMaxSeedFromOneRepMax(405, 0.9)).toBe(365);
    expect(trainingMaxSeedFromOneRepMax(275, 0.85)).toBe(235);
  });

  it("rounds a tie up, per the shared rounding rule", () => {
    // 350 x 0.65 = 227.5, an exact tie -> rounds to 230, not 225.
    expect(trainingMaxSeedFromOneRepMax(350, 0.65)).toBe(230);
  });
});

describe("rescaleTrainingMaxSeed", () => {
  it("scales the seed by the ratio of new to old percentage", () => {
    // 340 / 0.85 = 400 (the implied 1RM), x 0.9 = 360 exactly.
    expect(rescaleTrainingMaxSeed(340, 0.85, 0.9)).toBe(360);
  });

  it("rounds a non-exact result to the nearest 5 lb", () => {
    // 400 x (0.85 / 0.9) = 377.77... -> rounds to 380.
    expect(rescaleTrainingMaxSeed(400, 0.9, 0.85)).toBe(380);
  });

  it("leaves the seed unchanged when the percentage doesn't change", () => {
    expect(rescaleTrainingMaxSeed(405, 0.9, 0.9)).toBe(405);
  });
});
