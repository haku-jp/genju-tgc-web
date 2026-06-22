import { useState } from "react";
import { CARDS, type CardDef, type CardType, type Rarity } from "../../data/cards";
import { useAppStore } from "../store";
import { buttonStyle, screenStyle } from "./styles";

const text = {
  title: "\u30b3\u30ec\u30af\u30b7\u30e7\u30f3\uff08\u56f3\u9451\uff09",
  backToLobby: "\u30ed\u30d3\u30fc\u3078\u623b\u308b",
  genju: "\u5e7b\u7363",
  spell: "\u9b54\u8853",
  equip: "\u88c5\u5099",
  close: "\u9589\u3058\u308b",
  target: "\u5bfe\u8c61",
  effect: "\u52b9\u679c",
  flavor: "\u30d5\u30ec\u30fc\u30d0\u30fc",
};

const rarityBorder: Record<Rarity, string> = {
  I: "#f2e3b3",
  L: "#e8c870",
  R: "#3da9fc",
  S: "#8b97a6",
};

const typeLabel: Record<CardType, string> = {
  genju: text.genju,
  spell: text.spell,
  equip: text.equip,
};

const typeBand: Record<CardType, string> = {
  genju: "#2f6f4f",
  spell: "#3da9fc",
  equip: "#e8c870",
};

export function CollectionScreen() {
  const setScreen = useAppStore((state) => state.setScreen);
  const [selectedCard, setSelectedCard] = useState<CardDef | null>(null);

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
        <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.1 }}>{text.title}</h1>
        <button style={buttonStyle} onClick={() => setScreen("lobby")}>
          {text.backToLobby}
        </button>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 12,
          overflowY: "auto",
          padding: "2px 2px 10px",
        }}
      >
        {CARDS.map((card) => (
          <CardTile key={card.id} card={card} onClick={() => setSelectedCard(card)} />
        ))}
      </div>

      {selectedCard && <CardDetail card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </section>
  );
}

interface CardTileProps {
  card: CardDef;
  onClick(): void;
}

function CardTile({ card, onClick }: CardTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        width: "100%",
        minHeight: 250,
        boxSizing: "border-box",
        border: `2px solid ${rarityBorder[card.rarity]}`,
        borderRadius: 8,
        background: "#141a24",
        color: "#e8e0d0",
        padding: 8,
        cursor: "pointer",
        overflow: "hidden",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), 0 10px 24px rgba(0,0,0,0.32)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        font: "700 13px system-ui, sans-serif",
        textAlign: "left",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 2,
          minWidth: 30,
          height: 30,
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
        {card.cost}
      </div>
      <div
        style={{
          position: "absolute",
          top: 9,
          right: 8,
          zIndex: 2,
          padding: "3px 7px",
          borderRadius: 999,
          background: typeBand[card.type],
          color: card.type === "equip" ? "#0b0e14" : "#ffffff",
          fontSize: 12,
          fontWeight: 900,
        }}
      >
        {typeLabel[card.type]}
      </div>
      <div
        style={{
          width: "100%",
          height: 160,
          minHeight: 160,
          flex: "0 0 160px",
          border: "1px solid #2a3344",
          borderRadius: 5,
          background: "#141a24",
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        {card.art ? (
          <img
            src={card.art}
            alt={card.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <span style={{ color: "#8b97a6", fontSize: 13, letterSpacing: 0 }}>No Art</span>
        )}
      </div>
      <div
        style={{
          display: "grid",
          alignContent: "space-between",
          gap: 6,
        }}
      >
        <div style={{ color: "#8b97a6", fontSize: 11, fontWeight: 800 }}>{card.rarity}</div>
        <div
          style={{
            lineHeight: 1.25,
            fontSize: 14,
            color: "#e8e0d0",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
          }}
        >
          {card.name}
        </div>
        {card.type === "genju" && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, fontSize: 13 }}>
            <strong>ATK {card.attack}</strong>
            <strong style={{ color: "#9fe6b0" }}>HP {card.health}</strong>
          </div>
        )}
      </div>
    </button>
  );
}

interface CardDetailProps {
  card: CardDef;
  onClose(): void;
}

function CardDetail({ card, onClose }: CardDetailProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        background: "rgba(0,0,0,0.72)",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <article
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(760px, 100%)",
          maxHeight: "min(760px, 92vh)",
          overflowY: "auto",
          border: `2px solid ${rarityBorder[card.rarity]}`,
          borderRadius: 8,
          background: "#141a24",
          color: "#e8e0d0",
          boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
          gap: 18,
          padding: 18,
        }}
      >
        <div
          style={{
            aspectRatio: "5 / 7",
            border: "1px solid #2a3344",
            borderRadius: 6,
            background: "#0b0e14",
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
          }}
        >
          {card.art ? (
            <img
              src={card.art}
              alt={card.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <span style={{ color: "#8b97a6", fontSize: 18, fontWeight: 800 }}>No Art</span>
          )}
        </div>
        <div style={{ display: "grid", gap: 12, alignContent: "start", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.15 }}>{card.name}</h2>
              <div style={{ marginTop: 6, color: "#8b97a6", fontSize: 13 }}>{card.id}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={text.close}
              style={{
                width: 36,
                height: 36,
                border: "1px solid #2a3344",
                borderRadius: 6,
                background: "#0b0e14",
                color: "#e8e0d0",
                cursor: "pointer",
                fontSize: 22,
                lineHeight: 1,
              }}
            >
              x
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <DetailPill label="Cost" value={String(card.cost)} />
            <DetailPill label="Type" value={typeLabel[card.type]} />
            <DetailPill label="Rare" value={card.rarity} />
            {card.type === "genju" && <DetailPill label="ATK" value={String(card.attack)} />}
            {card.type === "genju" && <DetailPill label="HP" value={String(card.health)} />}
          </div>
          {card.subtype && <p style={{ margin: 0, color: "#8b97a6", fontSize: 13 }}>{card.subtype}</p>}
          {card.target && <DetailText title={text.target} text={card.target} />}
          <DetailText title={text.effect} text={card.rulesText} />
          {card.flavorText && <DetailText title={text.flavor} text={card.flavorText} muted />}
        </div>
      </article>
    </div>
  );
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <span
      style={{
        border: "1px solid #2a3344",
        borderRadius: 999,
        background: "#0b0e14",
        padding: "5px 9px",
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      <span style={{ color: "#8b97a6", marginRight: 5 }}>{label}</span>
      {value}
    </span>
  );
}

function DetailText({ title, text, muted = false }: { title: string; text: string; muted?: boolean }) {
  return (
    <section style={{ display: "grid", gap: 5 }}>
      <h3 style={{ margin: 0, color: "#3da9fc", fontSize: 13 }}>{title}</h3>
      <p style={{ margin: 0, lineHeight: 1.6, color: muted ? "#8b97a6" : "#e8e0d0", fontSize: 14 }}>
        {text}
      </p>
    </section>
  );
}
