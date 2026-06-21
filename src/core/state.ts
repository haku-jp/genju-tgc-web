// Framework-agnostic battle state model (no Phaser / DOM).
// Ported from Unity Core (Assets/Scripts/Core/**), extended toward the
// world-design mana rules (Docs/2026-06-15-genju-tgc-world-design.md).
//
// Divergence from Unity Core (intentional):
// - Life is tracked only on BattleState.playerLife / enemyLife (single source
//   of truth). There is no Headquarters board entity.
// - Added turnNumber and per-player maxMana to support the mana ramp.
// - Headquarters/hero attacks are off-board (Hearthstone style, decided
//   2026-06-20): a unit may always attack the enemy player directly once per
//   turn if it hasn't attacked yet — no board cell, no range, no blocker. This
//   supersedes world-design §10/§14's HQ-cell-and-defender model; see the note
//   in Docs/2026-06-15-genju-tgc-world-design.md.

export const BOARD_ROWS = 6;
export const BOARD_COLS = 6;
export const STARTING_LIFE = 20;
export const STARTING_MAX_MANA = 1;
export const MAX_MANA_CAP = 10;
export const HAND_LIMIT = 7;

export type Owner = "player" | "enemy";

export interface BoardPosition {
  readonly row: number;
  readonly col: number;
}

export interface CardDefinition {
  readonly cardId: string;
  readonly displayName: string;
  readonly manaCost: number;
  readonly attack: number;
  readonly life: number;
  readonly moveRange: number;
  readonly attackRange: number;
}

export interface HandCard {
  readonly cardInstanceId: string;
  readonly definition: CardDefinition;
}

export interface Unit {
  readonly unitId: string;
  readonly owner: Owner;
  readonly definition: CardDefinition;
  readonly position: BoardPosition;
  readonly currentLife: number;
  readonly hasMovedThisTurn: boolean;
  readonly hasAttackedThisTurn: boolean;
}

export interface BattleState {
  currentTurn: Owner;
  turnNumber: number;
  playerLife: number;
  enemyLife: number;
  playerMana: number;
  playerMaxMana: number;
  enemyMana: number;
  enemyMaxMana: number;
  playerHand: HandCard[];
  enemyHand: HandCard[];
  units: Unit[];
}

// ---- Position helpers ----

export function position(row: number, col: number): BoardPosition {
  return { row, col };
}

export function positionsEqual(a: BoardPosition, b: BoardPosition): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isInsideBoard(pos: BoardPosition): boolean {
  return (
    pos.row >= 0 &&
    pos.row < BOARD_ROWS &&
    pos.col >= 0 &&
    pos.col < BOARD_COLS
  );
}

// ---- State queries ----

export function unitAt(state: BattleState, pos: BoardPosition): Unit | undefined {
  return state.units.find((unit) => positionsEqual(unit.position, pos));
}

export function handOf(state: BattleState, owner: Owner): HandCard[] {
  return owner === "player" ? state.playerHand : state.enemyHand;
}

export function unitsOf(state: BattleState, owner: Owner): Unit[] {
  return state.units.filter((unit) => unit.owner === owner);
}

export function opponentOf(owner: Owner): Owner {
  return owner === "player" ? "enemy" : "player";
}

// ---- Mutation helpers (rules build new states from these) ----

/** Shallow clone with fresh arrays. Units/cards are immutable, replaced on change. */
export function cloneState(state: BattleState): BattleState {
  return {
    ...state,
    playerHand: [...state.playerHand],
    enemyHand: [...state.enemyHand],
    units: [...state.units],
  };
}

export function manaOf(state: BattleState, owner: Owner): number {
  return owner === "player" ? state.playerMana : state.enemyMana;
}
