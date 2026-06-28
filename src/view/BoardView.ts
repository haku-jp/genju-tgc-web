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
const TILE_RADIUS = 4;
const DAMAGE_POP_RISE_PX = 18;
const DAMAGE_POP_MS = 500;

export class BoardView {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly highlightContainer: Phaser.GameObjects.Container;
  private readonly callbacks?: BoardViewCallbacks;
  private highlightTween?: Phaser.Tweens.Tween;
  private selectionRingTween?: Phaser.Tweens.Tween;
  private layout: BoardLayout = { originX: 0, originY: 0, tileSize: 0 };
  /** Detached mask-source Graphics for unit icons; not parented, so render() must destroy them itself. */
  private unitMasks: Phaser.GameObjects.Graphics[] = [];

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

  /**
   * Adds a filled glow group without clearing existing groups (T9: move+attack
   * shown together). Attack cells additionally get 4 corner ticks ("target
   * reticle") so they read as dangerous even at a glance, not just red.
   */
  addHighlightGroup(cells: BoardPosition[], color: number, style: "move" | "attack" = "move"): void {
    const { tileSize } = this.layout;
    for (const cell of cells) {
      const center = this.cellCenter(cell);
      const glow = this.scene.add
        .rectangle(center.x, center.y, tileSize * 0.85, tileSize * 0.85, color, 0.35)
        .setStrokeStyle(2, color);
      this.highlightContainer.add(glow);

      if (style === "attack") {
        const half = tileSize * 0.42;
        const tick = tileSize * 0.14;
        const reticle = this.scene.add.graphics();
        reticle.lineStyle(2, color, 0.9);
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
          const cx = center.x + sx * half;
          const cy = center.y + sy * half;
          reticle.beginPath();
          reticle.moveTo(cx, cy - sy * tick);
          reticle.lineTo(cx, cy);
          reticle.lineTo(cx - sx * tick, cy);
          reticle.strokePath();
        }
        this.highlightContainer.add(reticle);
      }
    }
  }

  /** Stroke-only ring marking the currently selected unit's cell, slowly
   * rotating so the selection reads as "active" rather than a static box. */
  drawSelectionRing(pos: BoardPosition): void {
    const { tileSize } = this.layout;
    const center = this.cellCenter(pos);
    const ring = this.scene.add
      .rectangle(center.x, center.y, tileSize * 0.92, tileSize * 0.92, COLOR.selected, 0)
      .setStrokeStyle(3, COLOR.selected);
    this.highlightContainer.add(ring);
    this.selectionRingTween?.stop();
    this.selectionRingTween = this.scene.tweens.add({
      targets: ring,
      angle: 360,
      duration: 6000,
      repeat: -1,
    });
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
    this.addHighlightGroup(attackCells, COLOR.danger, "attack");
    this.startHighlightPulse();
  }

  clearHighlights(): void {
    this.highlightTween?.stop();
    this.selectionRingTween?.stop();
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
    this.unitMasks.forEach((mask) => mask.destroy());
    this.unitMasks = [];
    this.layout = this.computeLayout();

    this.drawTiles(state);
    this.drawBoardFrame();
    this.drawHeadquarters();
    this.drawUnits(state);
  }

  private computeLayout(): BoardLayout {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const trayHeight = height * LAYOUT.handTrayFraction;
    const availableHeight = height - trayHeight;
    const boardPixels = Math.min(width, availableHeight) * LAYOUT.boardFraction;
    const baseTileSize = Math.floor(boardPixels / Math.max(BOARD_ROWS, BOARD_COLS));
    const cardWidth = Phaser.Math.Clamp(width * 0.085, 76, 132);
    const cardHeight = cardWidth * (7 / 5);
    const handTopY = height - 8 - cardHeight * 1.5;
    const hqMargin = 28;
    const minOriginY = hqMargin;
    const maxBoardBottom = handTopY - hqMargin - 8;
    const tileSize = Math.min(
      baseTileSize,
      Math.floor((maxBoardBottom - minOriginY) / BOARD_ROWS),
    );
    const boardH = tileSize * BOARD_ROWS;
    const boardW = tileSize * BOARD_COLS;
    const originX = Math.round((width - boardW) / 2);
    const baseOriginY = Math.round((availableHeight - tileSize * BOARD_ROWS) / 2);
    // Narrow screens put the board under the HUD column; keep HQ labels below it.
    const overlapsHud = originX < 226;
    const hudClearOriginY = overlapsHud ? 178 : minOriginY;
    const maxOriginY = Math.round(maxBoardBottom - boardH);
    const originY = Phaser.Math.Clamp(baseOriginY, hudClearOriginY, maxOriginY);
    return {
      originX,
      originY,
      tileSize,
    };
  }

  private drawTiles(state: BattleState): void {
    const { tileSize } = this.layout;
    const w = tileSize - 2;
    const h = tileSize - 2;

    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const pos = { row, col };
        const center = this.cellCenter(pos);
        const isLight = (row + col) % 2 === 0;
        const zoneTint =
          row <= 1 ? COLOR.danger : row >= 4 ? COLOR.accent : undefined;

        const tile = this.scene.add.graphics();
        const left = center.x - w / 2;
        const top = center.y - h / 2;
        tile.fillStyle(isLight ? COLOR.tileLight : COLOR.tileDark, 0.45);
        tile.fillRoundedRect(left, top, w, h, TILE_RADIUS);
        if (zoneTint !== undefined) {
          tile.fillStyle(zoneTint, 0.1);
          tile.fillRoundedRect(left, top, w, h, TILE_RADIUS);
        }
        tile.lineStyle(1, COLOR.tileBorder, 1);
        tile.strokeRoundedRect(left, top, w, h, TILE_RADIUS);

        const topHighlight = this.scene.add
          .rectangle(center.x, top + 1, w, 2, COLOR.muted)
          .setAlpha(0.25);
        const bottomShadow = this.scene.add
          .rectangle(center.x, top + h - 1, w, 3, COLOR.bgDeep)
          .setAlpha(0.5);
        const rightShadow = this.scene.add
          .rectangle(left + w - 1, center.y, 3, h, COLOR.bgDeep)
          .setAlpha(0.5);

        // Only empty cells get tile-level taps; an occupied cell's tap is
        // handled by that unit's own token (drawUnit), avoiding a double
        // dispatch when both happen to sit at the same screen point.
        const occupied = state.units.some((u) => u.position.row === row && u.position.col === col);
        const hitArea = this.scene.add.rectangle(center.x, center.y, w, h, 0xffffff, 0);
        if (this.callbacks && !occupied) {
          hitArea.setInteractive();
          hitArea.on("pointerup", () => this.callbacks!.onCellTap(pos));
        }

        this.container.add([tile, topHighlight, bottomShadow, rightShadow, hitArea]);
      }
    }
  }

  /** Decorative frame around the whole board (gold, low alpha) plus small
   * corner ornaments so the frame reads as a forged plate, not a plain box. */
  private drawBoardFrame(): void {
    const { originX, originY, tileSize } = this.layout;
    const boardW = tileSize * BOARD_COLS;
    const boardH = tileSize * BOARD_ROWS;
    const frame = this.scene.add
      .rectangle(originX + boardW / 2, originY + boardH / 2, boardW, boardH, COLOR.hq, 0)
      .setStrokeStyle(2, COLOR.hq, 0.5);
    this.container.add(frame);

    const corners = [
      { x: originX, y: originY },
      { x: originX + boardW, y: originY },
      { x: originX, y: originY + boardH },
      { x: originX + boardW, y: originY + boardH },
    ];
    const ornamentSize = Math.max(8, tileSize * 0.16);
    for (const corner of corners) {
      const diamond = this.scene.add
        .rectangle(corner.x, corner.y, ornamentSize, ornamentSize, COLOR.hq, 0)
        .setStrokeStyle(2, COLOR.hq, 0.6)
        .setAngle(45);
      this.container.add(diamond);
    }
  }

  private drawHeadquarters(): void {
    const { originX, originY, tileSize } = this.layout;
    const boardW = tileSize * BOARD_COLS;
    const cx = originX + boardW / 2;
    const topY = originY;
    const bottomY = originY + tileSize * BOARD_ROWS;
    const enemyLine = this.scene.add
      .rectangle(cx, topY - 6, boardW * 0.5, 3, COLOR.hq)
      .setAlpha(0.75);
    const enemyLabel = this.scene.add
      .text(cx, topY - 20, "敵本陣", {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        color: TEXT_COLOR.hq,
      })
      .setOrigin(0.5);
    const playerLine = this.scene.add
      .rectangle(cx, bottomY + 6, boardW * 0.5, 3, COLOR.hq)
      .setAlpha(0.75);
    const playerLabel = this.scene.add
      .text(cx, bottomY + 20, "自本陣", {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        color: TEXT_COLOR.hq,
      })
      .setOrigin(0.5);

    this.container.add([enemyLine, enemyLabel, playerLine, playerLabel]);
  }

  private drawUnits(state: BattleState): void {
    for (const unit of state.units) {
      this.drawUnit(unit);
    }
  }

  /**
   * Unit token: a masked circular monster icon (cropped from the card art)
   * with backdrop/ring/name/stats/acted-state as separate layers, instead of
   * the old name-in-a-rectangle "shogi piece" look.
   */
  private drawUnit(unit: Unit): void {
    const { tileSize } = this.layout;
    const center = this.cellCenter(unit.position);
    const radius = (tileSize * LAYOUT.unitFraction) / 2;
    const ownerFill = unit.owner === "player" ? COLOR.playerUnit : COLOR.enemyUnit;
    const ringColor = unit.owner === "player" ? COLOR.accent : COLOR.danger;

    const unitContainer = this.scene.add.container(center.x, center.y).setName(unit.unitId);
    const layers: Phaser.GameObjects.GameObject[] = [];

    const backdrop = this.scene.add.circle(0, 0, radius, ownerFill);
    layers.push(backdrop);

    const iconKey = unit.definition.cardId;
    if (this.scene.textures.exists(iconKey)) {
      // Mask source must be a detached Graphics (make.graphics(.., false), not
      // add.graphics()) drawn in world coords - a mask parented into the same
      // container as the masked image does not clip correctly in Phaser 3.90.
      const mask = this.scene.make.graphics(undefined, false);
      mask.fillStyle(0xffffff, 1);
      mask.fillCircle(center.x, center.y, radius - 1);
      this.unitMasks.push(mask);
      const icon = this.scene.add.image(0, 0, iconKey);
      const source = icon.texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
      const srcWidth = source.width || icon.width;
      const srcHeight = source.height || icon.height;
      icon.setScale((radius * 2) / Math.min(srcWidth, srcHeight));
      icon.setMask(mask.createGeometryMask());
      layers.push(icon);
    }

    const ring = this.scene.add.circle(0, 0, radius, 0x000000, 0).setStrokeStyle(2, ringColor, 1);
    layers.push(ring);

    const name = this.scene.add
      .text(0, radius + 3, unit.definition.displayName, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(tileSize * 0.12)}px`,
        color: TEXT_COLOR.muted,
      })
      .setOrigin(0.5, 0);
    layers.push(name);

    const statBadge = this.scene.add
      .rectangle(radius * 0.62, radius * 0.62, tileSize * 0.4, tileSize * 0.2, COLOR.bgDeep, 0.85)
      .setStrokeStyle(1, COLOR.ink, 0.5);
    const statText = this.scene.add
      .text(radius * 0.62, radius * 0.62, `${unit.definition.attack}/${unit.currentLife}`, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(tileSize * 0.14)}px`,
        color: TEXT_COLOR.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    layers.push(statBadge, statText);

    if (unit.hasAttackedThisTurn) {
      layers.push(this.scene.add.circle(0, 0, radius, 0x000000, 0.45));
    }

    unitContainer.add(layers);

    if (this.callbacks) {
      backdrop.setInteractive(new Phaser.Geom.Circle(0, 0, radius), Phaser.Geom.Circle.Contains);
      backdrop.on("pointerup", () => this.callbacks!.onUnitTap(unit.unitId, unit.owner, unit.position));
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
