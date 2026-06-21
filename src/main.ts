import Phaser from "phaser";
import { MenuScene } from "./scenes/MenuScene";
import { BattleScene } from "./scenes/BattleScene";
import { ResultScene } from "./scenes/ResultScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#0b0e14",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MenuScene, BattleScene, ResultScene],
};

new Phaser.Game(config);
