// Renders the 6x6 board, units, and (from T8) legal-cell highlights from
// BattleState. render() rebuilds tiles/units; highlights live in a separate
// container so a drag/selection pulse survives independent of render().
//
// T9 adds unit tap-to-select, tap-to-move/attack on highlighted cells, and
// the juice for those actions (move slide, attack lunge + hitstop + damage
// popups + screen shake, death fade) per Docs/BATTLE_INTERACTION_SPEC.md.
// Animation is purely visual here: the controller/core has already decided
// success and the resulting state before any of this plays.

import Phaser from "phaser";
import {
  BattleState,
  BOARD_COLS,
  BOARD_ROWS,
  BoardPosition,
  Owner,
  Unit,
  isInsideBoard,
} from "../core/state";
import { BattleAction } from "../core/result";
import { COLOR, FONT_FAMILY, LAYOUT, TEXT_COLOR } from "./theme";

export interface BoardLayout {
  originX: number;
  originY: number;
  tileSize: number;
}

export interface BoardViewCallbacks {
  /** Tap on an empty cell (or a cell with no interactive unit on top). */
  onCellTap(pos: BoardPosition): void;
  /** Tap on a unit's token (own or enemy). */
  onUnitTap(unitId: string, owner: Owner, pos: BoardPosition): void;
}

const MOVE_MS_PER_CELL = 180;
const LUNGE_MS = 120;
const HITSTOP_MS = 60;
const DEATH_FADE_MS = 200;
const SHAKE_NORMAL_PX = 3;
const DAMAGE_POP_RISE_PX = 18;
const DAMAGE_POP_MS = 500;

export class BoardView {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly highlightContainer: Phaser.GameObjects.Container;
  private readonly callbacks?: BoardViewCallbacks;
  private highlightTween?: Phaser.Tweens.Tween;
  private layout: BoardLayout = { originX: 0, originY: 0, tileSize: 0 };

  constructor(scene: Phaser.Scene, callbacks?: BoardViewCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.container = scene.add.container(0, 0);
    this.highlightContainer = scene.add.container(0, 0);
  }

  /** Current layout, so later interaction tasks can map pixels <-> cells. */
  getLayout(): BoardLayout {
    return this.layout;
  }

  cellCenter(pos: BoardPosition): { x: number; y: number } {
    const { originX, originY, tileSize } = this.layout;
    return {
      x: originX + pos.col * tileSize + tileSize / 2,
      y: originY + pos.row * tileSize + tileSize / 2,
    };
  }

  /** World point -> board cell, or null if outside the board. */
  cellAt(screenX: number, screenY: number): BoardPosition | null {
    const { originX, originY, tileSize } = this.layout;
    if (tileSize <= 0) {
      return null;
    }
    const col = Math.floor((screenX - originX) / tileSize);
    const row = Math.floor((screenY - originY) / tileSize);
    const pos = { row, col };
    return isInsideBoard(pos) ? pos : null;
  }

  /** Pulsing glow over the given cells (style guide: 0.4s period). Drag-to-summon (T8) entry point. */
  highlightCells(cells: BoardPosition[], color: number): void {
    this.clearHighlights();
    this.addHighlightGroup(cells, color);
    this.startHighlightPulse();
  }

  /** Adds a filled glow group without clearing existing groups (T9: move+attack shown together). */
  addHighlightGroup(cells: BoardPosition[], color: number): void {
    const { tileSize } = this.layout;
    for (const cell of cells) {
      const center = this.cellCenter(cell);
      const glow = this.scene.add
        .rectangle(center.x, center.y, tileSize * 0.85, tileSize * 0.85, color, 0.35)
        .setStrokeStyle(2, color);
      this.highlightContainer.add(glow);
    }
  }

  /** Stroke-only ring marking the currently selected unit's cell. */
  drawSelectionRing(pos: BoardPosition): void {
    const { tileSize } = this.layout;
    const center = this.cellCenter(pos);
    const ring = this.scene.add
      .rectangle(center.x, center.y, tileSize * 0.92, tileSize * 0.92, COLOR.selected, 0)
      .setStrokeStyle(3, COLOR.selected);
    this.highlightContainer.add(ring);
  }

  startHighlightPulse(): void {
    this.highlightTween?.stop();
    this.highlightTween = this.scene.tweens.add({
      targets: this.highlightContainer,
      alpha: { from: 0.5, to: 1 },
      duration: 400,
      yoyo: true,
      repeat: -1,
    });
  }

  /** Selection display: white ring on the unit + blue move cells + red attack cells. */
  showSelection(unitPos: BoardPosition, moveCells: BoardPosition[], attackCells: BoardPosition[]): void {
    this.clearHighlights();
    this.drawSelectionRing(unitPos);
    this.addHighlightGroup(moveCells, COLOR.accent);
    this.addHighlightGroup(attackCells, COLOR.danger);
    this.startHighlightPulse();
  }

  clearHighlights(): void {
    this.highlightTween?.stop();
    this.highlightContainer.removeAll(true);
    this.highlightContainer.setAlpha(1);
  }

  /** Pop a just-spawned unit's token in (style guide EASE_POP: 1.15 -> 1.0 / 0.15s). */
  playSpawnPop(unitId: string): void {
    const unitContainer = this.container.getByName(unitId);
    if (!unitContainer) {
      return;
    }
    (unitContainer as Phaser.GameObjects.Container).setScale(1.15);
    this.scene.tweens.add({
      targets: unitContainer,
      scale: 1,
      duration: 150,
      ease: "Back.easeOut",
    });
  }

  /**
   * Slides the unit's existing token from its current displayed position to
   * `to` (spec: 0.18s per cell, easeOutQuad), then calls onComplete so the
   * caller can re-render the now-authoritative state.
   */
  animateMove(unitId: string, from: BoardPosition, to: BoardPosition, onComplete: () => void): void {
    const unitContainer = this.container.getByName(unitId) as Phaser.GameObjects.Container | null;
    if (!unitContainer) {
      onComplete();
      return;
    }
    const dest = this.cellCenter(to);
    const distance = Math.max(1, Math.abs(from.row - to.row) + Math.abs(from.col - to.col));
    this.scene.tweens.add({
      targets: unitContainer,
      x: dest.x,
      y: dest.y,
      duration: MOVE_MS_PER_CELL * distance,
      ease: "Quad.easeOut",
      onComplete,
    });
  }

  /**
   * Plays the attack lunge + hitstop + damage popups + shake + death fade
   * sequence, then calls onComplete so the caller can re-render the
   * authoritative (already-mutated) state.
   */
  animateAttack(attackerId: string, targetId: string, actions: BattleAction[], onComplete: () => void): void {
    const attackerContainer = this.container.getByName(attackerId) as Phaser.GameObjects.Container | null;
    const targetContainer = this.container.getByName(targetId) as Phaser.GameObjects.Container | null;
    if (!attackerContainer || !targetContainer) {
      onComplete();
      return;
    }

    const originX = attackerContainer.x;
    const originY = attackerContainer.y;
    const lungeX = originX + (targetContainer.x - originX) * 0.35;
    const lungeY = originY + (targetContainer.y - originY) * 0.35;

    this.scene.tweens.add({
      targets: attackerContainer,
      x: lungeX,
      y: lungeY,
      duration: LUNGE_MS,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: attackerContainer,
          x: originX,
          y: originY,
          duration: LUNGE_MS,
          ease: "Quad.easeOut",
        });
        this.scene.time.delayedCall(HITSTOP_MS, () => {
          this.spawnDamagePopups(actions);
          this.shake(SHAKE_NORMAL_PX);
          this.fadeDeadUnits(actions, onComplete);
        });
      },
    });
  }

  render(state: BattleState): void {
    this.container.removeAll(true);
    this.layout = this.computeLayout();

    this.drawTiles(state);
    this.drawUnits(state);
  }

  private computeLayout(): BoardLayout {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const boardPixels = Math.min(width, height) * LAYOUT.boardFraction;
    const tileSize = Math.floor(boardPixels / Math.max(BOARD_ROWS, BOARD_COLS));
    return {
      originX: Math.round((width - tileSize * BOARD_COLS) / 2),
      originY: Math.round((height - tileSize * BOARD_ROWS) / 2),
      tileSize,
    };
  }

  private drawTiles(state: BattleState): void {
    const { tileSize } = this.layout;

    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const pos = { row, col };
        const center = this.cellCenter(pos);
        const isLight = (row + col) % 2 === 0;
        const tile = this.scene.add
          .rectangle(
            center.x,
            center.y,
            tileSize - 2,
            tileSize - 2,
            isLight ? COLOR.tileLight : COLOR.tileDark,
          )
          .setStrokeStyle(1, COLOR.tileBorder);

        // Only empty cells get tile-level taps; an occupied cell's tap is
        // handled by that unit's own token (drawUnit), avoiding a double
        // dispatch when both happen to sit at the same screen point.
        const occupied = state.units.some((u) => u.position.row === row && u.position.col === col);
        if (this.callbacks && !occupied) {
          tile.setInteractive();
          tile.on("pointerup", () => this.callbacks!.onCellTap(pos));
        }

        this.container.add(tile);
      }
    }
  }

  private drawUnits(state: BattleState): void {
    for (const unit of state.units) {
      this.drawUnit(unit);
    }
  }

  private drawUnit(unit: Unit): void {
    const { tileSize } = this.layout;
    const center = this.cellCenter(unit.position);
    const size = tileSize * LAYOUT.unitFraction;
    const fill = unit.owner === "player" ? COLOR.playerUnit : COLOR.enemyUnit;

    const unitContainer = this.scene.add.container(center.x, center.y).setName(unit.unitId);

    const token = this.scene.add
      .rectangle(0, 0, size, size, fill)
      .setStrokeStyle(2, COLOR.ink);

    const name = this.scene.add
      .text(0, -size * 0.28, unit.definition.displayName, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(tileSize * 0.16)}px`,
        color: TEXT_COLOR.ink,
      })
      .setOrigin(0.5);

    const stats = this.scene.add
      .text(0, size * 0.26, `${unit.definition.attack} / ${unit.currentLife}`, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(tileSize * 0.2)}px`,
        color: TEXT_COLOR.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    unitContainer.add([token, name, stats]);

    if (this.callbacks) {
      token.setInteractive();
      token.on("pointerup", () => this.callbacks!.onUnitTap(unit.unitId, unit.owner, unit.position));
    }

    this.container.add(unitContainer);
  }

  private spawnDamagePopups(actions: BattleAction[]): void {
    for (const action of actions) {
      if (action.type !== "damage" || !action.to || action.amount === undefined) {
        continue;
      }
      const center = this.cellCenter(action.to);
      const text = this.scene.add
        .text(center.x, center.y, `-${action.amount}`, {
          fontFamily: FONT_FAMILY,
          fontSize: "22px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(500);
      this.scene.tweens.add({
        targets: text,
        y: center.y - DAMAGE_POP_RISE_PX,
        alpha: 0,
        duration: DAMAGE_POP_MS,
        ease: "Quad.easeOut",
        onComplete: () => text.destroy(),
      });
    }
  }

  private shake(amplitudePx: number): void {
    const intensity = amplitudePx / Math.max(this.scene.scale.width, this.scene.scale.height);
    this.scene.cameras.main.shake(120, intensity);
  }

  /** Fades any units the action list reports as dead (0.2s), then calls onComplete. */
  private fadeDeadUnits(actions: BattleAction[], onComplete: () => void): void {
    const deathIds = actions.filter((a) => a.type === "death" && a.unitId).map((a) => a.unitId!);
    if (deathIds.length === 0) {
      onComplete();
      return;
    }
    let remaining = deathIds.length;
    const settle = () => {
      remaining -= 1;
      if (remaining === 0) {
        onComplete();
      }
    };
    for (const unitId of deathIds) {
      const unitContainer = this.container.getByName(unitId);
      if (!unitContainer) {
        settle();
        continue;
      }
      this.scene.tweens.add({
        targets: unitContainer,
        alpha: 0,
        duration: DEATH_FADE_MS,
        onComplete: settle,
      });
    }
  }
}
