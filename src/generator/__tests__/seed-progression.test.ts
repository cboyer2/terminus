import { describe, expect, it } from "vitest";

import { progressNormal, progressStall } from "../seed-progression";

describe("progressNormal", () => {
  it("adds one increment per cycle the plan ran, not just one increment", () => {
    // A 2+1 plan runs 3 cycles total (2 leader + 1 anchor).
    expect(progressNormal(405, 10, 3)).toBe(435);
    expect(progressNormal(200, 5, 3)).toBe(215);
  });

  it("a single-cycle plan (Beginner) still adds exactly one increment", () => {
    expect(progressNormal(405, 5, 1)).toBe(410);
  });

  it("scales up for longer models — 3+2 runs 5 cycles total", () => {
    expect(progressNormal(405, 10, 5)).toBe(455);
  });
});

describe("progressStall", () => {
  it("backs up three increments", () => {
    expect(progressStall(405, 10)).toBe(375);
    expect(progressStall(200, 5)).toBe(185);
  });

  it("is arithmetic, not clamped — a low enough seed can go negative", () => {
    expect(progressStall(20, 10)).toBe(-10);
  });
});
