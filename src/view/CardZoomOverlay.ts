import Phaser from "phaser";
import { CardDefinition } from "../core/state";
import { CARD_BY_ID } from "../data/cards";
import { COLOR, FONT_FAMILY, TEXT_COLOR } from "./theme";

const ZOOM_DURATION_MS = 150;
const ZOOM_WIDTH_FRACTION = 0.4;
const CARD_HEIGHT_RATIO = 7 / 5;

function formatMove(definition: CardDefinition): string {
  if (definition.move.options.length === 0) {
    return "Move: none";
  }
  return `Move: ${definition.move.options
    .map((option) => `${option.dirs} ${option.range}${option.pass ? ` pass ${option.pass}` : ""}`)
    .join(" / ")}`;
}

function formatAttack(definition: CardDefinition): string {
  const profile = definition.attackProfile;
  return `Attack: ${profile.pattern} ${profile.range}${profile.dirs ? ` ${profile.dirs}` : ""}`;
}

function wrapLongLine(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) {
    return [line];
  }
  const chunks: string[] = [];
  for (let i = 0; i < line.length; i += maxChars) {
    chunks.push(line.slice(i, i + maxChars));
  }
  return chunks;
}

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

    const width = Math.min(screenWidth * 0.86, Math.max(260, screenWidth * ZOOM_WIDTH_FRACTION));
    const height = width * CARD_HEIGHT_RATIO;
    const x = screenWidth / 2;
    const y = screenHeight / 2;
    const catalog = CARD_BY_ID[definition.cardId];
    const hasArt = this.scene.textures.exists(definition.cardId);

    this.card.removeAll(true);
    this.card.setPosition(x, y);

    const frame = this.scene.add
      .rectangle(0, 0, width, height, COLOR.panel)
      .setStrokeStyle(3, COLOR.accent)
      .setInteractive()
      .on("pointerdown", () => this.close());
    const artPanel = this.scene.add.rectangle(0, -height * 0.22, width * 0.88, height * 0.43, 0x05070a, 0.5);
    const objects: Phaser.GameObjects.GameObject[] = [frame, artPanel];

    if (hasArt) {
      const art = this.scene.add.image(0, -height * 0.22, definition.cardId);
      const maxWidth = width * 0.84;
      const maxHeight = height * 0.4;
      const scale = Math.min(maxWidth / art.width, maxHeight / art.height);
      art.setScale(scale);
      objects.push(art);
    }

    const cost = this.scene.add
      .text(-width / 2 + width * 0.12, -height / 2 + height * 0.08, `${definition.manaCost}`, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(width * 0.14)}px`,
        color: TEXT_COLOR.accent,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const name = this.scene.add
      .text(0, -height * 0.45, catalog?.name ?? definition.displayName, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(width * 0.105)}px`,
        color: TEXT_COLOR.ink,
        align: "center",
        wordWrap: { width: width * 0.82 },
      })
      .setOrigin(0.5);

    const meta = catalog
      ? [
          `Cost ${catalog.cost}  ${catalog.type.toUpperCase()}  ${catalog.rarity}`,
          `ATK ${catalog.attack ?? definition.attack} / HP ${catalog.health ?? definition.life}`,
          ...(catalog.piece ? wrapLongLine(`Piece: ${catalog.piece}`, 30) : []),
          ...(catalog.movement ? wrapLongLine(`Move: ${catalog.movement}`, 34) : []),
          ...wrapLongLine(catalog.rulesText, 36),
        ]
      : [
          `Cost ${definition.manaCost}`,
          `ATK ${definition.attack} / HP ${definition.life}`,
          formatMove(definition),
          formatAttack(definition),
        ];

    const details = this.scene.add
      .text(-width * 0.39, height * 0.04, meta.join("\n"), {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(width * 0.045)}px`,
        color: TEXT_COLOR.muted,
        align: "left",
        wordWrap: { width: width * 0.78, useAdvancedWrap: true },
        lineSpacing: 4,
      })
      .setOrigin(0, 0);
    details.setFixedSize(width * 0.78, height * 0.33);

    const stats = this.scene.add
      .text(0, height / 2 - height * 0.08, `${definition.attack} / ${definition.life}`, {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(width * 0.13)}px`,
        color: TEXT_COLOR.health,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.card.add([...objects, cost, name, details, stats]);
  }
}
