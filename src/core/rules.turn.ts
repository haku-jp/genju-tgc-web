// Turn rules. Ported from Unity BattleRules.EndTurn, extended with the
// world-design mana ramp: when a side begins its turn, its max mana rises by 1
// (cap 10) and current mana refills; that side's units refresh (move/attack).

import { BattleState, MAX_MANA_CAP, cloneState, opponentOf } from "./state";
import { CommandResult, succeed } from "./result";

export function endTurn(state: BattleState): CommandResult {
  const incoming = opponentOf(state.currentTurn);
  const next = cloneState(state);
  next.currentTurn = incoming;
  next.turnNumber = state.turnNumber + 1;

  if (incoming === "player") {
    next.playerMaxMana = Math.min(MAX_MANA_CAP, state.playerMaxMana + 1);
    next.playerMana = next.playerMaxMana;
  } else {
    next.enemyMaxMana = Math.min(MAX_MANA_CAP, state.enemyMaxMana + 1);
    next.enemyMana = next.enemyMaxMana;
  }

  next.units = state.units.map((u) =>
    u.owner === incoming
      ? { ...u, hasMovedThisTurn: false, hasAttackedThisTurn: false }
      : u,
  );

  return succeed(next, [{ type: "endTurn" }]);
}
