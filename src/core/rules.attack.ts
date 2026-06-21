// Attack rules.
//
// Divergence from Unity Core (intentional, follows the world design §14 and the
// approved plan): unit-vs-unit combat is MUTUAL — both attacker and defender
// deal their attack to each other simultaneously.
//
// Divergence from world design §10/§14 (decided 2026-06-20, Hearthstone-style):
// the enemy headquarters/hero has no board cell. A unit may attack it directly
// regardless of position — no range check, no defender-on-cell check. This
// replaces the HQ-cell-and-defender model those sections originally described.

import { BattleState, BoardPosition, Unit, cloneState } from "./state";
import {
  BattleAction,
  CommandResult,
  fail,
  isInAttackRange,
  succeed,
} from "./result";

function findUnit(state: BattleState, unitId: string): Unit | undefined {
  return state.units.find((u) => u.unitId === unitId);
}

/** Cells the unit may attack this turn: enemy units in range. The enemy HQ is
 * always attackable (off-board) and is not represented as a cell. */
export function getLegalAttackCells(state: BattleState, unitId: string): BoardPosition[] {
  const attacker = findUnit(state, unitId);
  if (!attacker || attacker.owner !== state.currentTurn || attacker.hasAttackedThisTurn) {
    return [];
  }

  const range = attacker.definition.attackRange;
  const cells: BoardPosition[] = [];

  for (const unit of state.units) {
    if (unit.owner !== attacker.owner && isInAttackRange(attacker.position, unit.position, range)) {
      cells.push(unit.position);
    }
  }

  return cells;
}

export function tryAttack(
  state: BattleState,
  attackerId: string,
  targetId: string,
): CommandResult {
  const attacker = findUnit(state, attackerId);
  if (!attacker) {
    return fail(state, "Attacker does not exist.");
  }
  const target = findUnit(state, targetId);
  if (!target) {
    return fail(state, "Target does not exist.");
  }
  if (attacker.owner !== state.currentTurn) {
    return fail(state, "Attacker does not belong to the current turn owner.");
  }
  if (target.owner === attacker.owner) {
    return fail(state, "Cannot attack a friendly unit.");
  }
  if (attacker.hasAttackedThisTurn) {
    return fail(state, "Unit has already attacked this turn.");
  }
  if (!isInAttackRange(attacker.position, target.position, attacker.definition.attackRange)) {
    return fail(state, "Target is outside attack range.");
  }

  const targetRemaining = target.currentLife - attacker.definition.attack;
  const attackerRemaining = attacker.currentLife - target.definition.attack; // counter

  const next = cloneState(state);
  next.units = state.units
    .map((u) => {
      if (u.unitId === attackerId) {
        return { ...u, currentLife: attackerRemaining, hasAttackedThisTurn: true };
      }
      if (u.unitId === targetId) {
        return { ...u, currentLife: targetRemaining };
      }
      return u;
    })
    .filter((u) => u.currentLife > 0);

  const actions: BattleAction[] = [
    { type: "attack", unitId: attackerId, targetId, from: attacker.position, to: target.position },
    { type: "damage", unitId: targetId, amount: attacker.definition.attack, to: target.position },
    { type: "damage", unitId: attackerId, amount: target.definition.attack, to: attacker.position },
  ];
  if (targetRemaining <= 0) {
    actions.push({ type: "death", unitId: targetId, to: target.position });
  }
  if (attackerRemaining <= 0) {
    actions.push({ type: "death", unitId: attackerId, to: attacker.position });
  }

  return succeed(next, actions);
}

export function tryAttackHeadquarters(state: BattleState, attackerId: string): CommandResult {
  const attacker = findUnit(state, attackerId);
  if (!attacker) {
    return fail(state, "Attacker does not exist.");
  }
  if (attacker.owner !== state.currentTurn) {
    return fail(state, "Attacker does not belong to the current turn owner.");
  }
  if (attacker.hasAttackedThisTurn) {
    return fail(state, "Unit has already attacked this turn.");
  }

  const next = cloneState(state);
  if (attacker.owner === "player") {
    next.enemyLife -= attacker.definition.attack;
  } else {
    next.playerLife -= attacker.definition.attack;
  }
  next.units = state.units.map((u) =>
    u.unitId === attackerId ? { ...u, hasAttackedThisTurn: true } : u,
  );

  const targetId = attacker.owner === "player" ? "enemy-hq" : "player-hq";
  return succeed(next, [
    { type: "attack", unitId: attackerId, targetId, from: attacker.position },
    { type: "hqDamage", targetId, amount: attacker.definition.attack },
  ]);
}
