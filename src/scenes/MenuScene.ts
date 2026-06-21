// Title screen: メニュー -> 対戦 transition (T10).

import Phaser from "phaser";
import { COLOR, FONT_FAMILY, TEXT_COLOR } from "../view/theme";

export class MenuScene extends Phaser.Scene {
  private title!: Phaser.GameObjects.Text;
  private button!: Phaser.GameObjects.Rectangle;
  private label!: Phaser.GameObjects.Text;

  constructor() {
    super("Menu");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#0b0e14");

    this.title = this.add
      .text(0, 0, "幻獣TGC", {
        fontFamily: FONT_FAMILY,
        fontSize: "48px",
        color: TEXT_COLOR.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.button = this.add
      .rectangle(0, 0, 220, 64, COLOR.accent)
      .setStrokeStyle(2, COLOR.ink)
      .setInteractive();
    this.label = this.add
      .text(0, 0, "対戦開始", {
        fontFamily: FONT_FAMILY,
        fontSize: "24px",
        color: TEXT_COLOR.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.button.on("pointerup", () => this.scene.start("Battle"));

    this.layout();
    this.scale.on("resize", this.layout, this);
  }

  private layout(): void {
    const { width, height } = this.scale;
    this.title.setPosition(width / 2, height * 0.35);
    this.button.setPosition(width / 2, height * 0.6);
    this.label.setPosition(width / 2, height * 0.6);
  }
}
