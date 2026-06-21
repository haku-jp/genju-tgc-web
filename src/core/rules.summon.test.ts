import { describe, it, expect } from "vitest";
import {
  getLegalSummonCells,
  trySummon,
  MAX_UNITS_PER_SIDE,
} from "./rules.summon";
import { card, state, unit } from "./test-utils";
import { position, HandCard } from "./state";

function hand(id: string, manaCost = 1, life = 2): HandCard {
  return { cardInstanceId: id, definition: card({ cardId: "koran", manaCost, life }) };
}

describe("getLegalSummonCells", () => {
  it("returns the 12 cells of the player's two back rows when empty", () => {
    const cells = getLegalSummonCells(state(), "player");
    expect(cells).toHaveLength(12);
    expect(cells.every((c) => c.row === 4 || c.row === 5)).toBe(true);
  });

  it("returns the enemy's two front rows for the enemy", () => {
    const cells = getLegalSummonCells(state(), "enemy");
    expect(cells.every((c) => c.row === 0 || c.row === 1)).toBe(true);
  });

  it("excludes occupied cells", () => {
    const s = state({ units: [unit({ unitId: "u", owner: "player", position: position(5, 0) })] });
    expect(getLegalSummonCells(s, "player")).toHaveLength(11);
  });
});

describe("trySummon", () => {
  it("summons into the zone, spends mana, and removes the card", () => {
    const s = state({ playerHand: [hand("h1", 1, 2)], playerMana: 5 });
    const result = trySummon(s, 0, position(5, 2));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.units).toHaveLength(1);
    const u = result.state.units[0];
    expect(u.owner).toBe("player");
    expect(u.position).toEqual(position(5, 2));
    expect(u.currentLife).toBe(2);
    expect(u.hasMovedThisTurn).toBe(false);
    expect(u.hasAttackedThisTurn).toBe(true); // summon sickness
    expect(result.state.playerHand).toHaveLength(0);
    expect(result.state.playerMana).toBe(4);
  });

  it("does not mutate the input state", () => {
    const s = state({ playerHand: [hand("h1")], playerMana: 5 });
    trySummon(s, 0, position(5, 2));
    expect(s.units).toHaveLength(0);
    expect(s.playerHand).toHaveLength(1);
    expect(s.playerMana).toBe(5);
  });

  it("rejects a target outside the summon zone", () => {
    const s = state({ playerHand: [hand("h1")] });
    expect(trySummon(s, 0, position(3, 2)).ok).toBe(false);
  });

  it("rejects an occupied target", () => {
    const s = state({
      playerHand: [hand("h1")],
      units: [unit({ unitId: "u", owner: "player", position: position(5, 2) })],
    });
    expect(trySummon(s, 0, position(5, 2)).ok).toBe(false);
  });

  it("rejects when mana is insufficient", () => {
    const s = state({ playerHand: [hand("h1", 5)], playerMana: 1 });
    expect(trySummon(s, 0, position(5, 2)).ok).toBe(false);
  });

  it("rejects an out-of-range hand index", () => {
    expect(trySummon(state({ playerHand: [hand("h1")] }), 3, position(5, 2)).ok).toBe(false);
  });

  it("rejects when the field already holds the max units", () => {
    const full = Array.from({ length: MAX_UNITS_PER_SIDE }, (_, i) =>
      unit({ unitId: `u${i}`, owner: "player", position: position(4, i) }),
    );
    const s = state({ playerHand: [hand("h1")], units: full });
    expect(trySummon(s, 0, position(5, 2)).ok).toBe(false);
  });
});
