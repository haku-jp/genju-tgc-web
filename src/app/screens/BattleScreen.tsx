import { useEffect, useRef } from "react";
import { createGame } from "../../game/createGame";
import { useAppStore } from "../store";
import { buttonStyle } from "./styles";

export function BattleScreen() {
  const ref = useRef<HTMLDivElement>(null);
  const setScreen = useAppStore((state) => state.setScreen);

  useEffect(() => {
    const game = createGame(ref.current!);
    return () => game.destroy(true);
  }, []);

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
