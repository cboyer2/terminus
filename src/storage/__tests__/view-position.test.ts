import { beforeEach, describe, expect, it } from "vitest";

import { load, save } from "../state";
import { loadViewPosition, saveViewPosition } from "../view-position";

describe("view position", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when nothing has been saved", () => {
    expect(loadViewPosition()).toBeNull();
  });

  it("round-trips a saved position", () => {
    saveViewPosition({ cycleNumber: 3, weekIndex: 2 });
    expect(loadViewPosition()).toEqual({ cycleNumber: 3, weekIndex: 2 });
  });

  it("rejects malformed values", () => {
    localStorage.setItem("terminus:viewPosition", JSON.stringify({ cycleNumber: -1, weekIndex: 1.5 }));
    expect(loadViewPosition()).toBeNull();
    localStorage.setItem("terminus:viewPosition", "not json");
    expect(loadViewPosition()).toBeNull();
  });

  it("is kept out of the State blob", () => {
    save({ lifts: [], program: null });
    saveViewPosition({ cycleNumber: 2, weekIndex: 1 });
    expect(load()).toEqual({ lifts: [], program: null });
  });
});
