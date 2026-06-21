// Lays out a player's hand as a fan of CardViews, per
// Docs/BATTLE_VISUAL_STYLE_GUIDE.md §手札（扇状）: ±18° fan angle, 520px pivot
// radius, ~40% adjacent overlap at 5 cards. Tap-to-zoom and drag-to-summon
// are delegated to each CardView; HandView only computes layout.

import Phaser from "phaser";
import { BattleState, Owner, handOf } from "../core/state";
import { CardView, CardViewCallbacks } from "./CardView";

const FAN_MAX_ANGLE_DEG = 18;
const FAN_RADIUS = 520;
/** Card width as a fraction of screen width (style guide: ~12%). */
const CARD_WIDTH_FRACTION = 0.12;
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
    const cardWidth = screenWidth * CARD_WIDTH_FRACTION;
    const cardHeight = cardWidth * CARD_HEIGHT_RATIO;

    // Pivot sits below the screen; cards arc upward from it, so the bottom
    // edge of the fan lands just inside the visible viewport.
    const pivotX = screenWidth / 2;
    const pivotY = screenHeight + FAN_RADIUS - cardHeight * 0.6;

    const count = hand.length;
    const maxAngle = count > 1 ? FAN_MAX_ANGLE_DEG : 0;

    hand.forEach((handCard, index) => {
      const t = count === 1 ? 0 : (index / (count - 1)) * 2 - 1; // -1..1
      const angleDeg = t * maxAngle;
      const angleRad = Phaser.Math.DegToRad(angleDeg);
      const x = pivotX + FAN_RADIUS * Math.sin(angleRad);
      const y = pivotY - FAN_RADIUS * Math.cos(angleRad);
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
