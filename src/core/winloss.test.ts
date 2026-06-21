import { describe, it, expect } from "vitest";
import { getWinner, isGameOver } from "./winloss";
import { state } from "./test-utils";

describe("getWinner", () => {
  it("returns null while both sides are alive", () => {
    expect(getWinner(state())).toBeNull();
    expect(isGameOver(state())).toBe(false);
  });

  it("returns player when the enemy life hits 0", () => {
    expect(getWinner(state({ enemyLife: 0 }))).toBe("player");
    expect(isGameOver(state({ enemyLife: 0 }))).toBe(true);
  });

  it("returns enemy when the player life hits 0", () => {
    expect(getWinner(state({ playerLife: -1 }))).toBe("enemy");
  });
});
