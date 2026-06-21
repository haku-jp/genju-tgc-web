// A single hand card's visual + input. Tap opens the zoom overlay; drag
// starts a summon attempt (Docs/BATTLE_INTERACTION_SPEC.md §召喚). Phaser's
// drag plugin only fires "dragstart" once the pointer moves past its
// threshold, so a plain tap (no movement) naturally falls through to the
// "pointerup without drag" path instead.

import Phaser from "phaser";
import { HandCard } from "../core/state";
import { COLOR, FONT_FAMILY, TEXT_COLOR } from "./theme";

const RETURN_DURATION_MS = 200;
const SHRINK_DURATION_MS = 250;
const DRAG_SCALE = 1.1;

export interface CardViewCallbacks {
  onTap(handCard: HandCard, handIndex: number): void;
  onDragStart(handIndex: number): void;
  onDragMove(handIndex: number, screenX: number, screenY: number): void;
  onDragEnd(card: CardView, handIndex: number, screenX: number, screenY: number): void;
}

export class CardView {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly handCard: HandCard;
  private readonly handIndex: number;
  private readonly callbacks: CardViewCallbacks;
  private readonly originX: number;
  private readonly originY: number;
  private readonly originAngle: number;
  private wasDragged = false;

  constructor(
    scene: Phaser.Scene,
    handCard: HandCard,
    handIndex: number,
    layout: { x: number; y: number; angleDeg: number; width: number; height: number },
    callbacks: CardViewCallbacks,
  ) {
    this.scene = scene;
    this.handCard = handCard;
    this.handIndex = handIndex;
    this.callbacks = callbacks;
    this.originX = layout.x;
    this.originY = layout.y;
    this.originAngle = layout.angleDeg;

    this.container = scene.add.container(layout.x, layout.y);
    this.container.setAngle(layout.angleDeg);
    this.buildVisual(layout.width, layout.height);
  }

  private buildVisual(width: number, height: number): void {
    const definition = this.handCard.definition;

    const frame = this.scene.add
      .rectangle(0, 0, width, height, COLOR.panel)
      .setStrokeStyle(2, COLOR.accent)
      .setInteractive({ draggable: true });

    const cost = this.scene.add
      .text(-width / 2 + width * 0.12, -height / 2 + height * 0.1, `${definition.manaCost}`, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(width * 0.18)}px`,
        color: TEXT_COLOR.accent,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const name = this.scene.add
      .text(0, -height * 0.1, definition.displayName, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(width * 0.13)}px`,
        color: TEXT_COLOR.ink,
        align: "center",
        wordWrap: { width: width * 0.85 },
      })
      .setOrigin(0.5);

    const stats = this.scene.add
      .text(0, height / 2 - height * 0.1, `${definition.attack} / ${definition.life}`, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(width * 0.16)}px`,
        color: TEXT_COLOR.health,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.container.add([frame, cost, name, stats]);

    frame.on("pointerup", () => {
      if (this.wasDragged) {
        this.wasDragged = false;
        return;
      }
      this.callbacks.onTap(this.handCard, this.handIndex);
    });

    frame.on("dragstart", () => {
      this.wasDragged = true;
      this.container.setAngle(0);
      this.container.setScale(DRAG_SCALE);
      this.container.setDepth(2000);
      this.callbacks.onDragStart(this.handIndex);
    });

    frame.on("drag", (pointer: Phaser.Input.Pointer) => {
      // Use world-space pointer coordinates, not the drag-event x/y (those
      // are in the dragged object's parent/local space, i.e. relative to
      // this card's own container — not what we want for moving the card).
      this.container.setPosition(pointer.x, pointer.y);
      this.callbacks.onDragMove(this.handIndex, pointer.x, pointer.y);
    });

    frame.on("dragend", (pointer: Phaser.Input.Pointer) => {
      this.callbacks.onDragEnd(this, this.handIndex, pointer.x, pointer.y);
    });
  }

  /** Failed drop: ease back to the hand position (EASE_DEFAULT, 0.2s). */
  returnToOrigin(): void {
    this.scene.tweens.add({
      targets: this.container,
      x: this.originX,
      y: this.originY,
      angle: this.originAngle,
      scale: 1,
      duration: RETURN_DURATION_MS,
      ease: "Quad.easeOut",
    });
  }

  /** Successful drop: shrink + fall away, then invoke onComplete (0.25s). */
  shrinkAndDestroy(onComplete: () => void): void {
    this.scene.tweens.add({
      targets: this.container,
      scale: 0,
      y: this.container.y + 40,
      alpha: 0,
      duration: SHRINK_DURATION_MS,
      ease: "Quad.easeIn",
      onComplete: () => {
        this.container.destroy();
        onComplete();
      },
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
