import { BattleScreen } from "./screens/BattleScreen";
import { CollectionScreen } from "./screens/CollectionScreen";
import { DeckScreen } from "./screens/DeckScreen";
import { LobbyScreen } from "./screens/LobbyScreen";
import { QuestScreen } from "./screens/QuestScreen";
import { TitleScreen } from "./screens/TitleScreen";
import { useAppStore } from "./store";

export function App() {
  const screen = useAppStore((state) => state.screen);

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        background: "#0b0e14",
        color: "#e8e0d0",
        overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {screen === "title" && <TitleScreen />}
      {screen === "lobby" && <LobbyScreen />}
      {screen === "quest" && <QuestScreen />}
      {screen === "collection" && <CollectionScreen />}
      {screen === "deck" && <DeckScreen />}
      {screen === "battle" && <BattleScreen />}
    </main>
  );
}
