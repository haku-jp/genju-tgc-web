import { describe, it, expect } from "vitest";
import { getLegalMoveCells, tryMove } from "./rules.move";
import { state, unit } from "./test-utils";
import { position } from "./state";

describe("getLegalMoveCells", () => {
  it("returns the 4 orthogonal neighbors for a range-1 unit on open board", () => {
    const s = state({ units: [unit({ unitId: "u", owner: "player", position: position(3, 3) })] });
    expect(getLegalMoveCells(s, "u")).toHaveLength(4);
  });

  it("clips to the board edges", () => {
    const s = state({ units: [unit({ unitId: "u", owner: "player", position: position(5, 0) })] });
    expect(getLegalMoveCells(s, "u")).toHaveLength(2);
  });

  it("excludes occupied neighbors", () => {
    const s = state({
      units: [
        unit({ unitId: "u", owner: "player", position: position(3, 3) }),
        unit({ unitId: "blocker", owner: "player", position: position(2, 3) }),
      ],
    });
    expect(getLegalMoveCells(s, "u")).toHaveLength(3);
  });

  it("returns nothing for a unit that already moved", () => {
    const s = state({
      units: [unit({ unitId: "u", owner: "player", position: position(3, 3), hasMovedThisTurn: true })],
    });
    expect(getLegalMoveCells(s, "u")).toHaveLength(0);
  });

  it("returns nothing for a unit not owned by the current turn", () => {
    const s = state({ units: [unit({ unitId: "e", owner: "enemy", position: position(3, 3) })] });
    expect(getLegalMoveCells(s, "e")).toHaveLength(0);
  });
});

describe("tryMove", () => {
  it("moves a unit and marks it moved", () => {
    const s = state({ units: [unit({ unitId: "u", owner: "player", position: position(3, 3) })] });
    const result = tryMove(s, "u", position(4, 3));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const u = result.state.units[0];
    expect(u.position).toEqual(position(4, 3));
    expect(u.hasMovedThisTurn).toBe(true);
    expect(result.actions[0]).toMatchObject({ type: "move", from: position(3, 3), to: position(4, 3) });
  });

  it("rejects a move beyond range", () => {
    const s = state({ units: [unit({ unitId: "u", owner: "player", position: position(3, 3) })] });
    expect(tryMove(s, "u", position(1, 3)).ok).toBe(false);
  });

  it("rejects a move onto an occupied cell", () => {
    const s = state({
      units: [
        unit({ unitId: "u", owner: "player", position: position(3, 3) }),
        unit({ unitId: "b", owner: "player", position: position(3, 4) }),
      ],
    });
    expect(tryMove(s, "u", position(3, 4)).ok).toBe(false);
  });

  it("rejects moving a unit that already moved", () => {
    const s = state({
      units: [unit({ unitId: "u", owner: "player", position: position(3, 3), hasMovedThisTurn: true })],
    });
    expect(tryMove(s, "u", position(4, 3)).ok).toBe(false);
  });
});
