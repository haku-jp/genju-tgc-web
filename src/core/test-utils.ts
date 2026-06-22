// Test-only builders for constructing controlled battle states.
// Imported only by *.test.ts files (not part of the runtime bundle).

import {
  BattleState,
  BoardPosition,
  CardDefinition,
  Owner,
  Unit,
} from "./state";

export function card(partial: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "c",
    displayName: "C",
    manaCost: 1,
    attack: 1,
    life: 1,
    move: { options: [{ dirs: "orthogonal", range: 1 }] },
    attackProfile: { pattern: "adjacent", range: 1, lineOfSight: false },
    ...partial,
  };
}

export function unit(
  partial: { unitId: string; owner: Owner; position: BoardPosition } & Partial<Unit>,
): Unit {
  const definition = partial.definition ?? card();
  return {
    unitId: partial.unitId,
    owner: partial.owner,
    definition,
    position: partial.position,
    currentLife: partial.currentLife ?? definition.life,
    hasMovedThisTurn: partial.hasMovedThisTurn ?? false,
    hasAttackedThisTurn: partial.hasAttackedThisTurn ?? false,
  };
}

/** A blank state with plenty of mana, so mana is never an accidental blocker. */
export function state(partial: Partial<BattleState> = {}): BattleState {
  return {
    currentTurn: "player",
    turnNumber: 1,
    playerLife: 20,
    enemyLife: 20,
    playerMana: 10,
    playerMaxMana: 10,
    enemyMana: 10,
    enemyMaxMana: 10,
    playerHand: [],
    enemyHand: [],
    units: [],
    ...partial,
  };
}
