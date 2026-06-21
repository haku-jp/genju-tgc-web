import { describe, it, expect } from "vitest";
import {
  BOARD_COLS,
  BOARD_ROWS,
  isInsideBoard,
  opponentOf,
  position,
  positionsEqual,
  unitAt,
  unitsOf,
} from "./state";
import { createInitialBattleState } from "./factory";

describe("position helpers", () => {
  it("positionsEqual compares row and col", () => {
    expect(positionsEqual(position(1, 2), position(1, 2))).toBe(true);
    expect(positionsEqual(position(1, 2), position(2, 1))).toBe(false);
  });

  it("isInsideBoard accepts cells within 6x6 and rejects out-of-range", () => {
    expect(isInsideBoard(position(0, 0))).toBe(true);
    expect(isInsideBoard(position(BOARD_ROWS - 1, BOARD_COLS - 1))).toBe(true);
    expect(isInsideBoard(position(-1, 0))).toBe(false);
    expect(isInsideBoard(position(0, BOARD_COLS))).toBe(false);
    expect(isInsideBoard(position(BOARD_ROWS, 0))).toBe(false);
  });

  it("opponentOf flips the owner", () => {
    expect(opponentOf("player")).toBe("enemy");
    expect(opponentOf("enemy")).toBe("player");
  });
});

describe("state queries", () => {
  it("unitAt returns the unit on a cell, or undefined when empty", () => {
    const state = createInitialBattleState();
    const enemy = state.units[0];
    expect(unitAt(state, enemy.position)).toBe(enemy);
    expect(unitAt(state, position(3, 3))).toBeUndefined();
  });

  it("unitsOf filters by owner", () => {
    const state = createInitialBattleState();
    expect(unitsOf(state, "enemy").length).toBe(state.units.length);
    expect(unitsOf(state, "player").length).toBe(0);
  });
});
