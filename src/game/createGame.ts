import Phaser from "phaser";
import { BattleScene } from "../scenes/BattleScene";
import { MenuScene } from "../scenes/MenuScene";
import { ResultScene } from "../scenes/ResultScene";
import type { CardDefinition } from "../core/state";

export interface BattleSetup {
  playerDeck?: CardDefinition[];
  enemyDeck?: CardDefinition[];
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: "#0b0e14",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MenuScene, BattleScene, ResultScene],
};

export function createGame(parent: HTMLElement, setup?: BattleSetup): Phaser.Game {
  const game = new Phaser.Game({ ...config, parent });
  game.registry.set("battleSetup", setup ?? {});
  return game;
}
