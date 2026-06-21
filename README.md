# 幻獣TGC — Web

自作デジタルTCG「幻獣TGC」のWebクライアント。Vite + TypeScript + Phaser 3。
スマホ／PCのブラウザから開発中の完成度を確認するための公開ビルド（横画面が主対象）。

設計ドキュメント（方針・挙動・見た目・カード設計）は非公開の本体リポジトリ側 `Docs/` で管理。

## 公開（GitHub Pages）

`main` に push すると `.github/workflows/deploy.yml` が自動でビルドし Pages へデプロイする。
プロジェクトPagesのサブパスに合わせ、ビルドは `--base=/<リポジトリ名>/` で実行される。

公開URL: https://haku-jp.github.io/genju-tgc-web/

## 起動

```bash
cd web
npm install
npm run dev      # ブラウザで開発サーバ
npm run test     # ロジックの Vitest
npm run build    # 型チェック + バンドル
```

## 構成（責務分離）

- `src/core/**` … ルールエンジン（Phaser非依存・純TS・テスト対象）。盤面/召喚/移動/攻撃/勝敗。
- `src/view/**` … 表示（Phaser）。状態を描画し、入力をcontrollerへ渡すだけ。
- `src/controller/**` … 入力をcoreコマンドに変換し、結果をviewへ反映。
- `src/scenes/**` … Phaserシーン。

## 開発規律（重要）

- 1タスク1目的。core(ロジック)とview(UI)を**混ぜない**。
- 成否・ダメージ値は**必ずcoreの結果に従う**。viewは演出のみ。
- スタイル/演出値は設計docのトークンを使う。**末尾追記でなく該当箇所を修正**。
