import { describe, it, expect } from "vitest";
import {
  getLegalAttackCells,
  tryAttack,
  tryAttackHeadquarters,
} from "./rules.attack";
import { card, state, unit } from "./test-utils";
import { BoardPosition, position } from "./state";

function cells(actual: BoardPosition[]): string[] {
  return actual.map((p) => `${p.row},${p.col}`).sort();
}

function attackCard(attackProfile: unknown, attack = 1, life = 1) {
  return card({ attack, life, attackProfile } as any);
}

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
    expect(a?.currentLife).toBe(3);
    expect(t?.currentLife).toBe(1);
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
    expect(result.state.units[0].currentLife).toBe(4);
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
  it("adjacent attacks include only neighboring enemy units", () => {
    const s = state({
      units: [
        unit({
          unitId: "a",
          owner: "player",
          position: position(3, 3),
          definition: attackCard({ pattern: "adjacent", range: 1, lineOfSight: false }),
        }),
        unit({ unitId: "enemy", owner: "enemy", position: position(2, 2) }),
        unit({ unitId: "far", owner: "enemy", position: position(1, 1) }),
        unit({ unitId: "friendly", owner: "player", position: position(3, 4) }),
      ],
    });
    expect(cells(getLegalAttackCells(s, "a"))).toEqual(["2,2"]);
  });

  it("line attacks respect directions, range, and line of sight blockers", () => {
    const s = state({
      units: [
        unit({
          unitId: "a",
          owner: "player",
          position: position(3, 3),
          definition: attackCard({ pattern: "line", dirs: "orthogonal", range: 3, lineOfSight: true }),
        }),
        unit({ unitId: "blocker", owner: "player", position: position(3, 4) }),
        unit({ unitId: "hidden", owner: "enemy", position: position(3, 5) }),
        unit({ unitId: "visible", owner: "enemy", position: position(1, 3) }),
        unit({ unitId: "diagonal", owner: "enemy", position: position(2, 2) }),
      ],
    });
    expect(cells(getLegalAttackCells(s, "a"))).toEqual(["1,3"]);
  });

  it("tryAttack uses structured attack legality", () => {
    const s = state({
      units: [
        unit({
          unitId: "a",
          owner: "player",
          position: position(3, 3),
          definition: attackCard({ pattern: "line", dirs: "orthogonal", range: 2, lineOfSight: true }),
        }),
        unit({ unitId: "t", owner: "enemy", position: position(3, 5) }),
        unit({ unitId: "d", owner: "enemy", position: position(2, 2) }),
      ],
    });
    expect(tryAttack(s, "a", "t").ok).toBe(true);
    expect(tryAttack(s, "a", "d").ok).toBe(false);
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
    expect(result.state.units[0].currentLife).toBe(5);
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
