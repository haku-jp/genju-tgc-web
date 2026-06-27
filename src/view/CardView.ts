import Phaser from "phaser";
import { HandCard } from "../core/state";
import { COLOR, FONT_FAMILY, RARITY_COLOR, TEXT_COLOR } from "./theme";

const RETURN_DURATION_MS = 200;
const SHRINK_DURATION_MS = 250;
const DRAG_SCALE = 1.1;
const ART_INSET_RATIO = 0.05;
const DRAG_THRESHOLD_PX = 6;
/** Fraction of card height the art occupies before the name banner overlaps it. */
const ART_HEIGHT_FRACTION = 0.58;
/**
 * Max characters shown in the rules-text plate. The plate's height and the
 * font size both scale with card width, so the number of lines that fit is
 * scale-invariant - this cap holds at any hand-card size. Long text is
 * truncated with "…"; the full text is still available via tap-to-zoom
 * (CardZoomOverlay), so nothing is lost, just not crammed into a 100px card.
 */
const RULES_TEXT_MAX_CHARS = 34;

function rarityColorOf(definition: HandCard["definition"]): number {
  const rarity = definition.rarity as keyof typeof RARITY_COLOR | undefined;
  return rarity && RARITY_COLOR[rarity] !== undefined ? RARITY_COLOR[rarity] : RARITY_COLOR.S;
}

function truncateRulesText(text: string): string {
  return text.length > RULES_TEXT_MAX_CHARS ? `${text.slice(0, RULES_TEXT_MAX_CHARS)}…` : text;
}

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
    const rarityColor = rarityColorOf(definition);
    const rulesText = (definition.rulesText as string | undefined) ?? "";

    const artBottom = -height / 2 + height * ART_HEIGHT_FRACTION;
    const base = this.scene.add.rectangle(0, 0, width, height, COLOR.panel);
    const visualObjects: Phaser.GameObjects.GameObject[] = [base];

    if (hasArt) {
      const art = this.scene.add.image(0, -height / 2 + (height * ART_HEIGHT_FRACTION) / 2, definition.cardId);
      const maxWidth = width * (1 - ART_INSET_RATIO * 2);
      const maxHeight = height * ART_HEIGHT_FRACTION;
      const scale = Math.max(maxWidth / art.width, maxHeight / art.height);
      art.setScale(scale);
      visualObjects.push(art);
    }

    // Rules-text plate: everything below the art/name banner.
    const textPlate = this.scene.add
      .rectangle(0, (artBottom + height / 2) / 2, width * 0.94, height / 2 - artBottom - 4, 0x05070a, 0.78)
      .setStrokeStyle(1, rarityColor, 0.4);
    visualObjects.push(textPlate);

    // Name banner: overlaps the bottom edge of the art.
    const nameBanner = this.scene.add
      .rectangle(0, artBottom, width, height * 0.13, 0x05070a, 0.88)
      .setStrokeStyle(1, rarityColor, 0.6);
    visualObjects.push(nameBanner);

    const frame = this.scene.add.rectangle(0, 0, width, height).setStrokeStyle(3, rarityColor);

    // Cost gem: a rotated-square "diamond" in the top-left corner.
    const costX = -width / 2 + width * 0.14;
    const costY = -height / 2 + height * 0.1;
    const costGem = this.scene.add
      .rectangle(costX, costY, width * 0.2, width * 0.2, COLOR.accent)
      .setStrokeStyle(2, COLOR.ink)
      .setAngle(45);
    const cost = this.scene.add
      .text(costX, costY, `${definition.manaCost}`, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(width * 0.16)}px`,
        color: TEXT_COLOR.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const name = this.scene.add
      .text(0, artBottom, definition.displayName, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(width * 0.12)}px`,
        color: "#f7efe0",
        align: "center",
        wordWrap: { width: width * 0.85 },
      })
      .setOrigin(0.5);

    const rulesDisplay = rulesText ? truncateRulesText(rulesText) : `${definition.attack} / ${definition.life}`;
    const rules = this.scene.add
      .text(0, (artBottom + height / 2) / 2, rulesDisplay, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(width * 0.095)}px`,
        color: TEXT_COLOR.muted,
        align: "center",
        wordWrap: { width: width * 0.82 },
      })
      .setOrigin(0.5);

    // ATK/HP gems: small circular badges in the bottom corners.
    const atkGem = this.scene.add.circle(-width / 2 + width * 0.16, height / 2 - height * 0.08, width * 0.13, COLOR.danger);
    const atkText = this.scene.add
      .text(atkGem.x, atkGem.y, `${definition.attack}`, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(width * 0.13)}px`,
        color: TEXT_COLOR.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const hpGem = this.scene.add.circle(width / 2 - width * 0.16, height / 2 - height * 0.08, width * 0.13, COLOR.playerUnit);
    const hpText = this.scene.add
      .text(hpGem.x, hpGem.y, `${definition.life}`, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(width * 0.13)}px`,
        color: TEXT_COLOR.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.container.add([
      ...visualObjects,
      frame,
      costGem,
      cost,
      name,
      rules,
      atkGem,
      atkText,
      hpGem,
      hpText,
    ]);
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
