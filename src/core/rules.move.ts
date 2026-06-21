// Move rules. Ported from Unity BattleRules.GetLegalMoveCells / TryMove.
// Slice movement is Manhattan-distance within the unit's moveRange and the
// destination cell must be empty. NOTE: only the destination is checked, not the
// path — correct for the current range-1 cards, but a moveRange >= 2 card could
// "jump" over an occupant. World design §13 forbids ground units passing through
// others, so introducing longer-range ground movement requires path-blocking
// (BFS over empty cells) here first.

import {
  BattleState,
  BoardPosition,
  cloneState,
  isInsideBoard,
  position,
  unitAt,
} from "./state";
import { CommandResult, fail, manhattan, succeed } from "./result";

export function getLegalMoveCells(state: BattleState, unitId: string): BoardPosition[] {
  const unit = state.units.find((u) => u.unitId === unitId);
  if (!unit || unit.owner !== state.currentTurn || unit.hasMovedThisTurn) {
    return [];
  }

  const cells: BoardPosition[] = [];
  const range = unit.definition.moveRange;
  for (let row = unit.position.row - range; row <= unit.position.row + range; row++) {
    for (let col = unit.position.col - range; col <= unit.position.col + range; col++) {
      const target = position(row, col);
      const distance = manhattan(unit.position, target);
      if (distance === 0 || distance > range) {
        continue;
      }
      if (isInsideBoard(target) && !unitAt(state, target)) {
        cells.push(target);
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
  if (unitAt(state, target)) {
    return fail(state, "Target cell is occupied.");
  }
  const distance = manhattan(unit.position, target);
  if (distance === 0 || distance > unit.definition.moveRange) {
    return fail(state, "Target cell is outside move range.");
  }

  const from = unit.position;
  const next = cloneState(state);
  next.units = state.units.map((u) =>
    u.unitId === unitId ? { ...u, position: target, hasMovedThisTurn: true } : u,
  );

  return succeed(next, [{ type: "move", unitId, from, to: target }]);
}
