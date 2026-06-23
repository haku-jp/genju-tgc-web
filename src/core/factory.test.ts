import { describe, it, expect } from "vitest";
import {
  BOARD_COLS,
  BOARD_ROWS,
  CardDefinition,
  isInsideBoard,
  STARTING_LIFE,
  STARTING_MAX_MANA,
} from "./state";
import { createInitialBattleState } from "./factory";
import { card } from "./test-utils";

const identityShuffle = <T,>(arr: T[]): T[] => arr;

function deck(size: number): CardDefinition[] {
  return Array.from({ length: size }, (_, index) =>
    card({ cardId: `deck-${index + 1}`, displayName: `Deck ${index + 1}` }),
  );
}

describe("createInitialBattleState", () => {
  it("starts on turn 1 with the player to act by default", () => {
    const state = createInitialBattleState();
    expect(state.currentTurn).toBe("player");
    expect(state.turnNumber).toBe(1);
  });

  it("respects an explicit starting turn", () => {
    const state = createInitialBattleState({ startingTurn: "enemy" });
    expect(state.currentTurn).toBe("enemy");
  });

  it("sets both lives to the starting life", () => {
    const state = createInitialBattleState();
    expect(state.playerLife).toBe(STARTING_LIFE);
    expect(state.enemyLife).toBe(STARTING_LIFE);
  });

  it("gives the starting side turn-1 mana and the other side none yet", () => {
    const state = createInitialBattleState();
    expect(state.playerMaxMana).toBe(STARTING_MAX_MANA);
    expect(state.playerMana).toBe(STARTING_MAX_MANA);
    // Enemy has not begun a turn yet; it ramps to 1 on its first endTurn.
    expect(state.enemyMaxMana).toBe(0);
    expect(state.enemyMana).toBe(0);
  });

  it("gives the player a 5-card opening hand", () => {
    const state = createInitialBattleState();
    expect(state.playerHand).toHaveLength(5);
    expect(state.playerLibrary).toHaveLength(0);
    state.playerHand.forEach((card) => {
      expect(card.cardInstanceId).toBeTruthy();
      expect(card.definition.manaCost).toBeGreaterThanOrEqual(0);
    });
  });

  it("builds opening hand and library from a provided player deck", () => {
    const playerDeck = deck(10);
    const state = createInitialBattleState({ playerDeck, shuffle: identityShuffle });

    expect(state.playerHand).toHaveLength(5);
    expect(state.playerLibrary).toHaveLength(5);
    expect(state.playerHand.map((handCard) => handCard.definition.cardId)).toEqual([
      "deck-1",
      "deck-2",
      "deck-3",
      "deck-4",
      "deck-5",
    ]);
    expect(state.playerLibrary.map((handCard) => handCard.definition.cardId)).toEqual([
      "deck-6",
      "deck-7",
      "deck-8",
      "deck-9",
      "deck-10",
    ]);
    expect(new Set(state.playerHand.concat(state.playerLibrary).map((handCard) => handCard.cardInstanceId)).size).toBe(
      10,
    );
    expect(state.units.every((unit) => unit.owner !== "player")).toBe(true);
  });

  it("builds enemy opening hand and library from a provided enemy deck", () => {
    const enemyDeck = deck(8);
    const state = createInitialBattleState({ enemyDeck, shuffle: identityShuffle });

    expect(state.enemyHand.map((handCard) => handCard.definition.cardId)).toEqual([
      "deck-1",
      "deck-2",
      "deck-3",
      "deck-4",
      "deck-5",
    ]);
    expect(state.enemyLibrary.map((handCard) => handCard.definition.cardId)).toEqual([
      "deck-6",
      "deck-7",
      "deck-8",
    ]);
  });

  it("assigns distinct structured movement and attack profiles to the placeholder cards", () => {
    const state = createInitialBattleState();
    const [koran, korantan, korangarth] = state.playerHand.map((card) => card.definition);

    expect(koran.move).toEqual({ options: [{ dirs: "all8", range: 1 }] });
    expect(koran.attackProfile).toEqual({ pattern: "adjacent", range: 1, lineOfSight: false });

    expect(korantan.move).toEqual({ options: [{ dirs: "orthogonal", range: 2 }] });
    expect(korantan.attackProfile).toEqual({ pattern: "adjacent", range: 1, lineOfSight: false });

    expect(korangarth.move).toEqual({ options: [{ dirs: "all8", range: 3, pass: "all" }] });
    expect(korangarth.attackProfile).toEqual({
      pattern: "line",
      dirs: "orthogonal",
      range: 2,
      lineOfSight: true,
    });
  });

  it("uses unique hand card instance ids", () => {
    const state = createInitialBattleState();
    const ids = state.playerHand.map((card) => card.cardInstanceId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("spawns enemy units that are inside the board and full health", () => {
    const state = createInitialBattleState();
    expect(state.units.length).toBeGreaterThan(0);
    state.units.forEach((unit) => {
      expect(unit.owner).toBe("enemy");
      expect(isInsideBoard(unit.position)).toBe(true);
      expect(unit.currentLife).toBe(unit.definition.life);
      expect(unit.hasMovedThisTurn).toBe(false);
      expect(unit.hasAttackedThisTurn).toBe(false);
    });
  });

  it("does not stack two units on the same cell", () => {
    const state = createInitialBattleState();
    const keys = state.units.map((u) => `${u.position.row}-${u.position.col}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps the board at 6x6", () => {
    expect(BOARD_ROWS).toBe(6);
    expect(BOARD_COLS).toBe(6);
  });
});
