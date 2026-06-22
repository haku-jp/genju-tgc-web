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
  hpText: Phaser.GameObjects.Text;
  manaText: Phaser.GameObjects.Text;
}

export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly callbacks: HudCallbacks;
  private readonly turnLabel: Phaser.GameObjects.Text;
  private readonly playerPanel: StatusPanel;
  private readonly enemyPanel: StatusPanel;
  private readonly endTurnButton: Phaser.GameObjects.Rectangle;
  private readonly endTurnLabel: Phaser.GameObjects.Text;
  private readonly attackHqButton: Phaser.GameObjects.Rectangle;
  private readonly attackHqLabel: Phaser.GameObjects.Text;

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

    this.endTurnButton = scene.add
      .rectangle(0, 0, 130, 44, COLOR.accent)
      .setStrokeStyle(2, COLOR.ink);
    this.endTurnLabel = scene.add
      .text(0, 0, "End Turn", {
        fontFamily: FONT_FAMILY,
        fontSize: "16px",
        color: TEXT_COLOR.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.endTurnButton.on("pointerup", () => this.callbacks.onEndTurn());

    this.attackHqButton = scene.add
      .rectangle(0, 0, 130, 36, COLOR.danger)
      .setStrokeStyle(2, COLOR.ink);
    this.attackHqLabel = scene.add
      .text(0, 0, "本陣を攻撃", {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        color: TEXT_COLOR.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.attackHqButton.on("pointerup", () => this.callbacks.onAttackEnemyHq());

    this.container.add([
      this.turnLabel,
      this.playerPanel.container,
      this.enemyPanel.container,
      this.endTurnButton,
      this.endTurnLabel,
      this.attackHqButton,
      this.attackHqLabel,
    ]);
    this.layout();
    this.setAttackEnemyHqAvailable(false);
    scene.scale.on("resize", () => this.layout());
  }

  private createStatusPanel(tag: string): StatusPanel {
    const panel = this.scene.add.container(0, 0);
    const panelRect = this.scene.add
      .rectangle(0, 0, 210, 56, COLOR.panel)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLOR.tileBorder);
    const tagText = this.scene.add.text(12, 8, tag, {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      color: TEXT_COLOR.muted,
    });
    const hpDot = this.scene.add.circle(18, 34, 6, COLOR.danger);
    const hpText = this.scene.add
      .text(32, 34, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "20px",
        color: TEXT_COLOR.ink,
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    const manaDot = this.scene.add.circle(96, 34, 5, COLOR.accent);
    const manaText = this.scene.add
      .text(108, 34, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        color: TEXT_COLOR.accent,
      })
      .setOrigin(0, 0.5);

    panel.add([panelRect, tagText, hpDot, hpText, manaDot, manaText]);
    return { container: panel, panelRect, hpText, manaText };
  }

  private layout(): void {
    const { width, height } = this.scene.scale;
    const trayTop = height - height * LAYOUT.handTrayFraction;

    this.playerPanel.container.setPosition(16, 34);
    this.enemyPanel.container.setPosition(16, 98);
    this.endTurnButton.setPosition(width - 80, trayTop - 30);
    this.endTurnLabel.setPosition(width - 80, trayTop - 30);
    this.attackHqButton.setPosition(width - 80, trayTop - 78);
    this.attackHqLabel.setPosition(width - 80, trayTop - 78);
  }

  /** Highlights the attack-HQ button when the current selection can use it. */
  setAttackEnemyHqAvailable(available: boolean): void {
    this.attackHqButton.setFillStyle(available ? COLOR.danger : COLOR.muted);
    if (available) {
      this.attackHqButton.setInteractive();
    } else {
      this.attackHqButton.disableInteractive();
    }
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

    this.endTurnButton.setFillStyle(isPlayerTurn ? COLOR.accent : COLOR.muted);
    if (isPlayerTurn) {
      this.endTurnButton.setInteractive();
    } else {
      this.endTurnButton.disableInteractive();
    }
  }
}
