import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildDefaultSave } from "./deck";
import type { Deck, DeckEntry, SaveData } from "./types";

interface SaveStore extends SaveData {
  addToCollection(cardId: string, count?: number): void;
  createDeck(name: string, cards?: DeckEntry[]): string;
  renameDeck(deckId: string, name: string): void;
  deleteDeck(deckId: string): void;
  setDeckCards(deckId: string, cards: DeckEntry[]): void;
  setActiveDeck(deckId: string | null): void;
  toggleFavorite(genjuId: string): void;
  markStageCleared(stageId: string): void;
}

const createDeckId = () => `deck-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useSaveStore = create<SaveStore>()(
  persist(
    (set) => ({
      ...buildDefaultSave(),
      addToCollection: (cardId, count = 1) =>
        set((state) => ({
          collection: {
            ...state.collection,
            [cardId]: Math.max(0, (state.collection[cardId] ?? 0) + count),
          },
        })),
      createDeck: (name, cards = []) => {
        const id = createDeckId();
        const deck: Deck = { id, name, cards };

        set((state) => ({
          decks: [...state.decks, deck],
          activeDeckId: state.activeDeckId ?? id,
        }));

        return id;
      },
      renameDeck: (deckId, name) =>
        set((state) => ({
          decks: state.decks.map((deck) => (deck.id === deckId ? { ...deck, name } : deck)),
        })),
      deleteDeck: (deckId) =>
        set((state) => {
          const decks = state.decks.filter((deck) => deck.id !== deckId);
          return {
            decks,
            activeDeckId: state.activeDeckId === deckId ? (decks[0]?.id ?? null) : state.activeDeckId,
          };
        }),
      setDeckCards: (deckId, cards) =>
        set((state) => ({
          decks: state.decks.map((deck) => (deck.id === deckId ? { ...deck, cards } : deck)),
        })),
      setActiveDeck: (deckId) =>
        set((state) => ({
          activeDeckId: deckId && state.decks.some((deck) => deck.id === deckId) ? deckId : null,
        })),
      toggleFavorite: (genjuId) =>
        set((state) => {
          if (state.favoriteGenjuIds.includes(genjuId)) {
            return {
              favoriteGenjuIds: state.favoriteGenjuIds.filter((id) => id !== genjuId),
            };
          }

          return {
            favoriteGenjuIds: [...state.favoriteGenjuIds.slice(-2), genjuId],
          };
        }),
      markStageCleared: (stageId) =>
        set((state) => ({
          quest: state.quest.clearedStageIds.includes(stageId)
            ? state.quest
            : {
                ...state.quest,
                clearedStageIds: [...state.quest.clearedStageIds, stageId],
              },
        })),
    }),
    {
      name: "genju-tgc-save-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persistedState) => persistedState,
    },
  ),
);
