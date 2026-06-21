// Summon rules. Ported from Unity BattleRules.GetLegalSummonCells / TrySummon,
// generalized to either side's summon zone and with the world-design field cap.

import {
  BattleState,
  BOARD_COLS,
  BoardPosition,
  Owner,
  Unit,
  cloneState,
  handOf,
  isInsideBoard,
  manaOf,
  position,
  unitAt,
  unitsOf,
} from "./state";
import { CommandResult, fail, succeed } from "./result";

/** World design: at most 6 genju on the field per side. */
export const MAX_UNITS_PER_SIDE = 6;

/** Summon zone rows for a side: player = back two rows (4,5), enemy = (0,1). */
export function summonRows(owner: Owner): readonly [number, number] {
  return owner === "player" ? [4, 5] : [0, 1];
}

export function getLegalSummonCells(
  state: BattleState,
  owner: Owner = state.currentTurn,
): BoardPosition[] {
  const [rowStart, rowEnd] = summonRows(owner);
  const cells: BoardPosition[] = [];
  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const pos = position(row, col);
      if (!unitAt(state, pos)) {
        cells.push(pos);
      }
    }
  }
  return cells;
}

export function trySummon(
  state: BattleState,
  handIndex: number,
  target: BoardPosition,
): CommandResult {
  const owner = state.currentTurn;
  const hand = handOf(state, owner);

  if (handIndex < 0 || handIndex >= hand.length) {
    return fail(state, "Hand index is out of range.");
  }
  if (!isInsideBoard(target)) {
    return fail(state, "Target cell is outside the board.");
  }
  const [rowStart, rowEnd] = summonRows(owner);
  if (target.row < rowStart || target.row > rowEnd) {
    return fail(state, "Target cell is outside the summon zone.");
  }
  if (unitAt(state, target)) {
    return fail(state, "Target cell is occupied.");
  }
  if (unitsOf(state, owner).length >= MAX_UNITS_PER_SIDE) {
    return fail(state, "The field is full (max 6 units).");
  }
  const card = hand[handIndex];
  if (manaOf(state, owner) < card.definition.manaCost) {
    return fail(state, "Not enough mana.");
  }

  const next = cloneState(state);
  handOf(next, owner).splice(handIndex, 1);
  if (owner === "player") {
    next.playerMana -= card.definition.manaCost;
  } else {
    next.enemyMana -= card.definition.manaCost;
  }

  const unitId = `${owner}-unit-${card.cardInstanceId}`;
  const unit: Unit = {
    unitId,
    owner,
    definition: card.definition,
    position: target,
    currentLife: card.definition.life,
    hasMovedThisTurn: false,
    // Summon sickness: can move the turn it arrives, but not attack.
    hasAttackedThisTurn: true,
  };
  next.units.push(unit);

  return succeed(next, [{ type: "summon", unitId, to: target }]);
}
