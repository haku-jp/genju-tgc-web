// Mana/life/turn readout + End Turn button (T10). Pure display + one
// callback; BattleScene owns all state and decides what End Turn does.

import Phaser from "phaser";
import { BattleState } from "../core/state";
import { COLOR, FONT_FAMILY, TEXT_COLOR } from "./theme";

export interface HudCallbacks {
  onEndTurn(): void;
  /** Tap on the enemy-HQ attack button (only meaningful with a unit selected). */
  onAttackEnemyHq(): void;
}

export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly callbacks: HudCallbacks;
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly endTurnButton: Phaser.GameObjects.Rectangle;
  private readonly endTurnLabel: Phaser.GameObjects.Text;
  private readonly attackHqButton: Phaser.GameObjects.Rectangle;
  private readonly attackHqLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, callbacks: HudCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.container = scene.add.container(0, 0).setDepth(1000);

    this.statusText = scene.add.text(16, 12, "", {
      fontFamily: FONT_FAMILY,
      fontSize: "16px",
      color: TEXT_COLOR.ink,
      lineSpacing: 4,
    });

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
      this.statusText,
      this.endTurnButton,
      this.endTurnLabel,
      this.attackHqButton,
      this.attackHqLabel,
    ]);
    this.layout();
    this.setAttackEnemyHqAvailable(false);
    scene.scale.on("resize", () => this.layout());
  }

  private layout(): void {
    const { width, height } = this.scene.scale;
    this.endTurnButton.setPosition(width - 80, height - 60);
    this.endTurnLabel.setPosition(width - 80, height - 60);
    this.attackHqButton.setPosition(width - 80, height - 110);
    this.attackHqLabel.setPosition(width - 80, height - 110);
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
    const turnLabel = state.currentTurn === "player" ? "あなたの番" : "敵の番";
    this.statusText.setText(
      `ターン ${state.turnNumber}（${turnLabel}）\n` +
        `あなた HP ${state.playerLife}  マナ ${state.playerMana}/${state.playerMaxMana}\n` +
        `敵    HP ${state.enemyLife}  マナ ${state.enemyMana}/${state.enemyMaxMana}`,
    );

    const isPlayerTurn = state.currentTurn === "player";
    this.endTurnButton.setFillStyle(isPlayerTurn ? COLOR.accent : COLOR.muted);
    if (isPlayerTurn) {
      this.endTurnButton.setInteractive();
    } else {
      this.endTurnButton.disableInteractive();
    }
  }
}
