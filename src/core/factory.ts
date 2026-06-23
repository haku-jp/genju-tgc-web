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
  koran: defineCard(
    "koran",
    "コラン",
    1,
    1,
    2,
    { options: [{ dirs: "all8", range: 1 }] },
    { pattern: "adjacent", range: 1, lineOfSight: false },
  ),
  korantan: defineCard(
    "korantan",
    "コランタン",
    3,
    3,
    3,
    { options: [{ dirs: "orthogonal", range: 2 }] },
    { pattern: "adjacent", range: 1, lineOfSight: false },
  ),
  korangarth: defineCard(
    "korangarth",
    "コランガース",
    5,
    6,
    6,
    { options: [{ dirs: "all8", range: 3, pass: "all" }] },
    { pattern: "line", dirs: "orthogonal", range: 2, lineOfSight: true },
  ),
} as const;

function defineCard(
  cardId: string,
  displayName: string,
  manaCost: number,
  attack: number,
  life: number,
  move: CardDefinition["move"],
  attackProfile: CardDefinition["attackProfile"],
): CardDefinition {
  return { cardId, displayName, manaCost, attack, life, move, attackProfile };
}

function handCard(cardInstanceId: string, definition: CardDefinition): HandCard {
  return { cardInstanceId, definition };
}

function fisherYates<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function buildDeckCards(owner: Owner, deck: CardDefinition[], shuffle: <T>(arr: T[]) => T[]): HandCard[] {
  return shuffle(deck.map((definition, index) => handCard(`${owner}-deck-${index + 1}`, definition)));
}

function splitOpeningHand(cards: HandCard[]): { hand: HandCard[]; library: HandCard[] } {
  return {
    hand: cards.slice(0, 5),
    library: cards.slice(5),
  };
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
  playerDeck?: CardDefinition[];
  enemyDeck?: CardDefinition[];
  shuffle?: <T>(arr: T[]) => T[];
}

export function createInitialBattleState(options: InitialStateOptions = {}): BattleState {
  const startingTurn: Owner = options.startingTurn ?? "player";
  // The side taking the first turn starts at the turn-1 cap; the other side has
  // not begun a turn yet, so it starts at 0 and ramps to 1 on its first endTurn.
  const playerStarts = startingTurn === "player";

  const shuffle = options.shuffle ?? fisherYates;
  const playerCards = options.playerDeck
    ? splitOpeningHand(buildDeckCards("player", options.playerDeck, shuffle))
    : {
        hand: [
          handCard("p-hand-1", CARD_POOL.koran),
          handCard("p-hand-2", CARD_POOL.korantan),
          handCard("p-hand-3", CARD_POOL.korangarth),
          handCard("p-hand-4", CARD_POOL.koran),
          handCard("p-hand-5", CARD_POOL.korantan),
        ],
        library: [],
      };
  const enemyCards = options.enemyDeck
    ? splitOpeningHand(buildDeckCards("enemy", options.enemyDeck, shuffle))
    : { hand: [], library: [] };

  const units: Unit[] = options.enemyDeck ? [] : [
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
    playerHand: playerCards.hand,
    playerLibrary: playerCards.library,
    enemyHand: enemyCards.hand,
    enemyLibrary: enemyCards.library,
    units,
  };
}
