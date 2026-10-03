import { beforeEach, describe, expect, it } from "vitest";

import { load, save } from "../state";
import { deserialize, serialize } from "../transfer";

describe("storage round-trip", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("save -> load -> export -> import returns the same state", () => {
    const original = {
      lifts: [{ liftKey: "squat" as const, role: "main" as const, trainingMaxSeed: 260, tmPercentageOverride: null, increment: 10 }],
      program: {
        programmingModel: "3+2" as const,
        leaderTrainingDays: 4 as const,
        anchorTrainingDays: 4 as const,
        deloadTrainingDays: 4 as const,
        tmTestTrainingDays: 4 as const,
        leaderTemplateId: "original-531",
        anchorTemplateId: "original-531",
        tmPercentage: 0.85,
        options: {},
      },
    };

    save(original);
    const loaded = load();
    const exported = serialize(loaded);
    const imported = deserialize(exported);

    expect(imported).toEqual(original);
  });

  it("loads an empty state when nothing is stored", () => {
    expect(load()).toEqual({ lifts: [], program: null });
  });
});
