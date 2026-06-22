// Attack rules.
//
// Divergence from Unity Core (intentional, follows the world design §14 and the
// approved plan): unit-vs-unit combat is MUTUAL — both attacker and defender
// deal their attack to each other simultaneously.
//
// Divergence from world design §10/§14 (decided 2026-06-20, Hearthstone-style):
// the enemy headquarters/hero has no board cell. A unit may attack it directly
// regardless of position — no range check, no defender-on-cell check.

import {
  AttackProfile,
  BattleState,
  BoardPosition,
  DirSet,
  Unit,
  cloneState,
  isInsideBoard,
  position,
  positionsEqual,
  unitAt,
} from "./state";
import { BattleAction, CommandResult, fail, succeed } from "./result";

interface Delta {
  readonly row: number;
  readonly col: number;
}

const ORTHOGONAL: Delta[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

const DIAGONAL: Delta[] = [
  { row: -1, col: -1 },
  { row: -1, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 1 },
];

function findUnit(state: BattleState, unitId: string): Unit | undefined {
  return state.units.find((u) => u.unitId === unitId);
}

function directions(dirs: DirSet | undefined): Delta[] {
  switch (dirs ?? "all8") {
    case "orthogonal":
      return ORTHOGONAL;
    case "diagonal":
      return DIAGONAL;
    case "all8":
      return [...ORTHOGONAL, ...DIAGONAL];
    case "forward":
      return ORTHOGONAL;
    case "knight":
      return [];
  }
}

function addUnique(cells: BoardPosition[], target: BoardPosition): void {
  if (!cells.some((cell) => positionsEqual(cell, target))) {
    cells.push(target);
  }
}

function adjacentAttackCells(
  state: BattleState,
  attacker: Unit,
  profile: AttackProfile,
): BoardPosition[] {
  const cells: BoardPosition[] = [];
  for (const delta of directions("all8")) {
    for (let step = 1; step <= profile.range; step++) {
      const target = position(
        attacker.position.row + delta.row * step,
        attacker.position.col + delta.col * step,
      );
      if (!isInsideBoard(target)) {
        break;
      }
      const occupant = unitAt(state, target);
      if (occupant && occupant.owner !== attacker.owner) {
        addUnique(cells, target);
      }
    }
  }
  return cells;
}

function lineAttackCells(
  state: BattleState,
  attacker: Unit,
  profile: AttackProfile,
): BoardPosition[] {
  const cells: BoardPosition[] = [];
  for (const delta of directions(profile.dirs)) {
    for (let step = 1; step <= profile.range; step++) {
      const target = position(
        attacker.position.row + delta.row * step,
        attacker.position.col + delta.col * step,
      );
      if (!isInsideBoard(target)) {
        break;
      }
      const occupant = unitAt(state, target);
      if (!occupant) {
        continue;
      }
      if (occupant.owner !== attacker.owner) {
        addUnique(cells, target);
      }
      if (profile.lineOfSight) {
        break;
      }
    }
  }
  return cells;
}

/** Cells the unit may attack this turn: enemy units in profile. The enemy HQ is
 * always attackable (off-board) and is not represented as a cell. */
export function getLegalAttackCells(state: BattleState, unitId: string): BoardPosition[] {
  const attacker = findUnit(state, unitId);
  if (!attacker || attacker.owner !== state.currentTurn || attacker.hasAttackedThisTurn) {
    return [];
  }

  const profile = attacker.definition.attackProfile;
  if (profile.range <= 0) {
    return [];
  }

  if (profile.pattern === "adjacent") {
    return adjacentAttackCells(state, attacker, profile);
  }
  return lineAttackCells(state, attacker, profile);
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
  if (!getLegalAttackCells(state, attackerId).some((cell) => positionsEqual(cell, target.position))) {
    return fail(state, "Target is outside attack profile.");
  }

  const targetRemaining = target.currentLife - attacker.definition.attack;
  const attackerRemaining = attacker.currentLife - target.definition.attack;

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
