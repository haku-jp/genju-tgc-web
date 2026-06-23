import Phaser from "phaser";
import { HandCard } from "../core/state";
import { COLOR, FONT_FAMILY, TEXT_COLOR } from "./theme";

const RETURN_DURATION_MS = 200;
const SHRINK_DURATION_MS = 250;
const DRAG_SCALE = 1.1;
const ART_INSET_RATIO = 0.05;
const DRAG_THRESHOLD_PX = 6;

export interface CardViewCallbacks {
  onTap(handCard: HandCard, handIndex: number): void;
  onDragStart(handIndex: number): void;
  onDragMove(handIndex: number, screenX: number, screenY: number): void;
  onDragEnd(card: CardView, handIndex: number, screenX: number, screenY: number): void;
}

export class CardView {
  private static pointerOwner: CardView | null = null;

  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly handCard: HandCard;
  private readonly handIndex: number;
  private readonly callbacks: CardViewCallbacks;
  private readonly originX: number;
  private readonly originY: number;
  private readonly originAngle: number;
  private readonly width: number;
  private readonly height: number;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private isPointerDown = false;
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
    this.width = layout.width;
    this.height = layout.height;

    this.container = scene.add.container(layout.x, layout.y);
    this.container.setAngle(layout.angleDeg);
    this.buildVisual(layout.width, layout.height);
    this.bindInput();
  }

  private buildVisual(width: number, height: number): void {
    const definition = this.handCard.definition;
    const hasArt = this.scene.textures.exists(definition.cardId);
    const base = this.scene.add.rectangle(0, 0, width, height, COLOR.panel);
    const visualObjects: Phaser.GameObjects.GameObject[] = [base];

    if (hasArt) {
      const art = this.scene.add.image(0, -height * 0.02, definition.cardId);
      const maxWidth = width * (1 - ART_INSET_RATIO * 2);
      const maxHeight = height * 0.86;
      const scale = Math.min(maxWidth / art.width, maxHeight / art.height);
      art.setScale(scale);
      visualObjects.push(art);
    }

    const topBand = this.scene.add.rectangle(
      0,
      -height / 2 + height * 0.16,
      width,
      height * 0.32,
      0x05070a,
      hasArt ? 0.72 : 0,
    );
    const bottomBand = this.scene.add.rectangle(
      0,
      height / 2 - height * 0.12,
      width,
      height * 0.24,
      0x05070a,
      hasArt ? 0.72 : 0,
    );
    const frame = this.scene.add.rectangle(0, 0, width, height).setStrokeStyle(2, COLOR.accent);

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
        color: hasArt ? "#f7efe0" : TEXT_COLOR.ink,
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

    this.container.add([...visualObjects, topBand, bottomBand, frame, cost, name, stats]);
  }

  private bindInput(): void {
    this.scene.input.on("pointerdown", this.handlePointerDown, this);
    this.scene.input.on("pointermove", this.handlePointerMove, this);
    this.scene.input.on("pointerup", this.handlePointerUp, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (CardView.pointerOwner || !this.contains(pointer.x, pointer.y)) {
      return;
    }
    CardView.pointerOwner = this;
    this.isPointerDown = true;
    this.wasDragged = false;
    this.pointerDownX = pointer.x;
    this.pointerDownY = pointer.y;
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (CardView.pointerOwner !== this || !this.isPointerDown) {
      return;
    }
    const distance = Phaser.Math.Distance.Between(this.pointerDownX, this.pointerDownY, pointer.x, pointer.y);
    if (!this.wasDragged && distance < DRAG_THRESHOLD_PX) {
      return;
    }
    if (!this.wasDragged) {
      this.wasDragged = true;
      this.container.setAngle(0);
      this.container.setScale(DRAG_SCALE);
      this.container.setDepth(2000);
      this.callbacks.onDragStart(this.handIndex);
    }
    this.container.setPosition(pointer.x, pointer.y);
    this.callbacks.onDragMove(this.handIndex, pointer.x, pointer.y);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (CardView.pointerOwner !== this || !this.isPointerDown) {
      return;
    }
    this.isPointerDown = false;
    CardView.pointerOwner = null;

    if (this.wasDragged) {
      this.callbacks.onDragEnd(this, this.handIndex, pointer.x, pointer.y);
      return;
    }
    this.callbacks.onTap(this.handCard, this.handIndex);
  }

  private contains(screenX: number, screenY: number): boolean {
    const angle = Phaser.Math.DegToRad(this.container.angle);
    const dx = screenX - this.container.x;
    const dy = screenY - this.container.y;
    const localX = dx * Math.cos(-angle) - dy * Math.sin(-angle);
    const localY = dx * Math.sin(-angle) + dy * Math.cos(-angle);
    return Math.abs(localX) <= (this.width * this.container.scaleX) / 2
      && Math.abs(localY) <= (this.height * this.container.scaleY) / 2;
  }

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

  shrinkAndDestroy(onComplete: () => void): void {
    this.scene.tweens.add({
      targets: this.container,
      scale: 0,
      y: this.container.y + 40,
      alpha: 0,
      duration: SHRINK_DURATION_MS,
      ease: "Quad.easeIn",
      onComplete: () => {
        if (CardView.pointerOwner === this) {
          CardView.pointerOwner = null;
        }
        this.container.destroy();
        onComplete();
      },
    });
  }

  destroy(): void {
    if (CardView.pointerOwner === this) {
      CardView.pointerOwner = null;
    }
    this.scene.input.off("pointerdown", this.handlePointerDown, this);
    this.scene.input.off("pointermove", this.handlePointerMove, this);
    this.scene.input.off("pointerup", this.handlePointerUp, this);
    this.container.destroy();
  }
}
