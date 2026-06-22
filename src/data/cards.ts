import data from "./cards.json";

declare global {
  interface ImportMetaEnv {
    readonly BASE_URL: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export type CardType = "genju" | "spell" | "equip";
export type Rarity = "S" | "R" | "L" | "I";

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  subtype?: string;
  rarity: Rarity;
  cost: number;
  attack?: number;
  health?: number;
  movement?: string;
  attackRange?: string;
  target?: string;
  rulesText: string;
  role?: string;
  flavorText?: string;
  art: string | null;
}

type RawCardDef = Omit<CardDef, "art">;

const ART_BY_ID: Partial<Record<string, string>> = {
  "GENJU-001": "GENJU-001.jpg",
  "GENJU-002": "GENJU-002.jpg",
  "GENJU-003": "GENJU-003.jpg",
  "GENJU-005": "GENJU-005.png",
  "GENJU-007": "GENJU-007.png",
  "GENJU-009": "GENJU-009.png",
  "GENJU-010": "GENJU-010.png",
  "SPELL-001": "SPELL-001.png",
  "SPELL-002": "SPELL-002.png",
  "SPELL-003": "SPELL-003.png",
  "SPELL-004": "SPELL-004.png",
  "SPELL-005": "SPELL-005.jpg",
  "SPELL-006": "SPELL-006.jpg",
  "SPELL-007": "SPELL-007.png",
  "SPELL-008": "SPELL-008.jpg",
  "SPELL-009": "SPELL-009.jpg",
  "SPELL-010": "SPELL-010.jpg",
};

const withArt = (card: RawCardDef): CardDef => {
  const artFile = ART_BY_ID[card.id];

  return {
    ...card,
    art: artFile ? `${import.meta.env.BASE_URL}cards/${artFile}` : null,
  };
};

export const CARDS: CardDef[] = [
  ...(data.genjuCards as RawCardDef[]),
  ...(data.spellCards as RawCardDef[]),
].map(withArt);
