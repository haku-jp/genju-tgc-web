import Phaser from "phaser";
import { CardDefinition } from "../core/state";
import { CARD_BY_ID, type CardDef } from "../data/cards";
import { FONT_BODY, FONT_NUM, FONT_TITLE, TEXT_COLOR } from "./theme";

const ZOOM_DURATION_MS = 150;
const ZOOM_WIDTH_FRACTION = 0.42;
const CARD_HEIGHT_RATIO = 7 / 5;

const FRAME_BG = 0x11151d;
const TITLE_BG = 0x1b2331;
const ART_BG = 0x141a24;
const RULES_BG = 0x20242c;
const INNER_BORDER = 0x2a3344;
const COST_BG = 0x3da9fc;
const STAT_BG = 0x7a2330;

const RARITY_EDGE: Record<string, number> = {
  I: 0xf2e3b3,
  L: 0xe8c870,
  R: 0x3da9fc,
  S: 0x8b97a6,
};

const TYPE_NAME: Record<string, string> = {
  genju: "幻獣",
  spell: "魔術",
  equip: "装備",
};

interface DisplayCard {
  name: string;
  cost: number;
  type: string;
  rarity: string;
  attack?: number;
  health?: number;
  piece?: string;
  rulesText: string;
  flavorText?: string;
}

export class CardZoomOverlay {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly scrim: Phaser.GameObjects.Rectangle;
  private readonly card: Phaser.GameObjects.Container;
  private readonly masks: Phaser.GameObjects.Graphics[] = [];
  private isOpen = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(1000).setVisible(false);

    this.scrim = scene.add
      .rectangle(0, 0, 0, 0, 0x000000, 0.62)
      .setOrigin(0)
      .setInteractive()
      .on("pointerdown", () => this.close());
    this.card = scene.add.container(0, 0);
    this.card.setSize(0, 0);

    this.container.add([this.scrim, this.card]);
    this.scene.input.on("pointerdown", () => {
      if (this.isOpen) {
        this.close();
      }
    });
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
    const cardTop = -height / 2;
    const cardLeft = -width / 2;
    const display = this.displayCard(definition);
    const edgeColor = RARITY_EDGE[display.rarity] ?? RARITY_EDGE.S;
    const isGenju = display.type === "genju";

    this.card.removeAll(true);
    this.masks.splice(0).forEach((mask) => mask.destroy());
    const cardX = screenWidth / 2;
    const cardY = screenHeight / 2;
    this.card.setPosition(cardX, cardY);

    const frame = this.scene.add.graphics();
    frame.fillStyle(FRAME_BG, 1);
    frame.fillRoundedRect(cardLeft, cardTop, width, height, 12);
    frame.lineStyle(3, edgeColor, 1);
    frame.strokeRoundedRect(cardLeft, cardTop, width, height, 12);
    frame.fillStyle(TITLE_BG, 1);
    frame.fillRoundedRect(cardLeft + width * 0.03, cardTop + height * 0.025, width * 0.94, height * 0.11, 8);
    frame.setInteractive(
      new Phaser.Geom.Rectangle(cardLeft, cardTop, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    frame.on("pointerdown", () => this.close());

    const title = this.scene.add.text(cardLeft + width * 0.07, cardTop + height * 0.08, display.name, {
      fontFamily: FONT_TITLE,
      fontSize: `${Math.round(width * 0.078)}px`,
      color: TEXT_COLOR.ink,
      fontStyle: "700",
    });
    title.setOrigin(0, 0.5);
    this.fitTextToWidth(title, width * 0.68, width * 0.078, width * 0.045);

    const costRadius = width * 0.07;
    const costX = cardLeft + width * 0.89;
    const costY = cardTop + height * 0.08;
    const costGem = this.scene.add.graphics();
    costGem.fillStyle(COST_BG, 1);
    costGem.fillCircle(costX, costY, costRadius);
    costGem.lineStyle(2, 0xffffff, 0.85);
    costGem.strokeCircle(costX, costY, costRadius);
    const cost = this.scene.add.text(costX, costY + costRadius * 0.03, `${display.cost}`, {
      fontFamily: FONT_NUM,
      fontSize: `${Math.round(width * 0.078)}px`,
      color: "#ffffff",
      fontStyle: "700",
      stroke: "#11151d",
      strokeThickness: Math.max(2, Math.round(width * 0.007)),
    });
    cost.setOrigin(0.5);

    const artX = cardLeft + width * 0.06;
    const artY = cardTop + height * 0.13;
    const artW = width * 0.88;
    const artH = height * 0.46;
    const artFrame = this.scene.add.graphics();
    artFrame.fillStyle(ART_BG, 1);
    artFrame.fillRect(artX, artY, artW, artH);
    artFrame.lineStyle(2, INNER_BORDER, 1);
    artFrame.strokeRect(artX, artY, artW, artH);
    const artObjects = this.createArt(definition, artX, artY, artW, artH, cardX, cardY);

    const typeY = artY + artH;
    const typeLine = this.scene.add.graphics();
    typeLine.fillStyle(TITLE_BG, 1);
    typeLine.fillRect(artX, typeY, artW, height * 0.05);
    typeLine.lineStyle(1, INNER_BORDER, 1);
    typeLine.strokeRect(artX, typeY, artW, height * 0.05);
    const typeText = this.scene.add.text(artX + width * 0.025, typeY + height * 0.025, this.typeLine(display), {
      fontFamily: FONT_BODY,
      fontSize: `${Math.round(width * 0.037)}px`,
      color: TEXT_COLOR.muted,
      fontStyle: "600",
    });
    typeText.setOrigin(0, 0.5);
    this.fitTextToWidth(typeText, artW - width * 0.05, width * 0.037, width * 0.026);

    const rulesX = artX;
    const rulesY = typeY + height * 0.055;
    const rulesW = artW;
    const rulesH = cardTop + height * 0.88 - rulesY;
    const rules = this.scene.add.graphics();
    rules.fillStyle(RULES_BG, 1);
    rules.fillRoundedRect(rulesX, rulesY, rulesW, rulesH, 7);
    rules.lineStyle(1, INNER_BORDER, 1);
    rules.strokeRoundedRect(rulesX, rulesY, rulesW, rulesH, 7);

    const textObjects = this.createRulesText(display, rulesX, rulesY, rulesW, rulesH, width);
    const statObjects = isGenju ? this.createStats(display, cardLeft, cardTop, width, height) : [];

    this.card.add([
      frame,
      title,
      costGem,
      cost,
      artFrame,
      ...artObjects,
      typeLine,
      typeText,
      rules,
      ...textObjects,
      ...statObjects,
    ]);
  }

  private createArt(
    definition: CardDefinition,
    artX: number,
    artY: number,
    artW: number,
    artH: number,
    cardX: number,
    cardY: number,
  ): Phaser.GameObjects.GameObject[] {
    if (!this.scene.textures.exists(definition.cardId)) {
      const noArt = this.scene.add.text(artX + artW / 2, artY + artH / 2, "No Art", {
        fontFamily: FONT_BODY,
        fontSize: `${Math.round(artW * 0.08)}px`,
        color: TEXT_COLOR.muted,
      });
      noArt.setOrigin(0.5);
      return [noArt];
    }

    const art = this.scene.add.image(artX + artW / 2, artY + artH / 2, definition.cardId);
    art.setScale(Math.max(artW / art.width, artH / art.height));
    const maskShape = this.scene.add.graphics();
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(cardX + artX, cardY + artY, artW, artH);
    maskShape.setVisible(false);
    art.setMask(maskShape.createGeometryMask());
    this.masks.push(maskShape);
    return [art];
  }

  private createRulesText(
    display: DisplayCard,
    x: number,
    y: number,
    width: number,
    height: number,
    cardWidth: number,
  ): Phaser.GameObjects.GameObject[] {
    const pad = cardWidth * 0.028;
    const textWidth = width - pad * 2;
    const rulesText = this.wrapByChars(display.rulesText || "", 24).join("\n");
    const rules = this.scene.add.text(x + pad, y + pad, rulesText, {
      fontFamily: FONT_BODY,
      fontSize: `${Math.round(cardWidth * 0.05)}px`,
      color: TEXT_COLOR.ink,
      wordWrap: { width: textWidth, useAdvancedWrap: true },
      lineSpacing: 3,
    });
    rules.setOrigin(0, 0);
    this.fitTextToBox(rules, textWidth, height - pad * 2, cardWidth * 0.05, cardWidth * 0.032);

    const objects: Phaser.GameObjects.GameObject[] = [rules];
    const remaining = height - pad * 2 - rules.height - pad * 0.7;
    if (display.flavorText && remaining > cardWidth * 0.09) {
      const flavor = this.scene.add.text(x + pad, y + pad + rules.height + pad * 0.7, this.wrapByChars(display.flavorText, 28).join("\n"), {
        fontFamily: FONT_BODY,
        fontSize: `${Math.round(cardWidth * 0.032)}px`,
        color: TEXT_COLOR.muted,
        fontStyle: "italic",
        wordWrap: { width: textWidth, useAdvancedWrap: true },
        lineSpacing: 2,
      });
      flavor.setOrigin(0, 0);
      this.fitTextToBox(flavor, textWidth, remaining, cardWidth * 0.032, cardWidth * 0.026);
      objects.push(flavor);
    }
    return objects;
  }

  private createStats(
    display: DisplayCard,
    cardLeft: number,
    cardTop: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.GameObject[] {
    const statW = width * 0.26;
    const statH = height * 0.1;
    const statX = cardLeft + width * 0.68;
    const statY = cardTop + height * 0.875;
    const box = this.scene.add.graphics();
    box.fillStyle(STAT_BG, 1);
    box.fillRoundedRect(statX, statY, statW, statH, 8);
    box.lineStyle(2, 0xffffff, 0.7);
    box.strokeRoundedRect(statX, statY, statW, statH, 8);
    const stats = this.scene.add.text(statX + statW / 2, statY + statH / 2, `${display.attack ?? 0} / ${display.health ?? 0}`, {
      fontFamily: FONT_NUM,
      fontSize: `${Math.round(width * 0.07)}px`,
      color: "#ffffff",
      fontStyle: "700",
      stroke: "#11151d",
      strokeThickness: Math.max(2, Math.round(width * 0.006)),
    });
    stats.setOrigin(0.5);
    return [box, stats];
  }

  private displayCard(definition: CardDefinition): DisplayCard {
    const catalog = CARD_BY_ID[definition.cardId] as CardDef | undefined;
    if (catalog) {
      return {
        name: catalog.name,
        cost: catalog.cost,
        type: catalog.type,
        rarity: catalog.rarity,
        attack: catalog.attack,
        health: catalog.health,
        piece: catalog.piece,
        rulesText: catalog.rulesText,
        flavorText: catalog.flavorText,
      };
    }

    return {
      name: definition.displayName,
      cost: definition.manaCost,
      type: "genju",
      rarity: "S",
      attack: definition.attack,
      health: definition.life,
      rulesText: this.fallbackRules(definition),
    };
  }

  private typeLine(display: DisplayCard): string {
    return [
      TYPE_NAME[display.type] ?? display.type,
      display.piece,
      display.rarity,
    ].filter(Boolean).join("・");
  }

  private fallbackRules(definition: CardDefinition): string {
    const move = definition.move.options.length === 0
      ? "移動: なし"
      : `移動: ${definition.move.options
          .map((option) => `${option.dirs} ${option.range}${option.pass ? ` pass ${option.pass}` : ""}`)
          .join(" / ")}`;
    const attack = `攻撃: ${definition.attackProfile.pattern} ${definition.attackProfile.range}`;
    return `${move}\n${attack}`;
  }

  private wrapByChars(text: string, maxChars: number): string[] {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return [""];
    }
    const lines: string[] = [];
    for (let i = 0; i < normalized.length; i += maxChars) {
      lines.push(normalized.slice(i, i + maxChars));
    }
    return lines;
  }

  private fitTextToWidth(
    text: Phaser.GameObjects.Text,
    maxWidth: number,
    initialSize: number,
    minSize: number,
  ): void {
    for (let size = Math.round(initialSize); size >= Math.round(minSize); size -= 1) {
      text.setFontSize(size);
      if (text.width <= maxWidth) {
        return;
      }
    }
  }

  private fitTextToBox(
    text: Phaser.GameObjects.Text,
    maxWidth: number,
    maxHeight: number,
    initialSize: number,
    minSize: number,
  ): void {
    text.setWordWrapWidth(maxWidth, true);
    for (let size = Math.round(initialSize); size >= Math.round(minSize); size -= 1) {
      text.setFontSize(size);
      if (text.height <= maxHeight) {
        return;
      }
    }
  }
}
