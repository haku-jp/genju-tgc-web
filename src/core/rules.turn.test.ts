import { describe, it, expect } from "vitest";
import { endTurn } from "./rules.turn";
import { createInitialBattleState } from "./factory";
import { card, state, unit } from "./test-utils";
import { HandCard, position } from "./state";

function hand(id: string): HandCard {
  return { cardInstanceId: id, definition: card({ cardId: id }) };
}

describe("endTurn", () => {
  it("flips the turn owner and increments the turn number", () => {
    const result = endTurn(createInitialBattleState());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.currentTurn).toBe("enemy");
    expect(result.state.turnNumber).toBe(2);
  });

  it("ramps each side to max 1 on its first turn, then +1 each subsequent turn", () => {
    let s = createInitialBattleState(); // player turn 1, player max 1, enemy max 0
    const toEnemy = endTurn(s);
    expect(toEnemy.ok).toBe(true);
    if (!toEnemy.ok) return;
    expect(toEnemy.state.enemyMaxMana).toBe(1); // enemy's first turn
    expect(toEnemy.state.enemyMana).toBe(1);

    const toPlayer = endTurn(toEnemy.state);
    expect(toPlayer.ok).toBe(true);
    if (!toPlayer.ok) return;
    expect(toPlayer.state.currentTurn).toBe("player");
    expect(toPlayer.state.playerMaxMana).toBe(2); // player's second turn
    expect(toPlayer.state.playerMana).toBe(2);
    expect(toPlayer.state.turnNumber).toBe(3);
  });

  it("caps max mana at 10", () => {
    const s = state({ currentTurn: "enemy", playerMaxMana: 10, playerMana: 0 });
    const result = endTurn(s);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.playerMaxMana).toBe(10);
    expect(result.state.playerMana).toBe(10);
  });

  it("refreshes the incoming side's units but not the other side's", () => {
    const s = state({
      currentTurn: "enemy",
      units: [
        unit({
          unitId: "p",
          owner: "player",
          position: position(5, 0),
          hasMovedThisTurn: true,
          hasAttackedThisTurn: true,
        }),
        unit({
          unitId: "e",
          owner: "enemy",
          position: position(0, 0),
          hasMovedThisTurn: true,
          hasAttackedThisTurn: true,
        }),
      ],
    });
    const result = endTurn(s); // incoming = player
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const p = result.state.units.find((u) => u.unitId === "p");
    const e = result.state.units.find((u) => u.unitId === "e");
    expect(p?.hasMovedThisTurn).toBe(false);
    expect(p?.hasAttackedThisTurn).toBe(false);
    expect(e?.hasMovedThisTurn).toBe(true); // untouched
  });

  it("draws one card for the incoming side at turn start", () => {
    const s = state({
      currentTurn: "player",
      enemyHand: [hand("enemy-hand")],
      enemyLibrary: [hand("draw-1"), hand("draw-2")],
    });

    const result = endTurn(s);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.enemyHand.map((card) => card.cardInstanceId)).toEqual(["enemy-hand", "draw-1"]);
    expect(result.state.enemyLibrary.map((card) => card.cardInstanceId)).toEqual(["draw-2"]);
  });

  it("does not draw when the incoming side already has seven cards", () => {
    const fullHand = Array.from({ length: 7 }, (_, index) => hand(`hand-${index}`));
    const library = [hand("kept")];
    const s = state({ currentTurn: "player", enemyHand: fullHand, enemyLibrary: library });

    const result = endTurn(s);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.enemyHand).toHaveLength(7);
    expect(result.state.enemyLibrary.map((card) => card.cardInstanceId)).toEqual(["kept"]);
  });

  it("does not draw or lose when the incoming side has an empty library", () => {
    const s = state({
      currentTurn: "enemy",
      playerHand: [hand("player-hand")],
      playerLibrary: [],
      playerLife: 3,
    });

    const result = endTurn(s);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.playerHand.map((card) => card.cardInstanceId)).toEqual(["player-hand"]);
    expect(result.state.playerLibrary).toHaveLength(0);
    expect(result.state.playerLife).toBe(3);
  });
});
