import { describe, expect, it } from "vitest";

import { resolveByRole } from "../types";

describe("resolveByRole", () => {
  it("returns a plain value unchanged, regardless of role", () => {
    expect(resolveByRole(5, "leader")).toBe(5);
    expect(resolveByRole(5, "standalone")).toBe(5);
  });

  it("returns the value for the matching role", () => {
    const field = { leader: 10, anchor: 5, default: 7 };
    expect(resolveByRole(field, "leader")).toBe(10);
    expect(resolveByRole(field, "anchor")).toBe(5);
  });

  it("falls back to default when the role isn't specified", () => {
    const field = { leader: 10, default: 7 };
    expect(resolveByRole(field, "anchor")).toBe(7);
    expect(resolveByRole(field, "standalone")).toBe(7);
  });

  it("does not mistake a plain object value for a role map", () => {
    // A prescription field can itself be an object (e.g. { min, max }).
    // Only an object with a "default" key is treated as role-keyed.
    const field = { min: 10, max: 20 };
    expect(resolveByRole(field, "leader")).toEqual({ min: 10, max: 20 });
  });
});
