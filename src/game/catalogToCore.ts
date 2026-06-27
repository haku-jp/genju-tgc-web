import { CARD_BY_ID } from "../data/cards";
import type { Deck } from "../app/save/types";
import type { AttackProfile, CardDefinition, MoveProfile } from "../core/state";

const DEFAULT_MOVE: MoveProfile = { options: [] };
const DEFAULT_ATTACK_PROFILE: AttackProfile = {
  pattern: "adjacent",
  range: 1,
  lineOfSight: false,
};

export function toCardDefinition(cardId: string): CardDefinition | null {
  const card = CARD_BY_ID[cardId];
  if (!card || card.type !== "genju") {
    return null;
  }

  return {
    cardId: card.id,
    displayName: card.name,
    manaCost: card.cost,
    attack: card.attack ?? 0,
    life: card.health ?? 1,
    move: card.move ?? DEFAULT_MOVE,
    attackProfile: card.attackProfile ?? DEFAULT_ATTACK_PROFILE,
    art: card.art ?? undefined,
    rarity: card.rarity,
    rulesText: card.rulesText,
  };
}

export function deckToCoreDefs(deck: Deck): CardDefinition[] {
  return deck.cards.flatMap((entry) => {
    const definition = toCardDefinition(entry.cardId);
    return definition ? Array.from({ length: entry.count }, () => definition) : [];
  });
}
