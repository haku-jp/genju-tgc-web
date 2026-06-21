// Card tap-to-zoom overlay. Per Docs/BATTLE_INTERACTION_SPEC.md §カード拡大:
// tap a hand card -> 0.15s scale-up to ~40% of screen width + dim scrim,
// blocking input behind it; outside tap / re-tap on the card closes it.

import Phaser from "phaser";
import { CardDefinition } from "../core/state";
import { COLOR, FONT_FAMILY, TEXT_COLOR } from "./theme";

const ZOOM_DURATION_MS = 150;
/** Zoomed card width as a fraction of screen width (style guide: ~40%). */
const ZOOM_WIDTH_FRACTION = 0.4;
const CARD_HEIGHT_RATIO = 7 / 5;

export class CardZoomOverlay {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly scrim: Phaser.GameObjects.Rectangle;
  private readonly card: Phaser.GameObjects.Container;
  private isOpen = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(1000).setVisible(false);

    this.scrim = scene.add
      .rectangle(0, 0, 0, 0, 0x000000, 0.6)
      .setOrigin(0)
      .setInteractive()
      .on("pointerdown", () => this.close());
    this.card = scene.add.container(0, 0);
    this.card.setSize(0, 0);

    this.container.add([this.scrim, this.card]);
  }

  show(definition: CardDefinition): void {
    this.layout(definition);
    this.container.setVisible(true);
    this.isOpen = true;
    this.card.setScale(0.4);
    this.scene.tweens.add({
      targets: this.card,
      scale: 1,
      duration: ZOOM_DURATION_MS,
      ease: "Cubic.easeOut",
    });
  }

  close(): void {
    if (!this.isOpen) {
      return;
    }
    this.isOpen = false;
    this.container.setVisible(false);
  }

  private layout(definition: CardDefinition): void {
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    this.scrim.setSize(screenWidth, screenHeight);

    const width = screenWidth * ZOOM_WIDTH_FRACTION;
    const height = width * CARD_HEIGHT_RATIO;
    const x = screenWidth / 2;
    const y = screenHeight / 2;

    this.card.removeAll(true);
    this.card.setPosition(x, y);

    const frame = this.scene.add
      .rectangle(0, 0, width, height, COLOR.panel)
      .setStrokeStyle(3, COLOR.accent)
      .setInteractive()
      .on("pointerdown", () => this.close());

    const cost = this.scene.add
      .text(-width / 2 + width * 0.12, -height / 2 + height * 0.08, `${definition.manaCost}`, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(width * 0.14)}px`,
        color: TEXT_COLOR.accent,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const name = this.scene.add
      .text(0, -height * 0.32, definition.displayName, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(width * 0.11)}px`,
        color: TEXT_COLOR.ink,
        align: "center",
        wordWrap: { width: width * 0.85 },
      })
      .setOrigin(0.5);

    const details = this.scene.add
      .text(
        0,
        0,
        `移動範囲 ${definition.moveRange}\n攻撃範囲 ${definition.attackRange}`,
        {
          fontFamily: FONT_FAMILY,
          fontSize: `${Math.round(width * 0.08)}px`,
          color: TEXT_COLOR.muted,
          align: "center",
        },
      )
      .setOrigin(0.5);

    const stats = this.scene.add
      .text(0, height / 2 - height * 0.1, `${definition.attack} / ${definition.life}`, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(width * 0.13)}px`,
        color: TEXT_COLOR.health,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.card.add([frame, cost, name, details, stats]);
  }
}
