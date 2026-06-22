// Move rules. Movement is data-driven by each unit's MoveProfile.

import {
  BattleState,
  BoardPosition,
  DirSet,
  Owner,
  Unit,
  cloneState,
  isInsideBoard,
  position,
  positionsEqual,
  unitAt,
} from "./state";
import { CommandResult, fail, succeed } from "./result";

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

const KNIGHT: Delta[] = [
  { row: -2, col: -1 },
  { row: -2, col: 1 },
  { row: -1, col: -2 },
  { row: -1, col: 2 },
  { row: 1, col: -2 },
  { row: 1, col: 2 },
  { row: 2, col: -1 },
  { row: 2, col: 1 },
];

function rayDirections(dirs: DirSet, owner: Owner): Delta[] {
  switch (dirs) {
    case "orthogonal":
      return ORTHOGONAL;
    case "diagonal":
      return DIAGONAL;
    case "all8":
      return [...ORTHOGONAL, ...DIAGONAL];
    case "forward":
      return [{ row: owner === "player" ? -1 : 1, col: 0 }];
    case "knight":
      return KNIGHT;
  }
}

function canPassThrough(unit: Unit, occupant: Unit, pass: "none" | "enemies" | "all"): boolean {
  if (pass === "all") {
    return true;
  }
  if (pass === "enemies") {
    return occupant.owner !== unit.owner;
  }
  return false;
}

function addUnique(cells: BoardPosition[], target: BoardPosition): void {
  if (!cells.some((cell) => positionsEqual(cell, target))) {
    cells.push(target);
  }
}

export function getLegalMoveCells(state: BattleState, unitId: string): BoardPosition[] {
  const unit = state.units.find((u) => u.unitId === unitId);
  if (!unit || unit.owner !== state.currentTurn || unit.hasMovedThisTurn) {
    return [];
  }

  const cells: BoardPosition[] = [];
  for (const option of unit.definition.move.options) {
    if (option.range <= 0) {
      continue;
    }

    if (option.dirs === "knight") {
      for (const delta of KNIGHT) {
        const target = position(unit.position.row + delta.row, unit.position.col + delta.col);
        if (isInsideBoard(target) && !unitAt(state, target)) {
          addUnique(cells, target);
        }
      }
      continue;
    }

    for (const delta of rayDirections(option.dirs, unit.owner)) {
      for (let step = 1; step <= option.range; step++) {
        const target = position(
          unit.position.row + delta.row * step,
          unit.position.col + delta.col * step,
        );
        if (!isInsideBoard(target)) {
          break;
        }

        const occupant = unitAt(state, target);
        if (!occupant) {
          addUnique(cells, target);
          continue;
        }

        if (!canPassThrough(unit, occupant, option.pass ?? "none")) {
          break;
        }
      }
    }
  }

  return cells;
}

export function tryMove(
  state: BattleState,
  unitId: string,
  target: BoardPosition,
): CommandResult {
  const unit = state.units.find((u) => u.unitId === unitId);
  if (!unit) {
    return fail(state, "Unit does not exist.");
  }
  if (unit.owner !== state.currentTurn) {
    return fail(state, "Unit does not belong to the current turn owner.");
  }
  if (unit.hasMovedThisTurn) {
    return fail(state, "Unit has already moved this turn.");
  }
  if (!isInsideBoard(target)) {
    return fail(state, "Target cell is outside the board.");
  }
  if (!getLegalMoveCells(state, unitId).some((cell) => positionsEqual(cell, target))) {
    return fail(state, "Target cell is not a legal move destination.");
  }

  const from = unit.position;
  const next = cloneState(state);
  next.units = state.units.map((u) =>
    u.unitId === unitId ? { ...u, position: target, hasMovedThisTurn: true } : u,
  );

  return succeed(next, [{ type: "move", unitId, from, to: target }]);
}
