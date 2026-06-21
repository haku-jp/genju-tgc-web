# ENGINE DECISION — 幻獣TGC

Date: 2026-06-21
Status: 確定（ユーザー承認済み）

## 決定

短期は **Web（Vite + TypeScript + Phaser 3）** で開発する。Unityプロジェクトは削除せず **凍結保存**（スナップショット: タグ `unity-snapshot-2026-06-20`）。Unity Core（`Assets/Scripts/Core/**`）は仕様兼・将来移植元として維持する。

## なぜWebか

旧Webプロト（`legacy-web/`）が伸びなかった原因は **プラットフォームではなく土台と進め方** と判明：戦闘の中身が無い（カウンターのみ）、CSSがスキンの重ね塗りで自己矛盾（3597行・`.card-frame`3回再定義）、ビルド/状態管理なしの`innerHTML`描画で演出が入らない。Duelyst（Web製・CC0）が示す通り、Webでこの体験は実現可能。ユーザーの優先は「公開・収益化」より **最短で・理想の手触りで遊ぶ／AIで改造しやすい／UIを高品質にしやすい**。

## 採用スタックと不変の原則

- **Vite + TypeScript**（HMRで保存→即反映）。
- **Phaser 3** を戦闘の単一レンダラに（6×6盤＋スプライト＋移動/攻撃アニメを一貫管理）。
- **ルールエンジンは純TS**（`src/core/**`、Phaser/DOM非依存、Vitestでテスト）。
  - **原則1: coreは「入力→新state」の純粋関数に保つ。** 副作用・乱数・時間・描画依存を持ち込まない。これを守る限り、将来オンライン化（Colyseus等）でも boardgame.io でもラップできる。移行の保険。
  - **原則2: Core(ロジック) と Presentation(UI) を絶対に混ぜない。** `src/view/**`・`src/scenes/**`・`src/controller/**` から `src/core/**` を import するのは可、逆は不可。
- **デザイントークン方式**（`src/view/theme.ts` が色・レイアウトの単一の真実。色を他所にハードコードしない）。
  - **原則3: スタイルは末尾追記禁止・該当箇所を修正。**（legacy-webの重ね塗り失敗の再発防止）
- **アニメ/インタラクション層を独立**させ、全演出を直列キュー（`AnimationQueue`）で処理。**成否・ダメージ値は必ず core の結果に従う**（演出は結果を表現するだけ）。

## React について

戦闘盤はPhaser単一で通す（移動tween・ヒットストップ・シェイク等はPhaserの領分）。Reactは導入しない。将来 **メタ層（コレクション・デッキ構築・ショップ）** に着手する段でのみ、盤の外側のchromeとして検討する。判断基準: アニメ主体・空間的な画面=Phaser / テキスト・レイアウト主体の画面=DOM（画面が3つ以上 or 共有状態が増えたらReact）。

## 関連ドキュメント

- 世界観・基礎ルール: `幻獣TGC 世界観・基礎ルール設計 v2`（数値カーブ §16 / キーワード定義集 §14-1 / 解決順序 §14-2 / マリガン §7-1）。
- 動き仕様: [BATTLE_INTERACTION_SPEC.md](./BATTLE_INTERACTION_SPEC.md)
- 見た目基準: [BATTLE_VISUAL_STYLE_GUIDE.md](./BATTLE_VISUAL_STYLE_GUIDE.md)
