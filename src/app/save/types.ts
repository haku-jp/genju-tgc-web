export interface DeckEntry {
  cardId: string;
  count: number;
}

export interface Deck {
  id: string;
  name: string;
  cards: DeckEntry[];
}

export interface SaveData {
  version: number;
  collection: Record<string, number>;
  decks: Deck[];
  activeDeckId: string | null;
  favoriteGenjuIds: string[];
  quest: {
    currentChapter: number;
    clearedStageIds: string[];
  };
}
