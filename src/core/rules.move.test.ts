import { describe, it, expect } from "vitest";
import { getLegalMoveCells, tryMove } from "./rules.move";
import { card, state, unit } from "./test-utils";
import { BoardPosition, position } from "./state";

function cells(actual: BoardPosition[]): string[] {
  return actual.map((p) => `${p.row},${p.col}`).sort();
}

function movingCard(move: unknown) {
  return card({ move } as any);
}

describe("getLegalMoveCells", () => {
  it("uses all8 directions instead of Manhattan movement", () => {
    const s = state({
      units: [
        unit({
          unitId: "u",
          owner: "player",
          position: position(3, 3),
          definition: movingCard({ options: [{ dirs: "all8", range: 1 }] }),
        }),
      ],
    });
    expect(cells(getLegalMoveCells(s, "u"))).toEqual([
      "2,2",
      "2,3",
      "2,4",
      "3,2",
      "3,4",
      "4,2",
      "4,3",
      "4,4",
    ]);
  });

  it("moves orthogonally in rays and stops at blocked ground paths", () => {
    const s = state({
      units: [
        unit({
          unitId: "u",
          owner: "player",
          position: position(3, 3),
          definition: movingCard({ options: [{ dirs: "orthogonal", range: 2 }] }),
        }),
        unit({ unitId: "blocker", owner: "player", position: position(2, 3) }),
      ],
    });
    expect(cells(getLegalMoveCells(s, "u"))).toEqual(["3,1", "3,2", "3,4", "3,5", "4,3", "5,3"]);
    expect(getLegalMoveCells(s, "u")).not.toContainEqual(position(2, 3));
  });

  it("moves diagonally only", () => {
    const s = state({
      units: [
        unit({
          unitId: "u",
          owner: "player",
          position: position(3, 3),
          definition: movingCard({ options: [{ dirs: "diagonal", range: 2 }] }),
        }),
      ],
    });
    expect(cells(getLegalMoveCells(s, "u"))).toEqual([
      "1,1",
      "1,5",
      "2,2",
      "2,4",
      "4,2",
      "4,4",
      "5,1",
      "5,5",
    ]);
  });

  it("jumps like a knight and ignores intervening blockers", () => {
    const s = state({
      units: [
        unit({
          unitId: "u",
          owner: "player",
          position: position(3, 3),
          definition: movingCard({ options: [{ dirs: "knight", range: 1 }] }),
        }),
        unit({ unitId: "blocker", owner: "player", position: position(3, 4) }),
      ],
    });
    expect(cells(getLegalMoveCells(s, "u"))).toEqual([
      "1,2",
      "1,4",
      "2,1",
      "2,5",
      "4,1",
      "4,5",
      "5,2",
      "5,4",
    ]);
  });

  it("moves forward from each owner's perspective", () => {
    const s = state({
      currentTurn: "player",
      units: [
        unit({
          unitId: "p",
          owner: "player",
          position: position(4, 2),
          definition: movingCard({ options: [{ dirs: "forward", range: 2 }] }),
        }),
        unit({
          unitId: "e",
          owner: "enemy",
          position: position(1, 2),
          definition: movingCard({ options: [{ dirs: "forward", range: 2 }] }),
        }),
      ],
    });
    expect(cells(getLegalMoveCells(s, "p"))).toEqual(["2,2", "3,2"]);
    expect(cells(getLegalMoveCells({ ...s, currentTurn: "enemy" }, "e"))).toEqual([
      "2,2",
      "3,2",
    ]);
  });

  it("returns no cells for an immobile unit", () => {
    const s = state({
      units: [
        unit({
          unitId: "u",
          owner: "player",
          position: position(3, 3),
          definition: movingCard({ options: [] }),
        }),
      ],
    });
    expect(getLegalMoveCells(s, "u")).toEqual([]);
  });

  it("handles pass none, enemies, and all while landing only on empty cells", () => {
    const base = [
      unit({ unitId: "enemy", owner: "enemy", position: position(3, 4) }),
      unit({ unitId: "friend", owner: "player", position: position(3, 2) }),
    ];
    const none = state({
      units: [
        unit({
          unitId: "u",
          owner: "player",
          position: position(3, 3),
          definition: movingCard({ options: [{ dirs: "orthogonal", range: 2, pass: "none" }] }),
        }),
        ...base,
      ],
    });
    const enemies = state({
      units: [
        unit({
          unitId: "u",
          owner: "player",
          position: position(3, 3),
          definition: movingCard({ options: [{ dirs: "orthogonal", range: 2, pass: "enemies" }] }),
        }),
        ...base,
      ],
    });
    const all = state({
      units: [
        unit({
          unitId: "u",
          owner: "player",
          position: position(3, 3),
          definition: movingCard({ options: [{ dirs: "orthogonal", range: 2, pass: "all" }] }),
        }),
        ...base,
      ],
    });

    expect(cells(getLegalMoveCells(none, "u"))).toEqual(["1,3", "2,3", "4,3", "5,3"]);
    expect(cells(getLegalMoveCells(enemies, "u"))).toEqual([
      "1,3",
      "2,3",
      "3,5",
      "4,3",
      "5,3",
    ]);
    expect(cells(getLegalMoveCells(all, "u"))).toEqual([
      "1,3",
      "2,3",
      "3,1",
      "3,5",
      "4,3",
      "5,3",
    ]);
  });

  it("returns nothing for a unit that already moved or is not current turn owner", () => {
    const moved = state({
      units: [
        unit({
          unitId: "u",
          owner: "player",
          position: position(3, 3),
          hasMovedThisTurn: true,
        }),
      ],
    });
    const enemy = state({ units: [unit({ unitId: "e", owner: "enemy", position: position(3, 3) })] });
    expect(getLegalMoveCells(moved, "u")).toEqual([]);
    expect(getLegalMoveCells(enemy, "e")).toEqual([]);
  });
});

describe("tryMove", () => {
  it("delegates legality to getLegalMoveCells", () => {
    const s = state({
      units: [
        unit({
          unitId: "u",
          owner: "player",
          position: position(3, 3),
          definition: movingCard({ options: [{ dirs: "diagonal", range: 1 }] }),
        }),
      ],
    });
    expect(tryMove(s, "u", position(4, 4)).ok).toBe(true);
    expect(tryMove(s, "u", position(4, 3)).ok).toBe(false);
  });
});
