import { describe, it, expect } from "vitest";
import {
  getLegalAttackCells,
  tryAttack,
  tryAttackHeadquarters,
} from "./rules.attack";
import { card, state, unit } from "./test-utils";
import { position } from "./state";

function pair(attackerAtk: number, attackerLife: number, targetAtk: number, targetLife: number) {
  return state({
    units: [
      unit({
        unitId: "a",
        owner: "player",
        position: position(3, 3),
        definition: card({ attack: attackerAtk, life: attackerLife }),
        currentLife: attackerLife,
      }),
      unit({
        unitId: "t",
        owner: "enemy",
        position: position(3, 4),
        definition: card({ attack: targetAtk, life: targetLife }),
        currentLife: targetLife,
      }),
    ],
  });
}

describe("tryAttack (mutual damage)", () => {
  it("deals damage both ways when both survive", () => {
    const result = tryAttack(pair(3, 5, 2, 4), "a", "t");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const a = result.state.units.find((u) => u.unitId === "a");
    const t = result.state.units.find((u) => u.unitId === "t");
    expect(a?.currentLife).toBe(3); // 5 - 2 counter
    expect(t?.currentLife).toBe(1); // 4 - 3
    expect(a?.hasAttackedThisTurn).toBe(true);
  });

  it("removes both when both die", () => {
    const result = tryAttack(pair(5, 2, 5, 3), "a", "t");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.units).toHaveLength(0);
    expect(result.actions.filter((x) => x.type === "death")).toHaveLength(2);
  });

  it("keeps the attacker when only the target dies", () => {
    const result = tryAttack(pair(5, 5, 1, 3), "a", "t");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.units.map((u) => u.unitId)).toEqual(["a"]);
    expect(result.state.units[0].currentLife).toBe(4); // 5 - 1 counter
  });

  it("rejects an out-of-range target", () => {
    const s = state({
      units: [
        unit({ unitId: "a", owner: "player", position: position(3, 3) }),
        unit({ unitId: "t", owner: "enemy", position: position(3, 5) }),
      ],
    });
    expect(tryAttack(s, "a", "t").ok).toBe(false);
  });

  it("rejects attacking a friendly unit", () => {
    const s = state({
      units: [
        unit({ unitId: "a", owner: "player", position: position(3, 3) }),
        unit({ unitId: "f", owner: "player", position: position(3, 4) }),
      ],
    });
    expect(tryAttack(s, "a", "f").ok).toBe(false);
  });

  it("rejects when the attacker already attacked", () => {
    const s = pair(3, 5, 2, 4);
    s.units = s.units.map((u) => (u.unitId === "a" ? { ...u, hasAttackedThisTurn: true } : u));
    expect(tryAttack(s, "a", "t").ok).toBe(false);
  });
});

describe("getLegalAttackCells", () => {
  it("includes only enemy units in range (the enemy HQ has no board cell)", () => {
    const s = pair(3, 5, 2, 4);
    const cells = getLegalAttackCells(s, "a");
    expect(cells).toContainEqual(position(3, 4));
    expect(cells).toHaveLength(1);
  });
});

describe("tryAttackHeadquarters (no counter, off-board, Hearthstone-style)", () => {
  it("damages the enemy life without counter-damage, regardless of position", () => {
    const s = state({
      units: [
        unit({
          unitId: "a",
          owner: "player",
          position: position(3, 3),
          definition: card({ attack: 3, life: 5 }),
          currentLife: 5,
        }),
      ],
    });
    const result = tryAttackHeadquarters(s, "a");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.enemyLife).toBe(17);
    expect(result.state.units[0].currentLife).toBe(5); // no counter
    expect(result.state.units[0].hasAttackedThisTurn).toBe(true);
  });

  it("rejects when the unit has already attacked this turn", () => {
    const s = state({
      units: [
        unit({ unitId: "a", owner: "player", position: position(3, 3), hasAttackedThisTurn: true }),
      ],
    });
    expect(tryAttackHeadquarters(s, "a").ok).toBe(false);
  });

  it("is unaffected by an enemy unit standing anywhere on the board", () => {
    const s = state({
      units: [
        unit({ unitId: "a", owner: "player", position: position(3, 3) }),
        unit({ unitId: "d", owner: "enemy", position: position(0, 2) }),
      ],
    });
    expect(tryAttackHeadquarters(s, "a").ok).toBe(true);
  });
});
