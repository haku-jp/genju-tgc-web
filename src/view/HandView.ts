// Lays out a player's hand as a viewport-scaled fan of CardViews. Tap-to-zoom
// and drag-to-summon are delegated to each CardView; HandView only computes
// layout.

import Phaser from "phaser";
import { BattleState, Owner, handOf } from "../core/state";
import { CardView, CardViewCallbacks } from "./CardView";
import { LAYOUT } from "./theme";

const FAN_MAX_ANGLE_DEG = 14;
/** Card ratio is 5:7 (width:height). */
const CARD_HEIGHT_RATIO = 7 / 5;

export class HandView {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly callbacks: CardViewCallbacks;
  private cards: CardView[] = [];

  constructor(scene: Phaser.Scene, callbacks: CardViewCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.container = scene.add.container(0, 0);
  }

  render(state: BattleState, owner: Owner = "player"): void {
    this.cards.forEach((card) => card.destroy());
    this.cards = [];
    const hand = handOf(state, owner);
    if (hand.length === 0) {
      return;
    }

    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    const cardWidth = Phaser.Math.Clamp(screenWidth * 0.085, 76, 132);
    const cardHeight = cardWidth * CARD_HEIGHT_RATIO;
    const trayHeight = screenHeight * LAYOUT.handTrayFraction;
    const radius = trayHeight * 1.9;

    const pivotX = screenWidth / 2;
    const safeBottom = 8;
    const pivotY = screenHeight - safeBottom + radius - cardHeight;

    const count = hand.length;
    const maxAngle = count > 1 ? FAN_MAX_ANGLE_DEG : 0;

    hand.forEach((handCard, index) => {
      const t = count === 1 ? 0 : (index / (count - 1)) * 2 - 1; // -1..1
      const angleDeg = t * maxAngle;
      const angleRad = Phaser.Math.DegToRad(angleDeg);
      const x = pivotX + radius * Math.sin(angleRad);
      const y = pivotY - radius * Math.cos(angleRad);
      const card = new CardView(
        this.scene,
        handCard,
        index,
        { x, y, angleDeg, width: cardWidth, height: cardHeight },
        this.callbacks,
      );
      this.container.add(card.container);
      this.cards.push(card);
    });
  }
}
