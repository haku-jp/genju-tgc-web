// Deterministic initial battle state for the vertical slice (logic only).
// The card pool here is a placeholder; a later data task will replace it with
// loaded card data. Names mirror the original Genju cards (legacy-web/data).

import {
  BattleState,
  BoardPosition,
  CardDefinition,
  HandCard,
  Owner,
  STARTING_LIFE,
  STARTING_MAX_MANA,
  Unit,
  position,
} from "./state";

const CARD_POOL = {
  koran: defineCard("koran", "コラン", 1, 1, 2),
  korantan: defineCard("korantan", "コランタン", 3, 3, 3),
  korangarth: defineCard("korangarth", "コランガース", 5, 6, 6),
} as const;

function defineCard(
  cardId: string,
  displayName: string,
  manaCost: number,
  attack: number,
  life: number,
): CardDefinition {
  return { cardId, displayName, manaCost, attack, life, moveRange: 1, attackRange: 1 };
}

function handCard(cardInstanceId: string, definition: CardDefinition): HandCard {
  return { cardInstanceId, definition };
}

function makeUnit(
  unitId: string,
  owner: Owner,
  definition: CardDefinition,
  pos: BoardPosition,
): Unit {
  return {
    unitId,
    owner,
    definition,
    position: pos,
    currentLife: definition.life,
    hasMovedThisTurn: false,
    hasAttackedThisTurn: false,
  };
}

export interface InitialStateOptions {
  /** Which side takes the first turn. Defaults to "player". */
  startingTurn?: Owner;
}

export function createInitialBattleState(options: InitialStateOptions = {}): BattleState {
  const startingTurn: Owner = options.startingTurn ?? "player";
  // The side taking the first turn starts at the turn-1 cap; the other side has
  // not begun a turn yet, so it starts at 0 and ramps to 1 on its first endTurn.
  const playerStarts = startingTurn === "player";

  const playerHand: HandCard[] = [
    handCard("p-hand-1", CARD_POOL.koran),
    handCard("p-hand-2", CARD_POOL.korantan),
    handCard("p-hand-3", CARD_POOL.korangarth),
    handCard("p-hand-4", CARD_POOL.koran),
    handCard("p-hand-5", CARD_POOL.korantan),
  ];

  const units: Unit[] = [
    makeUnit("enemy-1", "enemy", CARD_POOL.korangarth, position(1, 2)),
    makeUnit("enemy-2", "enemy", CARD_POOL.korantan, position(1, 3)),
  ];

  return {
    currentTurn: startingTurn,
    turnNumber: 1,
    playerLife: STARTING_LIFE,
    enemyLife: STARTING_LIFE,
    playerMana: playerStarts ? STARTING_MAX_MANA : 0,
    playerMaxMana: playerStarts ? STARTING_MAX_MANA : 0,
    enemyMana: playerStarts ? 0 : STARTING_MAX_MANA,
    enemyMaxMana: playerStarts ? 0 : STARTING_MAX_MANA,
    playerHand,
    enemyHand: [],
    units,
  };
}
