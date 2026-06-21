// Result of a rules command. Mirrors Unity Core's BattleCommandResult/BattleAction.
// `actions` is the ordered list the presentation layer animates (see
// Docs/BATTLE_INTERACTION_SPEC.md). The view never decides outcomes itself.

import { BattleState, BoardPosition } from "./state";

export type BattleActionType =
  | "summon"
  | "move"
  | "attack"
  | "damage"
  | "hqDamage"
  | "death"
  | "endTurn";

export interface BattleAction {
  readonly type: BattleActionType;
  /** The acting/affected unit, when applicable. */
  readonly unitId?: string;
  /** A secondary target id (enemy unit id, or "enemy-hq"/"player-hq"). */
  readonly targetId?: string;
  readonly from?: BoardPosition;
  readonly to?: BoardPosition;
  /** Damage/heal amount, when applicable. */
  readonly amount?: number;
}

export interface SuccessResult {
  readonly ok: true;
  readonly state: BattleState;
  readonly actions: BattleAction[];
}

export interface FailureResult {
  readonly ok: false;
  /** Unchanged state, returned for convenience. */
  readonly state: BattleState;
  readonly reason: string;
}

export type CommandResult = SuccessResult | FailureResult;

export function succeed(state: BattleState, actions: BattleAction[]): SuccessResult {
  return { ok: true, state, actions };
}

export function fail(state: BattleState, reason: string): FailureResult {
  return { ok: false, state, reason };
}

export function manhattan(a: BoardPosition, b: BoardPosition): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

export function isInAttackRange(a: BoardPosition, b: BoardPosition, range: number): boolean {
  const distance = manhattan(a, b);
  return distance > 0 && distance <= range;
}
