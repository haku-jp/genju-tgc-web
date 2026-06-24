import Phaser from "phaser";
import { createInitialBattleState } from "../core/factory";
import { getLegalSummonCells } from "../core/rules.summon";
import { getLegalMoveCells } from "../core/rules.move";
import { getLegalAttackCells } from "../core/rules.attack";
import { getWinner } from "../core/winloss";
import { BattleState, BoardPosition, CardDefinition, Owner } from "../core/state";
import { BattleController } from "../controller/BattleController";
import { BoardView } from "../view/BoardView";
import { HandView } from "../view/HandView";
import { CardView } from "../view/CardView";
import { CardZoomOverlay } from "../view/CardZoomOverlay";
import { Hud } from "../view/Hud";
import { COLOR } from "../view/theme";

function samePosition(a: BoardPosition, b: BoardPosition): boolean {
  return a.row === b.row && a.col === b.col;
}

const ENEMY_TURN_DELAY_MS = 600;
const COMMANDER_ASSETS = new Map<string, string>([
  ["player-commander", `${import.meta.env.BASE_URL}generals/player-commander.png`],
  ["enemy-commander", `${import.meta.env.BASE_URL}generals/enemy-commander.png`],
]);
const BACKGROUND_KEY = "battlefield";
const BACKGROUND_URL = `${import.meta.env.BASE_URL}bg/battlefield.png`;

interface BattleSetup {
  playerDeck?: CardDefinition[];
  enemyDeck?: CardDefinition[];
}

function nonEmptyDeck(deck: CardDefinition[] | undefined): CardDefinition[] | undefined {
  return deck && deck.length > 0 ? deck : undefined;
}

function collectArtAssets(state: BattleState): Map<string, string> {
  const assets = new Map<string, string>();
  const collect = (definition: CardDefinition): void => {
    if (definition.art) {
      assets.set(definition.cardId, definition.art);
    }
  };

  state.playerHand.forEach((card) => collect(card.definition));
  state.playerLibrary.forEach((card) => collect(card.definition));
  state.enemyHand.forEach((card) => collect(card.definition));
  state.enemyLibrary.forEach((card) => collect(card.definition));
  state.units.forEach((unit) => collect(unit.definition));
  COMMANDER_ASSETS.forEach((url, key) => assets.set(key, url));
  return assets;
}

/**
 * Battle scene. T5 renders the board + units, T6 renders the player's hand
 * as a fan, T7 adds tap-to-zoom, T8 adds drag-to-summon, T9 adds
 * select-then-move/attack on the board, T10 adds the HUD (mana/life/turn +
 * End Turn + enemy-HQ attack button), a dummy enemy turn, and the win/lose
 * transition to ResultScene — closing the menu -> battle -> result -> menu
 * loop.
 */
export class BattleScene extends Phaser.Scene {
  private controller!: BattleController;
  private boardView!: BoardView;
  private handView!: HandView;
  private cardZoomOverlay!: CardZoomOverlay;
  private hud!: Hud;
  private background?: Phaser.GameObjects.Image;

  private selectedUnitId: string | null = null;
  private moveCells: BoardPosition[] = [];
  private attackCells: BoardPosition[] = [];
  private canAttackEnemyHq = false;

  constructor() {
    super("Battle");
  }

  create(): void {
    const setup = this.registry.get("battleSetup") as BattleSetup | undefined;
    this.cameras.main.setBackgroundColor("#0b0e14");
    const initialState = createInitialBattleState({
      playerDeck: nonEmptyDeck(setup?.playerDeck),
      enemyDeck: nonEmptyDeck(setup?.enemyDeck),
    });
    this.controller = new BattleController(initialState);
    this.boardView = new BoardView(this, {
      onCellTap: (pos) => this.handleCellTap(pos),
      onUnitTap: (unitId, owner, pos) => this.handleUnitTap(unitId, owner, pos),
    });
    this.cardZoomOverlay = new CardZoomOverlay(this);
    this.handView = new HandView(this, {
      onTap: (handCard) => this.cardZoomOverlay.show(handCard.definition),
      onDragStart: (handIndex) => this.handleDragStart(handIndex),
      onDragMove: () => {
        // Legal cells are highlighted for the whole drag; per-cell hover
        // feedback is not part of the T8 spec.
      },
      onDragEnd: (card, handIndex, x, y) => this.handleDragEnd(card, handIndex, x, y),
    });
    this.hud = new Hud(this, {
      onEndTurn: () => this.handleEndTurn(),
      onAttackEnemyHq: () => this.handleAttackEnemyHq(),
    });
    this.render();
    this.loadAssets(initialState);

    this.scale.on("resize", this.handleResize, this);
    document.fonts.ready.then(() => this.render());
  }

  private loadAssets(state: BattleState): void {
    let queued = false;
    collectArtAssets(state).forEach((url, key) => {
      if (!this.textures.exists(key)) {
        this.load.image(key, url);
        queued = true;
      }
    });
    if (this.textures.exists(BACKGROUND_KEY)) {
      this.createBackground();
    } else {
      this.load.image(BACKGROUND_KEY, BACKGROUND_URL);
      queued = true;
    }

    if (!queued) {
      return;
    }
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.createBackground();
      this.render();
    });
    this.load.start();
  }

  /** Lays the generated guild-board art behind everything, cover-scaled to fill the viewport. */
  private createBackground(): void {
    if (this.background || !this.textures.exists(BACKGROUND_KEY)) {
      return;
    }
    this.background = this.add.image(0, 0, BACKGROUND_KEY).setOrigin(0, 0).setDepth(-10);
    this.fitBackground();
  }

  private fitBackground(): void {
    if (!this.background) {
      return;
    }
    const { width, height } = this.scale;
    const source = this.background.texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const srcWidth = source.width || this.background.width;
    const srcHeight = source.height || this.background.height;
    const scale = Math.max(width / srcWidth, height / srcHeight);
    this.background.setScale(scale);
    this.background.setPosition((width - srcWidth * scale) / 2, (height - srcHeight * scale) / 2);
  }

  private render(): void {
    const state = this.controller.getState();
    this.boardView.render(state);
    this.handView.render(state);
    this.hud.render(state);
  }

  private clearSelection(): void {
    this.selectedUnitId = null;
    this.moveCells = [];
    this.attackCells = [];
    this.canAttackEnemyHq = false;
    this.boardView.clearHighlights();
    this.hud.setAttackEnemyHqAvailable(false);
  }

  private selectUnit(unitId: string, pos: BoardPosition): void {
    const state = this.controller.getState();
    const unit = state.units.find((u) => u.unitId === unitId);
    this.selectedUnitId = unitId;
    this.moveCells = getLegalMoveCells(state, unitId);
    this.attackCells = getLegalAttackCells(state, unitId);
    this.canAttackEnemyHq = !!unit && !unit.hasAttackedThisTurn;
    this.boardView.showSelection(pos, this.moveCells, this.attackCells);
    this.hud.setAttackEnemyHqAvailable(this.canAttackEnemyHq);
  }

  private handleUnitTap(unitId: string, owner: Owner, pos: BoardPosition): void {
    const state = this.controller.getState();

    if (this.selectedUnitId && this.attackCells.some((c) => samePosition(c, pos))) {
      this.performAttack(this.selectedUnitId, unitId);
      return;
    }

    if (owner === state.currentTurn) {
      this.selectUnit(unitId, pos);
      return;
    }

    // Tapped an enemy unit that isn't a legal attack target: deselect.
    this.clearSelection();
  }

  private handleCellTap(pos: BoardPosition): void {
    if (this.selectedUnitId && this.moveCells.some((c) => samePosition(c, pos))) {
      this.performMove(this.selectedUnitId, pos);
      return;
    }
    this.clearSelection();
  }

  private handleAttackEnemyHq(): void {
    if (!this.selectedUnitId || !this.canAttackEnemyHq) {
      return;
    }
    const attackerId = this.selectedUnitId;
    const result = this.controller.tryAttackHeadquarters(attackerId);
    this.clearSelection();
    if (!result.ok) {
      return;
    }
    this.render();
    this.checkGameOver();
  }

  private performMove(unitId: string, target: BoardPosition): void {
    const before = this.controller.getState();
    const unit = before.units.find((u) => u.unitId === unitId);
    if (!unit) {
      this.clearSelection();
      return;
    }
    const from = unit.position;
    const result = this.controller.tryMove(unitId, target);
    this.clearSelection();
    if (!result.ok) {
      return;
    }
    this.boardView.animateMove(unitId, from, target, () => this.render());
  }

  private performAttack(attackerId: string, targetId: string): void {
    const result = this.controller.tryAttack(attackerId, targetId);
    this.clearSelection();
    if (!result.ok) {
      return;
    }
    this.boardView.animateAttack(attackerId, targetId, result.actions, () => {
      this.render();
      this.checkGameOver();
    });
  }

  private handleDragStart(_handIndex: number): void {
    this.clearSelection();
    const state = this.controller.getState();
    const cells = getLegalSummonCells(state, state.currentTurn);
    this.boardView.highlightCells(cells, COLOR.accent);
  }

  private handleDragEnd(card: CardView, handIndex: number, x: number, y: number): void {
    this.boardView.clearHighlights();
    const target = this.boardView.cellAt(x, y);
    const result = target ? this.controller.trySummon(handIndex, target) : { ok: false as const };

    if (result.ok) {
      const summonAction = result.actions.find((a) => a.type === "summon");
      card.shrinkAndDestroy(() => {
        this.render();
        if (summonAction?.unitId) {
          this.boardView.playSpawnPop(summonAction.unitId);
        }
      });
    } else {
      card.returnToOrigin();
    }
  }

  private handleEndTurn(): void {
    const state = this.controller.getState();
    if (state.currentTurn !== "player") {
      return;
    }
    this.clearSelection();
    this.controller.endTurn();
    this.render();
    if (this.checkGameOver()) {
      return;
    }
    this.runEnemyTurn();
  }

  /** Dummy enemy turn (plan: "対戦相手はまず固定/ランダム1手のダミーでよい"):
   * the first enemy unit that still can attacks the player HQ directly, then
   * the turn passes back. */
  private runEnemyTurn(): void {
    this.time.delayedCall(ENEMY_TURN_DELAY_MS, () => {
      const state = this.controller.getState();
      const attacker = state.units.find((u) => u.owner === "enemy" && !u.hasAttackedThisTurn);
      if (attacker) {
        this.controller.tryAttackHeadquarters(attacker.unitId);
        this.render();
        if (this.checkGameOver()) {
          return;
        }
      }
      this.controller.endTurn();
      this.render();
      this.checkGameOver();
    });
  }

  /** Returns true (and transitions to ResultScene) if the match has ended. */
  private checkGameOver(): boolean {
    const winner = getWinner(this.controller.getState());
    if (winner) {
      this.scene.start("Result", { winner });
      return true;
    }
    return false;
  }

  private handleResize(): void {
    this.fitBackground();
    this.render();
  }
}
