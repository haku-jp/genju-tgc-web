// Serializes presentation steps so concurrent actions never animate at once
// (Docs/BATTLE_INTERACTION_SPEC.md principle: "全アクションはアニメーション
// キューで直列化する"). Each step may return a promise; the next step waits
// for it to resolve.

export type AnimationStep = () => void | Promise<void>;

export class AnimationQueue {
  private tail: Promise<void> = Promise.resolve();

  enqueue(step: AnimationStep): Promise<void> {
    this.tail = this.tail.then(() => step());
    return this.tail;
  }
}
