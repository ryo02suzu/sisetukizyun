# デプロイ手順（アプリとして公開・インストール）

本アプリは **Next.js（App Router）製の PWA**。判定・収益試算はブラウザ内で完結（サーバ/DB不要）し、解説生成のみ任意で Anthropic API を使う。**一度開けばオフラインでも動作**し、スマホ/タブレット/PCに**インストール**できる。

## 1. Vercel に公開する（推奨・最短）

1. このリポジトリを GitHub に push（済）。
2. [vercel.com](https://vercel.com) で「New Project」→ 当該リポジトリを Import。
3. Framework は自動で Next.js を検出。ビルド設定はデフォルトのまま。
4. （任意）解説のAI生成を使う場合のみ、Environment Variables に設定：
   - `ANTHROPIC_API_KEY` … Anthropic のAPIキー（未設定でもアプリは動作。解説はルールベースに自動フォールバック）
   - `ANTHROPIC_MODEL` … 既定 `claude-sonnet-4-6`
5. Deploy。発行された URL がそのままアプリのURL。

> APIキーは Vercel の環境変数（サーバ側）に置く。`/api/explain` は Route Handler（サーバ）で呼ぶため、キーがブラウザに露出しない。

## 2. スマホ/タブレットに「アプリとして」入れる（インストール）

公開URLを開いて：

- **iOS（Safari）**：共有 → 「ホーム画面に追加」。
- **Android（Chrome）**：メニュー → 「アプリをインストール」/「ホーム画面に追加」。
- **PC（Chrome/Edge）**：アドレスバー右のインストールアイコン。

インストール後はスタンドアロン表示（ブラウザのアドレスバーなし）、オフライン起動可。

## 3. ローカルで動かす

```bash
npm install
npm run dev     # http://localhost:3000（開発時はSW無効）
# 本番相当の確認（PWA/SWはこちらで有効）
npm run build && npm start
```

## 4. オフライン動作について

- Service Worker（`public/sw.js`）が本番（https / `npm start`）でのみ登録される（開発時は無効）。
- 一度オンラインで開くとアプリシェルと静的アセットがキャッシュされ、以降はオフラインでも判定・試算が可能。
- 公式様式PDF（厚労省ドメイン）と解説のAI生成はオンライン時のみ。

## 5. データ更新時の再デプロイ

施設基準データは `data/standards.ts`。改定・訂正で更新したら commit → push すると Vercel が自動で再デプロイ。Service Worker のキャッシュ版数（`sw.js` の `CACHE` 文字列）を変えると、利用者側のキャッシュも更新される。

## 6. 注意

- 本アプリは届出可否の**目安**を示すもの。最終判断は地方厚生（支）局の確認による（アプリ内にも明示）。
- 患者個人データは扱わない設計（医院の体制情報のみ）。詳細は `docs/COMMERCIALIZATION.md`。
