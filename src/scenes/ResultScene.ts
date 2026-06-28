// Win/lose screen -> メニュー transition (T10).

import Phaser from "phaser";
import { Owner } from "../core/state";
import { COLOR, FONT_FAMILY, TEXT_COLOR } from "../view/theme";

export interface ResultSceneData {
  winner: Owner;
}

export class ResultScene extends Phaser.Scene {
  private resultText!: Phaser.GameObjects.Text;
  private button!: Phaser.GameObjects.Rectangle;
  private label!: Phaser.GameObjects.Text;
  private won = false;

  constructor() {
    super("Result");
  }

  create(data: ResultSceneData): void {
    this.cameras.main.setBackgroundColor("#0b0e14");
    this.won = data.winner === "player";

    this.resultText = this.add
      .text(0, 0, this.won ? "勝利" : "敗北", {
        fontFamily: FONT_FAMILY,
        fontSize: "56px",
        color: this.won ? TEXT_COLOR.health : TEXT_COLOR.danger,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.button = this.add
      .rectangle(0, 0, 220, 64, COLOR.accent)
      .setStrokeStyle(2, COLOR.ink)
      .setInteractive();
    this.label = this.add
      .text(0, 0, "ロビーへ", {
        fontFamily: FONT_FAMILY,
        fontSize: "22px",
        color: TEXT_COLOR.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.button.on("pointerup", () => {
      const setup = this.registry.get("battleSetup") as { onExitToLobby?: () => void } | undefined;
      setup?.onExitToLobby?.();
    });

    this.layout();
    this.scale.on("resize", this.layout, this);
  }

  private layout(): void {
    const { width, height } = this.scale;
    this.resultText.setPosition(width / 2, height * 0.4);
    this.button.setPosition(width / 2, height * 0.6);
    this.label.setPosition(width / 2, height * 0.6);
  }
}
