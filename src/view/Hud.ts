// Mana/life/turn HUD + action buttons. Pure display + callbacks; BattleScene
// owns all state and decides what each action does.

import Phaser from "phaser";
import { BattleState } from "../core/state";
import { COLOR, FONT_FAMILY, LAYOUT, TEXT_COLOR } from "./theme";

export interface HudCallbacks {
  onEndTurn(): void;
  /** Tap on the enemy-HQ attack button (only meaningful with a unit selected). */
  onAttackEnemyHq(): void;
}

interface StatusPanel {
  container: Phaser.GameObjects.Container;
  panelRect: Phaser.GameObjects.Rectangle;
  topBand: Phaser.GameObjects.Rectangle;
  portraitKey: string;
  portraitFrame: Phaser.GameObjects.Arc;
  portraitImage?: Phaser.GameObjects.Image;
  hpText: Phaser.GameObjects.Text;
  manaText: Phaser.GameObjects.Text;
}

interface GlowButton {
  glow: Phaser.GameObjects.Rectangle;
  button: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  glowTween: Phaser.Tweens.Tween;
}

interface DeckPile {
  container: Phaser.GameObjects.Container;
  count: Phaser.GameObjects.Text;
}

export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly callbacks: HudCallbacks;
  private readonly turnLabel: Phaser.GameObjects.Text;
  private readonly playerPanel: StatusPanel;
  private readonly enemyPanel: StatusPanel;
  private readonly endTurn: GlowButton;
  private readonly attackHq: GlowButton;
  private readonly deckPile: DeckPile;
  private statusPanelCount = 0;

  constructor(scene: Phaser.Scene, callbacks: HudCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.container = scene.add.container(0, 0).setDepth(1000);

    this.turnLabel = scene.add.text(16, 12, "", {
      fontFamily: FONT_FAMILY,
      fontSize: "14px",
      color: TEXT_COLOR.muted,
    });

    this.playerPanel = this.createStatusPanel("あなた");
    this.enemyPanel = this.createStatusPanel("敵");

    this.endTurn = this.createGlowButton(130, 44, "ターン終了", COLOR.accent);
    this.endTurn.button.on("pointerup", () => this.callbacks.onEndTurn());

    this.attackHq = this.createGlowButton(130, 36, "本陣を攻撃", COLOR.danger);
    this.attackHq.button.on("pointerup", () => this.callbacks.onAttackEnemyHq());

    this.deckPile = this.createDeckPile();

    this.container.add([
      this.turnLabel,
      this.playerPanel.container,
      this.enemyPanel.container,
      this.endTurn.glow,
      this.endTurn.button,
      this.endTurn.label,
      this.attackHq.glow,
      this.attackHq.button,
      this.attackHq.label,
      this.deckPile.container,
    ]);
    this.layout();
    this.setAttackEnemyHqAvailable(false);
    scene.scale.on("resize", () => this.layout());
  }

  private createStatusPanel(tag: string): StatusPanel {
    const panel = this.scene.add.container(0, 0);
    const portraitKey = this.statusPanelCount === 0 ? "player-commander" : "enemy-commander";
    this.statusPanelCount += 1;
    const panelW = 260;
    const panelH = 56;
    const portraitRadius = panelH * 0.4;
    const portraitX = 12 + portraitRadius;
    const portraitY = panelH / 2;
    const textX = portraitX + portraitRadius + 14;
    const panelRect = this.scene.add
      .rectangle(0, 0, panelW, panelH, COLOR.panel)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLOR.tileBorder);
    // Gold banner strip along the top - the "plate" look the bare rectangle lacked.
    const topBand = this.scene.add
      .rectangle(0, 0, panelW, 3, COLOR.hq)
      .setOrigin(0, 0)
      .setAlpha(0.7);
    const tagText = this.scene.add.text(textX, 8, tag, {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      color: TEXT_COLOR.muted,
    });
    const portraitPlaceholder = this.scene.add.circle(portraitX, portraitY, portraitRadius, COLOR.panel);
    const portraitFrame = this.scene.add.circle(portraitX, portraitY, portraitRadius);
    portraitFrame.setFillStyle(COLOR.panel, 0);
    portraitFrame.setStrokeStyle(2, COLOR.tileBorder);
    // HP gem: a circle with a small offset highlight to read as a polished
    // stone rather than a flat UI dot.
    const hpGem = this.scene.add.circle(textX + 7, 34, 7, COLOR.danger).setStrokeStyle(1, COLOR.ink, 0.6);
    const hpShine = this.scene.add.circle(textX + 5, 32, 2, 0xffffff, 0.5);
    const hpText = this.scene.add
      .text(textX + 22, 34, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "20px",
        color: TEXT_COLOR.ink,
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    // Mana gem: a diamond, matching the cost-gem language already used on
    // hand cards (CardView.ts) so the same shape means "mana" everywhere.
    // A soft pulsing glow behind it reads as a small lit crystal rather than
    // a flat icon.
    const manaGlow = this.scene.add
      .rectangle(textX + 90, 34, 17, 17, COLOR.accent, 0.3)
      .setAngle(45);
    this.scene.tweens.add({
      targets: manaGlow,
      alpha: { from: 0.15, to: 0.45 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });
    const manaGem = this.scene.add
      .rectangle(textX + 90, 34, 11, 11, COLOR.accent)
      .setStrokeStyle(1, COLOR.ink, 0.6)
      .setAngle(45);
    const manaText = this.scene.add
      .text(textX + 102, 34, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        color: TEXT_COLOR.accent,
      })
      .setOrigin(0, 0.5);

    panel.add([
      panelRect,
      topBand,
      portraitPlaceholder,
      portraitFrame,
      tagText,
      hpGem,
      hpShine,
      hpText,
      manaGlow,
      manaGem,
      manaText,
    ]);
    return { container: panel, panelRect, topBand, portraitKey, portraitFrame, hpText, manaText };
  }

  /** A button with a soft pulsing glow behind it; glow is paused/hidden when inactive. */
  private createGlowButton(width: number, height: number, text: string, color: number): GlowButton {
    const glow = this.scene.add.rectangle(0, 0, width + 16, height + 16, color, 0.35);
    const button = this.scene.add.rectangle(0, 0, width, height, color).setStrokeStyle(3, COLOR.hq, 0.8);
    const label = this.scene.add
      .text(0, 0, text, {
        fontFamily: FONT_FAMILY,
        fontSize: "16px",
        color: TEXT_COLOR.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const glowTween = this.scene.tweens.add({
      targets: glow,
      alpha: { from: 0.15, to: 0.4 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
    return { glow, button, label, glowTween };
  }

  private setGlowButtonPosition(glowButton: GlowButton, x: number, y: number): void {
    glowButton.glow.setPosition(x, y);
    glowButton.button.setPosition(x, y);
    glowButton.label.setPosition(x, y);
  }

  /** Wires a button's enabled/disabled visual + interactivity + glow together. */
  private setGlowButtonActive(glowButton: GlowButton, active: boolean, activeColor: number): void {
    glowButton.button.setFillStyle(active ? activeColor : COLOR.muted);
    glowButton.glow.setFillStyle(activeColor);
    if (active) {
      glowButton.button.setInteractive();
      glowButton.glowTween.resume();
      glowButton.glow.setVisible(true);
    } else {
      glowButton.button.disableInteractive();
      glowButton.glowTween.pause();
      glowButton.glow.setVisible(false);
    }
  }

  /** Small fanned stack of card-backs showing how many cards are left to draw. */
  private createDeckPile(): DeckPile {
    const container = this.scene.add.container(0, 0);
    const cardW = 38;
    const cardH = 52;
    const layers: Phaser.GameObjects.GameObject[] = [];
    for (let i = 2; i >= 0; i--) {
      const offset = i * 3;
      layers.push(
        this.scene.add
          .rectangle(offset, -offset, cardW, cardH, COLOR.panel)
          .setStrokeStyle(2, COLOR.hq, 0.7),
      );
    }
    const label = this.scene.add
      .text(0, -cardH / 2 - 12, "自分の山札", {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: TEXT_COLOR.muted,
      })
      .setOrigin(0.5);
    const count = this.scene.add
      .text(0, 0, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "20px",
        color: TEXT_COLOR.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add([...layers, label, count]);
    return { container, count };
  }

  private layout(): void {
    const { width, height } = this.scene.scale;
    const trayTop = height - height * LAYOUT.handTrayFraction;

    this.playerPanel.container.setPosition(16, 34);
    this.enemyPanel.container.setPosition(16, 98);
    this.setGlowButtonPosition(this.endTurn, width - 80, trayTop - 30);
    this.setGlowButtonPosition(this.attackHq, width - 80, trayTop - 78);
    this.deckPile.container.setPosition(width - 50, 50);
  }

  /** Highlights the attack-HQ button when the current selection can use it. */
  setAttackEnemyHqAvailable(available: boolean): void {
    this.setGlowButtonActive(this.attackHq, available, COLOR.danger);
  }

  render(state: BattleState): void {
    const turnText = state.currentTurn === "player" ? "あなたの番" : "敵の番";
    this.turnLabel.setText(`ターン ${state.turnNumber} ・ ${turnText}`);
    this.playerPanel.hpText.setText(`${state.playerLife}`);
    this.playerPanel.manaText.setText(`マナ ${state.playerMana}/${state.playerMaxMana}`);
    this.enemyPanel.hpText.setText(`${state.enemyLife}`);
    this.enemyPanel.manaText.setText(`マナ ${state.enemyMana}/${state.enemyMaxMana}`);

    const isPlayerTurn = state.currentTurn === "player";
    this.playerPanel.panelRect.setStrokeStyle(isPlayerTurn ? 2 : 1, isPlayerTurn ? COLOR.accent : COLOR.tileBorder);
    this.enemyPanel.panelRect.setStrokeStyle(isPlayerTurn ? 1 : 2, isPlayerTurn ? COLOR.tileBorder : COLOR.danger);
    this.playerPanel.topBand.setAlpha(isPlayerTurn ? 0.9 : 0.4);
    this.enemyPanel.topBand.setAlpha(isPlayerTurn ? 0.4 : 0.9);
    this.renderPortrait(this.playerPanel, isPlayerTurn ? COLOR.accent : COLOR.tileBorder);
    this.renderPortrait(this.enemyPanel, isPlayerTurn ? COLOR.tileBorder : COLOR.danger);

    this.setGlowButtonActive(this.endTurn, isPlayerTurn, COLOR.accent);
    this.deckPile.count.setText(`${state.playerLibrary.length}`);
  }

  private renderPortrait(panel: StatusPanel, strokeColor: number): void {
    panel.portraitFrame.setStrokeStyle(2, strokeColor);
    if (panel.portraitImage || !this.scene.textures.exists(panel.portraitKey)) {
      return;
    }

    const radius = panel.portraitFrame.radius;
    const image = this.scene.add.image(panel.portraitFrame.x, panel.portraitFrame.y, panel.portraitKey);
    const source = image.texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const sourceWidth = source.width || image.width;
    const sourceHeight = source.height || image.height;
    image.setScale((radius * 2) / Math.min(sourceWidth, sourceHeight));

    // Mask source must be a detached Graphics (make.graphics(.., false), not
    // add.graphics()) drawn in world coords - one parented into the same
    // container as the masked image does not clip correctly in Phaser 3.90.
    const worldX = panel.container.x + panel.portraitFrame.x;
    const worldY = panel.container.y + panel.portraitFrame.y;
    const mask = this.scene.make.graphics(undefined, false);
    mask.fillStyle(0xffffff, 1);
    mask.fillCircle(worldX, worldY, radius - 1);
    image.setMask(mask.createGeometryMask());
    // Detached Graphics aren't on the scene's display list, so scene shutdown
    // won't sweep them up automatically - destroy explicitly to avoid a leak
    // each time a new battle (and thus a new Hud) is created.
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => mask.destroy());

    panel.container.addAt(image, 2);
    panel.portraitImage = image;
  }
}
