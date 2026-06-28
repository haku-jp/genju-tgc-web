import { CARD_BY_ID, CARDS, type Rarity } from "../../data/cards";
import type { Deck, SaveData } from "./types";

export const DECK_SIZE = 30;

const SAME_NAME_LIMIT: Record<Rarity, number> = {
  S: 3,
  R: 2,
  L: 1,
  I: 1,
};

const TOTAL_LIMIT: Partial<Record<Rarity, number>> = {
  I: 1,
  L: 3,
};

const RARITY_LABEL: Record<Rarity, string> = {
  S: "標準",
  R: "希少",
  L: "伝説",
  I: "幻",
};

export interface DeckValidationResult {
  ok: boolean;
  errors: string[];
}

export function deckCount(deck: Deck): number {
  return deck.cards.reduce((total, entry) => total + entry.count, 0);
}

export function validateDeck(deck: Deck, collection?: Record<string, number>): DeckValidationResult {
  const errors: string[] = [];
  const countByCardId: Record<string, number> = {};
  const countByRarity: Partial<Record<Rarity, number>> = {};
  const total = deckCount(deck);

  if (total !== DECK_SIZE) {
    errors.push(`デッキはちょうど${DECK_SIZE}枚にしてください（現在${total}枚）。`);
  }

  for (const entry of deck.cards) {
    if (entry.count <= 0 || !Number.isInteger(entry.count)) {
      errors.push(`${entry.cardId} の枚数指定が不正です。`);
      continue;
    }

    const card = CARD_BY_ID[entry.cardId];
    if (!card) {
      errors.push(`${entry.cardId} は存在しないカードIDです。`);
      continue;
    }

    countByCardId[entry.cardId] = (countByCardId[entry.cardId] ?? 0) + entry.count;
    countByRarity[card.rarity] = (countByRarity[card.rarity] ?? 0) + entry.count;
  }

  for (const [cardId, count] of Object.entries(countByCardId)) {
    const card = CARD_BY_ID[cardId];
    const sameNameLimit = SAME_NAME_LIMIT[card.rarity];

    if (count > sameNameLimit) {
      errors.push(`${card.name}は同名${sameNameLimit}枚までです。`);
    }

    if (collection && count > (collection[cardId] ?? 0)) {
      errors.push(`${card.name}は所持枚数を超えています。`);
    }
  }

  for (const [rarity, limit] of Object.entries(TOTAL_LIMIT) as [Rarity, number][]) {
    const rarityCount = countByRarity[rarity] ?? 0;
    if (rarityCount > limit) {
      errors.push(`${RARITY_LABEL[rarity]}レアリティのカードはデッキ全体で${limit}枚までです。`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function buildDefaultSave(): SaveData {
  const collection = Object.fromEntries(
    CARDS.map((card) => [card.id, SAME_NAME_LIMIT[card.rarity]]),
  ) as Record<string, number>;

  const starterDeck: Deck = {
    id: "starter",
    name: "ギルド標準デッキ",
    cards: [
      { cardId: "GENJU-003", count: 1 },
      { cardId: "GENJU-002", count: 2 },
      { cardId: "GENJU-005", count: 2 },
      { cardId: "GENJU-006", count: 2 },
      { cardId: "GENJU-008", count: 2 },
      { cardId: "GENJU-009", count: 2 },
      { cardId: "GENJU-001", count: 3 },
      { cardId: "GENJU-007", count: 3 },
      { cardId: "GENJU-010", count: 3 },
      { cardId: "SPELL-009", count: 2 },
      { cardId: "SPELL-001", count: 1 },
      { cardId: "SPELL-002", count: 1 },
      { cardId: "SPELL-003", count: 1 },
      { cardId: "SPELL-004", count: 1 },
      { cardId: "SPELL-006", count: 1 },
      { cardId: "SPELL-007", count: 1 },
      { cardId: "SPELL-008", count: 1 },
      { cardId: "SPELL-010", count: 1 },
    ],
  };

  return {
    version: 1,
    collection,
    decks: [starterDeck],
    activeDeckId: "starter",
    favoriteGenjuIds: ["GENJU-001", "GENJU-002", "GENJU-003"],
    quest: {
      currentChapter: 1,
      clearedStageIds: [],
    },
  };
}
