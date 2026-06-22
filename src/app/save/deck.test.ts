import { describe, expect, it } from "vitest";
import { buildDefaultSave, deckCount, validateDeck } from "./deck";
import type { Deck } from "./types";

describe("deck save helpers", () => {
  it("builds a valid starter deck covered by the default collection", () => {
    const save = buildDefaultSave();
    const [starter] = save.decks;

    expect(save.version).toBe(1);
    expect(starter.id).toBe("starter");
    expect(starter.name).toBe("ギルド標準デッキ");
    expect(save.activeDeckId).toBe("starter");
    expect(deckCount(starter)).toBe(30);
    expect(validateDeck(starter, save.collection)).toEqual({ ok: true, errors: [] });
  });

  it("rejects a deck with 31 cards", () => {
    const save = buildDefaultSave();
    const deck: Deck = {
      ...save.decks[0],
      cards: [...save.decks[0].cards, { cardId: "SPELL-001", count: 1 }],
    };

    expect(validateDeck(deck).ok).toBe(false);
  });

  it("rejects four copies of a standard card", () => {
    const deck: Deck = {
      id: "invalid-standard",
      name: "Invalid Standard",
      cards: [{ cardId: "GENJU-001", count: 4 }],
    };

    expect(validateDeck(deck).ok).toBe(false);
  });

  it("rejects four legendary cards in total", () => {
    const deck: Deck = {
      id: "invalid-legendary",
      name: "Invalid Legendary",
      cards: [
        { cardId: "GENJU-003", count: 1 },
        { cardId: "GENJU-003", count: 1 },
        { cardId: "GENJU-003", count: 1 },
        { cardId: "GENJU-003", count: 1 },
      ],
    };

    expect(validateDeck(deck).ok).toBe(false);
  });
});
