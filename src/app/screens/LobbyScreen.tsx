import { useRef, useState, type CSSProperties } from "react";
import { useAppStore, type Screen } from "../store";
import { useSaveStore } from "../save/store";
import { CARD_BY_ID, type CardDef, type Rarity } from "../../data/cards";

const RARITY_EDGE: Record<Rarity, string> = {
  I: "#f2e3b3",
  L: "#e8c870",
  R: "#3da9fc",
  S: "#8b97a6",
};

const NAV: { screen: Screen; label: string }[] = [
  { screen: "battle", label: "対戦" },
  { screen: "quest", label: "クエスト" },
  { screen: "collection", label: "コレクション" },
  { screen: "deck", label: "デッキ" },
];

const rootStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  color: "#e8e0d0",
  overflow: "hidden",
  // ギルド拠点の温かみ: 深い紺地に金の灯り
  background:
    "radial-gradient(120% 80% at 50% 30%, rgba(232,200,112,0.16), rgba(11,14,20,0) 60%)," +
    " radial-gradient(140% 100% at 50% 120%, rgba(61,169,252,0.10), rgba(11,14,20,0) 55%)," +
    " #0b0e14",
};

export function LobbyScreen() {
  const setScreen = useAppStore((s) => s.setScreen);
  const favoriteGenjuIds = useSaveStore((s) => s.favoriteGenjuIds);

  const favorites = favoriteGenjuIds
    .map((id) => CARD_BY_ID[id])
    .filter((c): c is CardDef => Boolean(c));

  const [idx, setIdx] = useState(0);
  const dragStartX = useRef<number | null>(null);

  const count = favorites.length;
  const activeIndex = count > 0 ? idx % count : 0;
  const active = count > 0 ? favorites[activeIndex] : undefined;

  const go = (dir: number) => {
    if (count === 0) return;
    setIdx((i) => (i + dir + count) % count);
  };

  return (
    <section style={rootStyle}>
      <header style={{ paddingTop: 18, textAlign: "center" }}>
        <div style={{ font: "700 22px system-ui, sans-serif", letterSpacing: 2 }}>
          幻獣保護調査ギルド
        </div>
        <div style={{ color: "#8b97a6", fontSize: 12, marginTop: 2 }}>ロビー</div>
      </header>

      {/* 主役の幻獣（お気に入り・スワイプ切替） */}
      <div
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          minHeight: 0,
        }}
        onPointerDown={(e) => {
          dragStartX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (dragStartX.current === null) return;
          const dx = e.clientX - dragStartX.current;
          dragStartX.current = null;
          if (dx > 40) go(-1);
          else if (dx < -40) go(1);
        }}
      >
        {count > 1 && (
          <button aria-label="前へ" style={arrowStyle} onClick={() => go(-1)}>
            ‹
          </button>
        )}

        {active ? (
          <FeaturedGenju card={active} />
        ) : (
          <div style={{ color: "#8b97a6" }}>お気に入りの幻獣が未設定です</div>
        )}

        {count > 1 && (
          <button aria-label="次へ" style={arrowStyle} onClick={() => go(1)}>
            ›
          </button>
        )}
      </div>

      {count > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {favorites.map((c, i) => (
            <span
              key={c.id}
              onClick={() => setIdx(i)}
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                cursor: "pointer",
                background: i === activeIndex ? "#e8c870" : "rgba(232,224,208,0.3)",
              }}
            />
          ))}
        </div>
      )}

      <nav
        style={{
          width: "100%",
          display: "flex",
          gap: 10,
          justifyContent: "center",
          flexWrap: "wrap",
          padding: "14px 16px calc(18px + env(safe-area-inset-bottom))",
          background: "rgba(20,26,36,0.55)",
          borderTop: "1px solid rgba(42,51,68,0.8)",
          backdropFilter: "blur(4px)",
        }}
      >
        {NAV.map((n) => (
          <button
            key={n.screen}
            onClick={() => setScreen(n.screen)}
            style={n.screen === "battle" ? primaryNavStyle : navStyle}
          >
            {n.label}
          </button>
        ))}
      </nav>
    </section>
  );
}

function FeaturedGenju({ card }: { card: CardDef }) {
  const edge = RARITY_EDGE[card.rarity];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        minHeight: 0,
      }}
    >
      <div
        style={{
          position: "relative",
          height: "min(56vh, 420px)",
          aspectRatio: "2 / 3",
          borderRadius: 12,
          border: `2px solid ${edge}`,
          boxShadow: `0 0 28px ${edge}55, 0 14px 40px rgba(0,0,0,0.5)`,
          overflow: "hidden",
          background: "#141a24",
        }}
      >
        {card.art ? (
          <img
            src={card.art}
            alt={card.name}
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", userSelect: "none" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8b97a6",
            }}
          >
            No Art
          </div>
        )}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ font: "700 24px system-ui, sans-serif" }}>{card.name}</div>
        {card.subtype && (
          <div style={{ color: "#8b97a6", fontSize: 13, marginTop: 2 }}>{card.subtype}</div>
        )}
      </div>
    </div>
  );
}

const arrowStyle: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  border: "1px solid rgba(232,224,208,0.25)",
  background: "rgba(20,26,36,0.7)",
  color: "#e8e0d0",
  font: "700 22px system-ui, sans-serif",
  cursor: "pointer",
  flex: "0 0 auto",
};

const navStyle: CSSProperties = {
  minWidth: 110,
  minHeight: 46,
  borderRadius: 8,
  border: "1px solid #2a3344",
  background: "#141a24",
  color: "#e8e0d0",
  font: "700 15px system-ui, sans-serif",
  cursor: "pointer",
};

const primaryNavStyle: CSSProperties = {
  ...navStyle,
  border: "1px solid #3da9fc",
  background: "#3da9fc",
  color: "#0b0e14",
};
