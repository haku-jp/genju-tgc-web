// Win/lose evaluation. A side loses when its life reaches 0.

import { BattleState, Owner } from "./state";

export function getWinner(state: BattleState): Owner | null {
  if (state.enemyLife <= 0) {
    return "player";
  }
  if (state.playerLife <= 0) {
    return "enemy";
  }
  return null;
}

export function isGameOver(state: BattleState): boolean {
  return getWinner(state) !== null;
}
