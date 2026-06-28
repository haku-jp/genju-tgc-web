import { useEffect, useMemo, useRef } from "react";
import { deckToCoreDefs } from "../../game/catalogToCore";
import { createGame } from "../../game/createGame";
import { useSaveStore } from "../save/store";
import { useAppStore } from "../store";
import { buttonStyle } from "./styles";

export function BattleScreen() {
  const ref = useRef<HTMLDivElement>(null);
  const setScreen = useAppStore((state) => state.setScreen);
  const decks = useSaveStore((state) => state.decks);
  const activeDeckId = useSaveStore((state) => state.activeDeckId);
  const activeDeck = useMemo(
    () => decks.find((deck) => deck.id === activeDeckId) ?? decks[0] ?? null,
    [activeDeckId, decks],
  );
  const playerDeck = useMemo(() => (activeDeck ? deckToCoreDefs(activeDeck) : []), [activeDeck]);

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const onExitToLobby = () => setScreen("lobby");
    const game = playerDeck.length > 0
      ? createGame(ref.current, { playerDeck, onExitToLobby })
      : createGame(ref.current, { onExitToLobby });
    return () => game.destroy(true);
  }, [playerDeck, setScreen]);

  return (
    <>
      <button
        style={{ ...buttonStyle, position: "fixed", left: 16, top: 16, zIndex: 10 }}
        onClick={() => setScreen("lobby")}
      >
        ロビーへ
      </button>
      <div ref={ref} style={{ width: "100%", height: "100%" }} />
    </>
  );
}
