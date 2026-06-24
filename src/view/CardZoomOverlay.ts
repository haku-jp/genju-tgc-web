import Phaser from "phaser";
import { CardDefinition } from "../core/state";
import { CARD_BY_ID, type CardDef } from "../data/cards";
import { wrapJa } from "./jaWrap";
import { FONT_BODY, FONT_NUM, FONT_TITLE, TEXT_COLOR } from "./theme";

const ZOOM_DURATION_MS = 150;
const OVERLAY_DEPTH = 10000;
/** Tall card so the full 2:3 art is shown without vertical cropping. */
const CARD_RATIO = 2.25; // height / width
const CARD_WIDTH_FRACTION = 0.42;

const FRAME_BG = 0x11151d;
const TITLE_BG = 0x1b2331;
const ART_BG = 0x0d1016;
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
    this.container = scene.add.container(0, 0).setDepth(OVERLAY_DEPTH).setVisible(false);

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

    // Size the (tall) card and clamp to the screen height.
    let width = screenWidth * CARD_WIDTH_FRACTION;
    let height = width * CARD_RATIO;
    const maxHeight = screenHeight * 0.94;
    if (height > maxHeight) {
      height = maxHeight;
      width = height / CARD_RATIO;
    }
    const W = width;
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

    // Card frame
    const frame = this.scene.add.graphics();
    frame.fillStyle(FRAME_BG, 1);
    frame.fillRoundedRect(cardLeft, cardTop, width, height, 14);
    frame.lineStyle(3, edgeColor, 1);
    frame.strokeRoundedRect(cardLeft, cardTop, width, height, 14);
    frame.setInteractive(
      new Phaser.Geom.Rectangle(cardLeft, cardTop, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    frame.on("pointerdown", () => this.close());

    let y = cardTop + W * 0.04;

    // Title bar (name + cost gem)
    const titleH = W * 0.13;
    frame.fillStyle(TITLE_BG, 1);
    frame.fillRoundedRect(cardLeft + W * 0.03, y, width - W * 0.06, titleH, 8);
    const title = this.scene.add.text(cardLeft + W * 0.06, y + titleH / 2, display.name, {
      fontFamily: FONT_TITLE,
      fontSize: `${Math.round(W * 0.072)}px`,
      color: TEXT_COLOR.ink,
      fontStyle: "700",
    });
    title.setOrigin(0, 0.5);
    this.fitTextToWidth(title, W * 0.6, W * 0.072, W * 0.045);

    const costRadius = W * 0.06;
    const costX = cardLeft + width - W * 0.1;
    const costY = y + titleH / 2;
    const costGem = this.scene.add.graphics();
    costGem.fillStyle(COST_BG, 1);
    costGem.fillCircle(costX, costY, costRadius);
    costGem.lineStyle(2, 0xffffff, 0.85);
    costGem.strokeCircle(costX, costY, costRadius);
    const cost = this.scene.add.text(costX, costY, `${display.cost}`, {
      fontFamily: FONT_NUM,
      fontSize: `${Math.round(W * 0.072)}px`,
      color: "#ffffff",
      fontStyle: "700",
      stroke: "#11151d",
      strokeThickness: Math.max(2, Math.round(W * 0.007)),
    });
    cost.setOrigin(0.5);

    y += titleH + W * 0.03;

    // Art window — 2:3 portrait, art shown in full (contain), no vertical crop.
    const artX = cardLeft + W * 0.06;
    const artY = y;
    const artW = W * 0.88;
    const artH = artW * 1.5;
    const artFrame = this.scene.add.graphics();
    artFrame.fillStyle(ART_BG, 1);
    artFrame.fillRect(artX, artY, artW, artH);
    artFrame.lineStyle(2, INNER_BORDER, 1);
    artFrame.strokeRect(artX, artY, artW, artH);
    const artObjects = this.createArt(definition, artX, artY, artW, artH, cardX, cardY);

    y += artH + W * 0.03;

    // Type line
    const typeH = W * 0.06;
    const typeLine = this.scene.add.graphics();
    typeLine.fillStyle(TITLE_BG, 1);
    typeLine.fillRect(artX, y, artW, typeH);
    typeLine.lineStyle(1, INNER_BORDER, 1);
    typeLine.strokeRect(artX, y, artW, typeH);
    const typeText = this.scene.add.text(artX + W * 0.025, y + typeH / 2, this.typeLine(display), {
      fontFamily: FONT_BODY,
      fontSize: `${Math.round(W * 0.037)}px`,
      color: TEXT_COLOR.muted,
      fontStyle: "600",
    });
    typeText.setOrigin(0, 0.5);
    this.fitTextToWidth(typeText, artW - W * 0.05, W * 0.037, W * 0.026);

    y += typeH + W * 0.03;

    // Rules box
    const rulesH = W * 0.42;
    const rules = this.scene.add.graphics();
    rules.fillStyle(RULES_BG, 1);
    rules.fillRoundedRect(artX, y, artW, rulesH, 7);
    rules.lineStyle(1, INNER_BORDER, 1);
    rules.strokeRoundedRect(artX, y, artW, rulesH, 7);
    const textObjects = this.createRulesText(display, artX, y, artW, rulesH, W);

    y += rulesH + W * 0.03;

    // ATK/HP box (genju only) — separated below the rules box
    const statObjects = isGenju
      ? this.createStats(display, cardLeft + width - W * 0.3, y, W * 0.26, W * 0.13, W)
      : [];

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
    // contain: show the entire art (no vertical/horizontal cropping).
    art.setScale(Math.min(artW / art.width, artH / art.height));
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
    const rules = this.scene.add.text(x + pad, y + pad, "", {
      fontFamily: FONT_BODY,
      fontSize: `${Math.round(cardWidth * 0.045)}px`,
      color: TEXT_COLOR.ink,
      lineSpacing: 3,
    });
    rules.setOrigin(0, 0);
    this.fitJaTextToBox(rules, display.rulesText || "", textWidth, height - pad * 2, cardWidth * 0.045, cardWidth * 0.03);

    const objects: Phaser.GameObjects.GameObject[] = [rules];
    const remaining = height - pad * 2 - rules.height - pad * 0.7;
    if (display.flavorText && remaining > cardWidth * 0.09) {
      const flavor = this.scene.add.text(x + pad, y + pad + rules.height + pad * 0.7, "", {
        fontFamily: FONT_BODY,
        fontSize: `${Math.round(cardWidth * 0.03)}px`,
        color: TEXT_COLOR.muted,
        fontStyle: "italic",
        lineSpacing: 2,
      });
      flavor.setOrigin(0, 0);
      this.fitJaTextToBox(flavor, display.flavorText, textWidth, remaining, cardWidth * 0.03, cardWidth * 0.024);
      objects.push(flavor);
    }
    return objects;
  }

  private createStats(
    display: DisplayCard,
    statX: number,
    statY: number,
    statW: number,
    statH: number,
    cardWidth: number,
  ): Phaser.GameObjects.GameObject[] {
    const box = this.scene.add.graphics();
    box.fillStyle(STAT_BG, 1);
    box.fillRoundedRect(statX, statY, statW, statH, 8);
    box.lineStyle(2, 0xffffff, 0.7);
    box.strokeRoundedRect(statX, statY, statW, statH, 8);
    const stats = this.scene.add.text(
      statX + statW / 2,
      statY + statH / 2,
      `${display.attack ?? 0} / ${display.health ?? 0}`,
      {
        fontFamily: FONT_NUM,
        fontSize: `${Math.round(cardWidth * 0.07)}px`,
        color: "#ffffff",
        fontStyle: "700",
        stroke: "#11151d",
        strokeThickness: Math.max(2, Math.round(cardWidth * 0.006)),
      },
    );
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
    return [TYPE_NAME[display.type] ?? display.type, display.piece, display.rarity]
      .filter(Boolean)
      .join("・");
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

  private fitJaTextToBox(
    text: Phaser.GameObjects.Text,
    source: string,
    maxWidth: number,
    maxHeight: number,
    initialSize: number,
    minSize: number,
  ): void {
    for (let size = Math.round(initialSize); size >= Math.round(minSize); size -= 1) {
      text.setFontSize(size);
      const maxCharsPerLine = Math.max(1, Math.floor(maxWidth / (size * 1.05)));
      text.setText(wrapJa(source, maxCharsPerLine));
      if (text.height <= maxHeight) {
        return;
      }
    }
  }
}
