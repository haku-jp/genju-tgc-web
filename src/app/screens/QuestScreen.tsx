import { useAppStore } from "../store";
import { buttonStyle, screenStyle } from "./styles";

export function QuestScreen() {
  const setScreen = useAppStore((state) => state.setScreen);

  return (
    <section style={screenStyle}>
      <h1 style={{ margin: 0, fontSize: 36 }}>クエスト</h1>
      <button style={buttonStyle} onClick={() => setScreen("lobby")}>
        ロビーへ戻る
      </button>
    </section>
  );
}
