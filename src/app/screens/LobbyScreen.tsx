import { useAppStore } from "../store";
import { buttonStyle, screenStyle } from "./styles";

export function LobbyScreen() {
  const setScreen = useAppStore((state) => state.setScreen);

  return (
    <section style={screenStyle}>
      <h1 style={{ margin: 0, fontSize: 36 }}>ロビー</h1>
      <div style={{ display: "grid", gap: 12, width: 220 }}>
        <button style={buttonStyle} onClick={() => setScreen("battle")}>
          対戦
        </button>
        <button style={buttonStyle} onClick={() => setScreen("quest")}>
          クエスト
        </button>
        <button style={buttonStyle} onClick={() => setScreen("collection")}>
          コレクション
        </button>
        <button style={buttonStyle} onClick={() => setScreen("deck")}>
          デッキ
        </button>
      </div>
    </section>
  );
}
