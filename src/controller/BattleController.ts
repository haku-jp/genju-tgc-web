// Translates view-layer intents into core rule calls. Holds the single
// mutable reference to the current BattleState; the view never mutates state
// itself and never decides success/failure — see Docs/BATTLE_INTERACTION_SPEC.md.

import { BattleState, BoardPosition } from "../core/state";
import { CommandResult } from "../core/result";
import { trySummon } from "../core/rules.summon";
import { tryMove } from "../core/rules.move";
import { tryAttack, tryAttackHeadquarters } from "../core/rules.attack";
import { endTurn } from "../core/rules.turn";

export class BattleController {
  private state: BattleState;

  constructor(initialState: BattleState) {
    this.state = initialState;
  }

  getState(): BattleState {
    return this.state;
  }

  trySummon(handIndex: number, target: BoardPosition): CommandResult {
    const result = trySummon(this.state, handIndex, target);
    if (result.ok) {
      this.state = result.state;
    }
    return result;
  }

  tryMove(unitId: string, target: BoardPosition): CommandResult {
    const result = tryMove(this.state, unitId, target);
    if (result.ok) {
      this.state = result.state;
    }
    return result;
  }

  tryAttack(attackerId: string, targetId: string): CommandResult {
    const result = tryAttack(this.state, attackerId, targetId);
    if (result.ok) {
      this.state = result.state;
    }
    return result;
  }

  tryAttackHeadquarters(attackerId: string): CommandResult {
    const result = tryAttackHeadquarters(this.state, attackerId);
    if (result.ok) {
      this.state = result.state;
    }
    return result;
  }

  endTurn(): CommandResult {
    const result = endTurn(this.state);
    if (result.ok) {
      this.state = result.state;
    }
    return result;
  }
}
