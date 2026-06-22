import { useAppStore } from "../store";
import { buttonStyle, screenStyle } from "./styles";

export function TitleScreen() {
  const setScreen = useAppStore((state) => state.setScreen);

  return (
    <section style={screenStyle}>
      <h1 style={{ margin: 0, fontSize: 48, letterSpacing: 0 }}>幻獣TGC</h1>
      <button style={buttonStyle} onClick={() => setScreen("lobby")}>
        はじめる
      </button>
    </section>
  );
}
