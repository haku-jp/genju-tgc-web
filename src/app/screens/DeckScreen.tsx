import { useEffect, useMemo, type CSSProperties } from "react";
import { CARD_BY_ID, CARDS, type CardDef, type Rarity } from "../../data/cards";
import { DECK_SIZE, deckCount, validateDeck } from "../save/deck";
import { useSaveStore } from "../save/store";
import type { Deck, DeckEntry } from "../save/types";
import { useAppStore } from "../store";
import { buttonStyle, screenStyle } from "./styles";

const COPY_LIMIT: Record<Rarity, number> = {
  S: 3,
  R: 2,
  L: 1,
  I: 1,
};

const DECK_TOTAL_LIMIT: Partial<Record<Rarity, number>> = {
  I: 1,
  L: 3,
};

const rarityBorder: Record<Rarity, string> = {
  I: "#f2e3b3",
  L: "#e8c870",
  R: "#3da9fc",
  S: "#8b97a6",
};

const panelStyle: CSSProperties = {
  minHeight: 0,
  border: "1px solid #2a3344",
  borderRadius: 8,
  background: "#141a24",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 14px 30px rgba(0,0,0,0.24)",
  display: "grid",
  gridTemplateRows: "auto 1fr",
  overflow: "hidden",
};

const iconButtonStyle: CSSProperties = {
  width: 34,
  height: 34,
  border: "1px solid #3da9fc",
  borderRadius: 6,
  background: "#0b0e14",
  color: "#e8e0d0",
  font: "900 18px system-ui, sans-serif",
  cursor: "pointer",
};

export function DeckScreen() {
  const setScreen = useAppStore((state) => state.setScreen);
  const decks = useSaveStore((state) => state.decks);
  const activeDeckId = useSaveStore((state) => state.activeDeckId);
  const collection = useSaveStore((state) => state.collection);
  const createDeck = useSaveStore((state) => state.createDeck);
  const setActiveDeck = useSaveStore((state) => state.setActiveDeck);
  const setDeckCards = useSaveStore((state) => state.setDeckCards);

  const deck = decks.find((entry) => entry.id === activeDeckId) ?? decks[0] ?? null;

  useEffect(() => {
    if (deck) {
      if (deck.id !== activeDeckId) {
        setActiveDeck(deck.id);
      }
      return;
    }

    const deckId = createDeck("ギルド標準デッキ");
    setActiveDeck(deckId);
  }, [activeDeckId, createDeck, deck, setActiveDeck]);

  const validation = useMemo(() => (deck ? validateDeck(deck, collection) : null), [collection, deck]);
  const totalCount = deck ? deckCount(deck) : 0;
  const ownedCards = useMemo(() => CARDS.filter((card) => (collection[card.id] ?? 0) > 0), [collection]);

  const updateCards = (nextCards: DeckEntry[]) => {
    if (!deck) {
      return;
    }

    setDeckCards(deck.id, normalizeEntries(nextCards));
  };

  const canAddCard = (cardId: string) => {
    if (!deck) {
      return false;
    }

    return canAddToDeck(deck, collection, cardId);
  };

  const addCard = (cardId: string) => {
    if (!deck || !canAddCard(cardId)) {
      return;
    }

    const existing = deck.cards.find((entry) => entry.cardId === cardId);
    const nextCards = existing
      ? deck.cards.map((entry) => (entry.cardId === cardId ? { ...entry, count: entry.count + 1 } : entry))
      : [...deck.cards, { cardId, count: 1 }];

    updateCards(nextCards);
  };

  const removeCard = (cardId: string) => {
    if (!deck) {
      return;
    }

    updateCards(
      deck.cards.map((entry) => (entry.cardId === cardId ? { ...entry, count: entry.count - 1 } : entry)),
    );
  };

  return (
    <section
      style={{
        ...screenStyle,
        alignItems: "stretch",
        justifyContent: "flex-start",
        gap: 16,
        padding: 20,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.1 }}>デッキ構築</h1>
            {deck && (
              <span
                style={{
                  border: "1px solid #2a3344",
                  borderRadius: 999,
                  background: "#0b0e14",
                  padding: "5px 10px",
                  color: "#8b97a6",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {deck.name}
              </span>
            )}
            <span style={{ color: "#e8c870", fontSize: 18, fontWeight: 900 }}>
              {totalCount}/{DECK_SIZE}
            </span>
            {validation && (
              <span
                style={{
                  border: `1px solid ${validation.ok ? "#2f6f4f" : "#c75050"}`,
                  borderRadius: 999,
                  background: validation.ok ? "rgba(47,111,79,0.22)" : "rgba(199,80,80,0.16)",
                  color: validation.ok ? "#9fe6b0" : "#ffb1a8",
                  padding: "5px 10px",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                {validation.ok ? "有効" : "無効"}
              </span>
            )}
          </div>
          {validation && !validation.ok && (
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                color: "#ffb1a8",
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              {validation.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
        <button style={buttonStyle} onClick={() => setScreen("lobby")}>
          ロビーへ戻る
        </button>
      </header>

      <div
        style={{
          minHeight: 0,
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))",
          gap: 14,
          overflow: "hidden",
        }}
      >
        <DeckPane deck={deck} canAddCard={canAddCard} onAdd={addCard} onRemove={removeCard} />
        <CollectionPane cards={ownedCards} collection={collection} canAddCard={canAddCard} onAdd={addCard} />
      </div>
    </section>
  );
}

function DeckPane({
  deck,
  canAddCard,
  onAdd,
  onRemove,
}: {
  deck: Deck | null;
  canAddCard(cardId: string): boolean;
  onAdd(cardId: string): void;
  onRemove(cardId: string): void;
}) {
  return (
    <section style={panelStyle}>
      <PanelHeader title="デッキ" subtitle="編集中の30枚" />
      <div style={{ minHeight: 0, overflowY: "auto", padding: 12, display: "grid", gap: 8, alignContent: "start" }}>
        {!deck || deck.cards.length === 0 ? (
          <p style={{ margin: 0, color: "#8b97a6", fontSize: 14 }}>コレクションからカードを追加してください。</p>
        ) : (
          deck.cards.map((entry) => {
            const card = CARD_BY_ID[entry.cardId];
            if (!card) {
              return null;
            }

            return (
              <div
                key={entry.cardId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "42px 1fr auto auto auto",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 48,
                  border: `1px solid ${rarityBorder[card.rarity]}`,
                  borderRadius: 7,
                  background: "#0b0e14",
                  padding: 7,
                }}
              >
                <CostBadge cost={card.cost} />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    {card.name}
                  </div>
                  <div style={{ color: "#8b97a6", fontSize: 11 }}>{card.rarity}</div>
                </div>
                <strong style={{ color: "#e8c870", minWidth: 34, textAlign: "right" }}>x{entry.count}</strong>
                <SmallButton label="－" title={`${card.name}を1枚減らす`} onClick={() => onRemove(entry.cardId)} />
                <SmallButton
                  label="＋"
                  title={`${card.name}を1枚増やす`}
                  disabled={!canAddCard(entry.cardId)}
                  onClick={() => onAdd(entry.cardId)}
                />
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function CollectionPane({
  cards,
  collection,
  canAddCard,
  onAdd,
}: {
  cards: CardDef[];
  collection: Record<string, number>;
  canAddCard(cardId: string): boolean;
  onAdd(cardId: string): void;
}) {
  return (
    <section style={panelStyle}>
      <PanelHeader title="コレクション" subtitle="所持カード" />
      <div
        style={{
          minHeight: 0,
          overflowY: "auto",
          padding: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: 10,
          alignContent: "start",
        }}
      >
        {cards.map((card) => {
          const canAdd = canAddCard(card.id);

          return (
            <button
              key={card.id}
              type="button"
              disabled={!canAdd}
              onClick={() => onAdd(card.id)}
              style={{
                border: `1px solid ${rarityBorder[card.rarity]}`,
                borderRadius: 8,
                background: "#0b0e14",
                color: "#e8e0d0",
                cursor: canAdd ? "pointer" : "not-allowed",
                opacity: canAdd ? 1 : 0.5,
                padding: 8,
                display: "grid",
                gridTemplateColumns: "54px 1fr auto",
                alignItems: "center",
                gap: 8,
                textAlign: "left",
                minHeight: 78,
              }}
            >
              <CardThumb card={card} />
              <div style={{ minWidth: 0, display: "grid", gap: 3 }}>
                <div
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 13,
                    fontWeight: 900,
                  }}
                >
                  {card.name}
                </div>
                <div style={{ color: "#8b97a6", fontSize: 11 }}>
                  Cost {card.cost} / 所持 {collection[card.id] ?? 0}
                </div>
              </div>
              <span
                aria-hidden="true"
                style={{
                  width: 30,
                  height: 30,
                  border: "1px solid #3da9fc",
                  borderRadius: 6,
                  display: "grid",
                  placeItems: "center",
                  color: "#e8e0d0",
                  fontWeight: 900,
                  fontSize: 18,
                }}
              >
                ＋
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header
      style={{
        borderBottom: "1px solid #2a3344",
        padding: "12px 14px",
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 18, lineHeight: 1.2 }}>{title}</h2>
      <span style={{ color: "#8b97a6", fontSize: 12, fontWeight: 800 }}>{subtitle}</span>
    </header>
  );
}

function CostBadge({ cost }: { cost: number }) {
  return (
    <span
      style={{
        width: 34,
        height: 34,
        borderRadius: 999,
        background: "#3da9fc",
        color: "#ffffff",
        display: "grid",
        placeItems: "center",
        fontSize: 17,
        fontWeight: 900,
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      }}
    >
      {cost}
    </span>
  );
}

function CardThumb({ card }: { card: CardDef }) {
  return (
    <div
      style={{
        width: 54,
        height: 62,
        border: "1px solid #2a3344",
        borderRadius: 5,
        background: "#141a24",
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
      }}
    >
      {card.art ? (
        <img src={card.art} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <span style={{ color: "#8b97a6", fontSize: 10, fontWeight: 800 }}>No Art</span>
      )}
    </div>
  );
}

function SmallButton({
  label,
  title,
  disabled = false,
  onClick,
}: {
  label: string;
  title: string;
  disabled?: boolean;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...iconButtonStyle,
        opacity: disabled ? 0.42 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

function canAddToDeck(deck: Deck, collection: Record<string, number>, cardId: string): boolean {
  const card = CARD_BY_ID[cardId];
  if (!card || deckCount(deck) >= DECK_SIZE) {
    return false;
  }

  const cardCount = countCard(deck, cardId);
  if (cardCount >= COPY_LIMIT[card.rarity] || cardCount >= (collection[cardId] ?? 0)) {
    return false;
  }

  const totalLimit = DECK_TOTAL_LIMIT[card.rarity];
  return totalLimit === undefined || countRarity(deck, card.rarity) < totalLimit;
}

function countCard(deck: Deck, cardId: string): number {
  return deck.cards.reduce((total, entry) => total + (entry.cardId === cardId ? entry.count : 0), 0);
}

function countRarity(deck: Deck, rarity: Rarity): number {
  return deck.cards.reduce((total, entry) => {
    const card = CARD_BY_ID[entry.cardId];
    return total + (card?.rarity === rarity ? entry.count : 0);
  }, 0);
}

function normalizeEntries(entries: DeckEntry[]): DeckEntry[] {
  return entries
    .filter((entry) => entry.count > 0)
    .map((entry) => ({ cardId: entry.cardId, count: entry.count }));
}
