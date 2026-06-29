# 詳細仕様書（SPECIFICATION）

歯科「施設基準 届出可否 診断アプリ（令和8年度／2026年6月施行 対応）」の機能・データ・アルゴリズム・画面・APIの詳細仕様。実装（`lib/`・`data/`・`app/`・`components/`）と1対1で対応する。

- 対象バージョン：リポジトリ最新（収録24基準）
- 最終更新：2026-06-15
- 読者：開発者・監修者・QA・引き継ぎ担当

## 目次

1. 概要・目的・スコープ
2. 用語定義
3. アーキテクチャと技術スタック
4. ディレクトリ構成
5. データモデル（型定義の全フィールド）
6. 判定エンジン仕様（決定木）
7. 収益試算エンジン仕様
8. 解説生成（LLM）と API 仕様
9. 質問収集・重複排除ロジック
10. 画面仕様（3ステップ）
11. コンポーネント仕様
12. 状態管理・永続化
13. 経過措置カウントダウン仕様
14. 公式様式・ワンタップ印刷仕様
15. 印刷仕様
16. スタイル仕様（デザイントークン・レスポンシブ）
17. 環境変数・ビルド・テスト
18. エッジケース・エラーハンドリング
19. 既知の制約・非対応（要注意）
20. テストケース一覧

---

## 1. 概要・目的・スコープ

### 1.1 目的

歯科診療所が令和8年度（2026年6月施行）改定下で**届出可能な施設基準**について、自院の状況を問診形式で入力すると、各基準の**届出可否を決定論的に判定**し、**収益を係数モデルで試算**し、**公式様式PDFへ直接アクセス**できるようにする。

### 1.2 設計原則（不変条件）

- **判定は決定木（ルールエンジン）で行い、LLM を一切使わない。** 点数・要件という「間違えてはいけない確定情報」を決定論的に扱う。
- **LLM は「不可理由の言い換え（解説）」のみに使う。** 判定を上書きしない。未設定時はルールベースにフォールバック。
- **解釈が割れる項目は `verify` に倒す。** 充足していても「要確認」として返還リスクを避ける。
- **クライアント完結・ステートレス。** 判定・試算はブラウザ内の純粋関数で動き、サーバ/DBに依存しない（解説 API を除く）。

### 1.3 スコープ外（本仕様の対象外）

認証、課金、永続DB（Supabase）、デプロイ構成、患者個票の取り扱い。→ `docs/COMMERCIALIZATION.md` 参照。

---

## 2. 用語定義

| 用語 | 定義 |
| --- | --- |
| 施設基準（standard） | 届出により算定可能になる保険診療上の基準。1件が `DentalFacilityStandard`。 |
| 条件（condition） | 届出要件を表す決定木の1ノード。`Condition`。 |
| 整理番号（code_number） | 厚生局の届出一覧における通し番号。**局・改定年度で振り直される**。 |
| 判定（verdict） | `eligible`（届出可能）/`needs_verify`（要確認）/`not_eligible`（届出不可）。 |
| 要確認（verify） | 充足していても人手確認が必要な論点。条件単位 `verify` と基準単位 `verify_flags`。 |
| 排他グループ（exclusive_group） | 同月に通常いずれか一方しか算定しない基準の集合。収益試算で最大1件のみ計上。 |
| みなし終了日（transitional_deadline） | 経過措置の期限日（YYYY-MM-DD）。 |

---

## 3. アーキテクチャと技術スタック

### 3.1 レイヤー

```
[ブラウザ / Client Component]
  app/page.tsx (オーケストレーション・状態)
    ├─ components/Questionnaire.tsx (問診UI)
    ├─ components/ResultCard.tsx   (判定結果カード)
    └─ components/RevenueSim.tsx    (収益試算UI)
        │ 直接import（純粋関数・決定論的）
        ├─ data/standards.ts  (24基準 + 近畿公式様式URL)
        ├─ lib/engine.ts      (決定木判定)
        ├─ lib/revenue.ts     (収益試算)
        └─ lib/types.ts       (型)

[Server / Route Handler]
  app/api/explain/route.ts  → lib/explain.ts → (任意) Anthropic Messages API
```

- **判定・試算はクライアント側**（`page.tsx` から `diagnoseAll` / `simulateRevenueForMany` を直接呼ぶ）。サーバ往復なし。
- **解説のみサーバ側 Route Handler** 経由（APIキーをクライアントに露出させないため）。

### 3.2 技術スタック

| 項目 | 値 |
| --- | --- |
| フレームワーク | Next.js 16系（App Router, Turbopack） |
| 言語 | TypeScript 5系（`strict: true`） |
| UI | React 19、CSS（`app/globals.css`、CSS変数ベース。UIライブラリ不使用） |
| LLM（任意） | Anthropic Messages API（`claude-sonnet-4-6` 既定） |
| テスト | `node --test` + `tsx`（`test/engine.test.ts`） |
| 依存（本番） | `next` / `react` / `react-dom` のみ |

---

## 4. ディレクトリ構成

```
/
├── app/
│   ├── layout.tsx              ルートレイアウト（lang="ja"、globals.css 読込）
│   ├── page.tsx                メイン（"use client"、3ステップ）
│   ├── globals.css             全スタイル（デザイントークン・レスポンシブ・印刷）
│   └── api/explain/route.ts    POST /api/explain（解説生成）
├── components/
│   ├── Questionnaire.tsx        問診（アコーディオン・進捗・一括回答）
│   ├── ResultCard.tsx           判定結果カード（解説・詳細展開・カウントダウン）
│   └── RevenueSim.tsx           収益試算表（排他除外・月1回・注記）
├── data/
│   └── standards.ts             standards[24] / getStandardById / officialForms / getOfficialForms
├── lib/
│   ├── types.ts                 全型定義
│   ├── engine.ts                決定木判定（純粋関数）
│   ├── revenue.ts               収益試算（純粋関数）
│   └── explain.ts               解説生成（LLM + フォールバック）
├── test/engine.test.ts          単体テスト（17件）
├── docs/
│   ├── SPECIFICATION.md          本書
│   └── COMMERCIALIZATION.md      商用化要件
├── package.json / tsconfig.json / next.config.js / .env.example
```

---

## 5. データモデル（型定義の全フィールド）

出典：`lib/types.ts`。

### 5.1 列挙型

| 型 | 値 |
| --- | --- |
| `ConditionType` | `"boolean"` \| `"number_min"` \| `"threshold"` \| `"composite_or"` \| `"composite_and"` |
| `StandardCategory` | `"基本診療料"` \| `"特掲診療料"` |
| `RevisionStatus` | `"新設"` \| `"改定"` \| `"廃止"` \| `"継続"` \| `"未確定"` |
| `Verdict` | `"eligible"` \| `"not_eligible"` \| `"needs_verify"` |

### 5.2 `Condition`（決定木ノード）

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `key` | `string` | △ | `UserInputs` と紐づくキー。composite では省略可。 |
| `label` | `string` | ○ | 問診UIの表示文言（日本語）。 |
| `type` | `ConditionType` | △ | 既定 `"boolean"`。 |
| `number_min` | `number` | △ | `number_min` 用しきい値。 |
| `threshold` | `number` | △ | `threshold` 用しきい値。 |
| `unit` | `string` | △ | 数値入力の単位表示（"回/年" 等）。 |
| `options` | `string[]` | △ | 列挙肢（現状UI未使用）。 |
| `sub_conditions` | `Condition[]` | △ | composite の子条件。 |
| `verify` | `boolean` | △ | true かつ充足なら「要確認」に倒す。 |
| `note` | `string` | △ | 補足説明（問診で `key` 直下に表示）。 |

### 5.3 `Requirements`

5カテゴリの `Condition[]`：`equipment`（設備）/ `staff`（人員）/ `system`（体制）/ `performance`（実績）/ `training`（研修）。**各配列内・配列間とも AND**（全条件 met で初めて条件充足）。

### 5.4 `Fee`

`item_name: string` / `points: number`（0可）/ `unit?: string`（既定"点"運用）/ `frequency_note?: string`。

### 5.5 `Forms`

`todokede_form: string`（別添7/別添2 等）/ `attachment_forms: string[]` / `attachments: string[]` / `e_application_available: boolean | null`（true=対応 / false=非対応 / null=未確認）。

### 5.6 `RevenueSimItem` / `RevenueSim`

`RevenueSimItem`：`item: string`（一意キー兼表示名）/ `points_per_event: number` / `default_monthly_count_hint?: number` / `once_per_month?: boolean`（**表示用のみ。回数は制限しない**）。

`RevenueSim`：`linked_items: RevenueSimItem[]` / `formula: string`（表示用文字列。計算には不使用）/ `exclusive_group?: string`（同グループ基準は試算で最大1件のみ計上）。

### 5.7 `DentalFacilityStandard`（中心エンティティ）

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | `string` | スラッグ（一意）。例 `"ha_shoshin"`。 |
| `official_name` | `string` | 正式名称。 |
| `common_name` | `string` | 通称・略称。 |
| `code_number` | `string` | 整理番号（局・年度で変動）。 |
| `code_number_bureau` | `string?` | 整理番号を確認した厚生局・年度。 |
| `notification_ref` | `string` | 告示・通知の参照。 |
| `category` | `StandardCategory` | 基本/特掲。 |
| `new_or_revised_r8` | `RevisionStatus` | 令和8区分。 |
| `prerequisites` | `string[]` | 前提基準 id 配列。 |
| `requirements` | `Requirements` | 要件（決定木）。 |
| `fees` | `Fee[]` | 算定点数。 |
| `forms` | `Forms` | 届出様式。 |
| `transitional` | `string` | 経過措置の説明文。 |
| `transitional_deadline` | `string?` | みなし終了日（YYYY-MM-DD）。 |
| `revenue_sim` | `RevenueSim` | 収益試算定義。 |
| `verify_flags` | `string[]` | 基準単位の要確認論点。 |
| `last_updated` | `string` | データ更新日。 |
| `source_version` | `string` | 根拠の版。 |
| `sources` | `string[]` | 一次情報URL。 |

### 5.8 判定結果型

- `UserInputs = Record<string, boolean | number | string | undefined>`：key → 回答値。
- `ConditionResult`：`{ key?, label, met, needsVerify, children? }`。
- `DiagnosisResult`：`{ standardId, official_name, common_name, category, verdict, conditionResults{5カテゴリ別 ConditionResult[]}, unmetLabels[], verifyLabels[], unmetPrerequisites[] }`。

### 5.9 公式様式型（`data/standards.ts`）

```
OfficialFormLink { label: string; url: string }
OfficialForms    { bureau: string; common: OfficialFormLink; forms: OfficialFormLink[] }
officialForms: Record<standardId, OfficialForms>   // 近畿 令和8
```

---

## 6. 判定エンジン仕様（`lib/engine.ts`）

純粋関数のみ。乱数・I/O・LLM 不使用。

### 6.1 `evaluateCondition(cond, inputs) → ConditionResult`

`type` 未指定時は `"boolean"`。

**葉ノードの真理値表**

| type | met の条件 |
| --- | --- |
| `boolean` | `inputs[key] === true` または `=== "true"`（それ以外＝undefined/false/0/数値 は false） |
| `number_min` | `Number(inputs[key])` が有限 かつ `number_min` 定義済み かつ `値 >= number_min` |
| `threshold` | `Number(inputs[key])` が有限 かつ `threshold` 定義済み かつ `値 >= threshold` |

- `inputs[key]` が `undefined` の場合：boolean→false、number系→`Number(undefined)=NaN`→非有限→false。
- 葉の `needsVerify = met && (verify === true)`。

**composite ノード**

| type | met の条件 |
| --- | --- |
| `composite_or` | 子の **いずれか1つ以上** が met（`children.some(met)`） |
| `composite_and` | 子の **すべて** が met（`children.every(met)`）。※子が空配列なら `every` は true |

- composite の `needsVerify = met && (cond.verify === true || 子に「met かつ needsVerify」が1つ以上)`。
- 子は再帰評価され、結果は `children` に格納。

### 6.2 `evaluateStandard(standard, inputs, eligibleIds) → DiagnosisResult`

手順：

1. 5カテゴリの条件を各 `evaluateCondition` で評価し `conditionResults` を作る。
2. 全カテゴリの結果を平坦化（`allResults`）。
3. `unmetPrerequisites = standard.prerequisites.filter(p => !eligibleIds.has(p))`。
4. `unmetLabels` を `collectUnmet(allResults)` で収集（後述）。
5. `verifyLabels` を `collectVerify(allResults)` で収集し、**さらに `standard.verify_flags` を全件追加**。
6. `allConditionsMet = allResults.every(r => r.met)`（**allResults が空なら true**）。
7. `prerequisitesMet = (unmetPrerequisites.length === 0)`。
8. verdict を次の優先順で決定：

```
if (!allConditionsMet || !prerequisitesMet)  → "not_eligible"
else if (verifyLabels.length > 0)            → "needs_verify"
else                                         → "eligible"
```

**重要な帰結**：`verify_flags` が空でない基準は `verifyLabels` が常に非空になるため、**全条件を満たしても最良で `needs_verify`**。`eligible` になるのは「全条件 met かつ 前提 met かつ 条件単位 verify も基準単位 verify_flags も空」のときのみ。

### 6.3 `collectUnmet(results, acc)`

- composite かつ not-met：composite の label を push し、子へ再帰（未充足の葉も拾う）。
- composite かつ met：何も記録しない（OR/AND の結論を尊重し、満たした枝の内訳は出さない）。
- 葉かつ not-met：label を push。

### 6.4 `collectVerify(results, acc)`

- `needsVerify` の結果はその label を push。
- composite は常に子へも再帰。

### 6.5 `diagnoseAll(standards, inputs) → DiagnosisResult[]`（前提解決の反復）

前提（prerequisites）は他基準の判定結果に依存するため、不動点反復で解決する。

```
eligibleIds = ∅
repeat (最大 standards.length + 1 回):
    next = ∅
    for each s in standards:
        r = evaluateStandard(s, inputs, eligibleIds)
        if r.verdict != "not_eligible":   // eligible も needs_verify も前提充足とみなす
            next.add(s.id)
    if next == eligibleIds: break          // 収束
    eligibleIds = next
return standards.map(s => evaluateStandard(s, inputs, eligibleIds))
```

- **前提として認める判定**：`eligible` と `needs_verify`（`not_eligible` のみ前提不成立）。「要確認」でも要件自体は満たしているため、依存先の足切りには使わない。
- 反復回数 `N+1` で連鎖長 N の依存（A←B←C…）も収束する。現在のデータは前提1段（`gai_kansen_*`/`kokan_kyo` → `ha_shoshin`）のみ。
- 注：`diagnoseAll` 内の `byId` は現状未使用（無害なデッドコード）。

### 6.6 `collectAllQuestions(standards) → Condition[]`

全基準の5カテゴリを走査し、`key` を持つ葉条件を**重複排除（先勝ち）**して返す。composite は子へ再帰し、composite 自体（key 無し or 子持ち）は問診項目化しない。→ 問診UIの設問源。

---

## 7. 収益試算エンジン仕様（`lib/revenue.ts`）

定数 `YEN_PER_POINT = 10`。

### 7.1 `simulateRevenue(standard, monthlyCounts) → RevenueResult`（単一基準）

各 `linked_items[i]` について：

```
monthlyCount = monthlyCounts[item] ?? default_monthly_count_hint ?? 0
monthlyYen   = points_per_event * monthlyCount * 10
yearlyYen    = monthlyYen * 12
```

`RevenueResult = { lines: RevenueLineResult[], monthlyYenTotal, yearlyYenTotal, excludedStandards: [] }`。単体では除外判定なし。`RevenueLineResult` は `{ item, pointsPerEvent, monthlyCount, oncePerMonth?, monthlyYen, yearlyYen, excluded?, excludedReason? }`。

### 7.2 `simulateRevenueForMany(entries) → RevenueResult`（複数基準・排他適用）

`entries: { standard, monthlyCounts }[]`。

1. 基準ごとに `simulateRevenue` で小計 `subtotalMonthly` を出す。
2. `exclusive_group` ごとに、**小計最大の基準を勝者**にする（`winnerByGroup: group → standardId`）。最初の1件を暫定勝者、より大きい小計が出たら更新。
3. 各基準について：
   - 勝者でない（同 group に勝者が別にいる）→ その基準の全行を `excluded: true`、`monthlyYen=yearlyYen=0`、`excludedReason` を設定し、`excludedStandards` に `common_name` を追加。
   - それ以外 → 行をそのまま採用。
4. `monthlyYenTotal = Σ(採用行の monthlyYen)`、`yearlyYenTotal = monthlyYenTotal * 12`。

**排他グループ一覧（現データ）**：`gaikansen`（外感染1〜4）/ `gaianzen`（外安全1・2）/ `shoshin_type`（歯初診・病初診）/ `shien_type`（歯援診1・歯援病）。`exclusive_group` 未設定の基準は常に合算。

### 7.3 `formatYen(yen) → string`

`¥` + `Math.round(yen).toLocaleString("ja-JP")`（3桁区切り）。

### 7.4 `once_per_month`

回数計算には影響しない（患者あたり月1回＝医院全体の延べ回数は患者数だけ増えるため）。UI で「月1回/患者」バッジを表示し、回数欄が延べ算定回数であることを示すだけ。

---

## 8. 解説生成（LLM）と API 仕様

### 8.1 エンドポイント `POST /api/explain`（`app/api/explain/route.ts`）

**リクエスト body**（`ExplainInput`）

| フィールド | 型 | 必須 |
| --- | --- | --- |
| `official_name` | `string` | ○ |
| `verdict` | `"eligible"\|"needs_verify"\|"not_eligible"` | ○ |
| `unmetLabels` | `string[]` | △（既定 `[]`） |
| `verifyLabels` | `string[]` | △（既定 `[]`） |
| `unmetPrerequisites` | `string[]` | △（既定 `[]`） |

**バリデーション／レスポンス**

| 条件 | ステータス | body |
| --- | --- | --- |
| JSON パース失敗 | 400 | `{ error: "invalid json" }` |
| `official_name` か `verdict` 欠落 | 400 | `{ error: "official_name and verdict are required" }` |
| 正常 | 200 | `{ text: string, source: "llm" \| "fallback" }` |

### 8.2 解説生成（`lib/explain.ts:generateExplanation`）

- `process.env.ANTHROPIC_API_KEY` 未設定 → 即 `fallbackExplanation`（`source: "fallback"`）。
- 設定済み → Anthropic Messages API を呼ぶ：
  - URL `https://api.anthropic.com/v1/messages`、method POST。
  - ヘッダ：`content-type: application/json` / `x-api-key: <key>` / `anthropic-version: 2023-06-01`。
  - body：`{ model: env.ANTHROPIC_MODEL || "claude-sonnet-4-6", max_tokens: 500, system: SYSTEM_PROMPT, messages: [{ role: "user", content: userContent }] }`。
  - `userContent` は施設基準名・判定ラベル・未充足前提・不足要件・要確認論点を箇条書きで連結。
  - レスポンスの `content[].text`（type==="text"）を連結・trim。
  - `!res.ok` / 空テキスト / 例外 → `fallbackExplanation`（`source: "fallback"`）。成功時 `source: "llm"`。
- **SYSTEM_PROMPT の制約**：判定はしない／新しい要件・点数・様式を創作しない／断定が必要な箇所は「厚生局確認が必要」と添える／2〜4文・箇条書き最小限。

### 8.3 `fallbackExplanation(input) → string`

- `eligible`：「要件を満たしており届出可能。届出前に最新様式・告示で最終確認を」。
- `not_eligible`：未充足である旨＋（あれば）前提基準＋不足要件の箇条書き。
- `needs_verify`：要件は概ね充足だが解釈が割れる旨。
- 末尾に（あれば）要確認論点の箇条書き。

---

## 9. 質問収集・重複排除ロジック（`app/page.tsx:buildQuestionGroups`）

- 5カテゴリ（設備/人員/体制/実績/研修）ごとにバケットを用意。
- 全基準の各カテゴリを走査。composite は子へ再帰。`key` を持つ葉を、**全体で初出のときだけ**該当カテゴリに追加（`seen` で重複排除）。→ 複数基準で同じ `key`（例 `has_aed`）は1問に集約。
- 空カテゴリは除外して `QuestionGroup[]` を返す。
- `useMemo` でマウント時に1回だけ構築。

---

## 10. 画面仕様（3ステップ）

単一ページ（`app/page.tsx`）。`step: "input" | "result" | "revenue"` で表示を切替。上部に共通ヘッダとステップナビ。

### 10.1 ステップナビ

- 「1. 問診 / 2. 判定結果 / 3. 収益試算」のボタン。現在 step を `active` 表示。
- 2・3 は `results` が無い間は `disabled`。クリックで該当 step へ。

### 10.2 ステップ1：問診（`step==="input"`）

- 見出し＋説明（収録件数 `{standards.length}` を動的表示、自動保存の旨）。
- `Questionnaire` を表示。
- アクション：「判定する」（`runDiagnosis`）／「回答をリセット」（`resetInputs`、`window.confirm` 確認）。
- `runDiagnosis`：`diagnoseAll(standards, inputs)` を実行 → `results` 保存 → `step="result"` → `filter="all"` → 先頭へスクロール。

### 10.3 ステップ2：判定結果（`step==="result"`）

- 印刷専用タイトル（`.print-title`、画面では非表示）。
- サマリーバー：届出可能/要確認/届出不可の件数を色付きで表示。各カードは**クリックでその verdict に絞り込み**（同じものを再クリックで解除）。
- 絞り込み中は注記＋「解除」リンク。
- 「基本診療料系」「特掲診療料系」パネルに、`visible`（filter 適用後）を category 別に分けて `ResultCard` を並べる。空なら「該当する施設基準はありません」。
- アクション：「← 問診に戻る」「収益試算へ →」「チェックリストを印刷 / PDF」（`window.print()`）。
- 免責文。

### 10.4 ステップ3：収益試算（`step==="revenue"`）

- `RevenueSim` に `eligibleStandards`（`verdict !== "not_eligible"` の基準）を渡す。
- アクション：「← 判定結果に戻る」「試算を印刷 / PDF」。
- 免責文。

### 10.5 共通フッター

データ更新日・出典・免責（`no-print`）。

---

## 11. コンポーネント仕様

### 11.1 `Page`（`app/page.tsx`、Client）

- state：`step` / `inputs:UserInputs` / `results:DiagnosisResult[]|null` / `filter:ResultFilter` / `hydrated:boolean`。
- 派生（useMemo）：`groups`（問診設問）/ `eligibleStandards` / `counts`（3区分件数）/ `visible` / `basic` / `tokutei`。
- localStorage 連携（§12）。

### 11.2 `Questionnaire`（`components/Questionnaire.tsx`、Client）

- props：`groups: QuestionGroup[]` / `inputs` / `onChange(key, boolean|number)` / `onBulkAnswer?(keys[], boolean)`。
- 上部に**回答進捗バー**：全設問数と回答済み数・% を表示（`isAnswered = inputs[key] !== undefined`）。
- 各カテゴリは**アコーディオン**（既定で先頭セクションのみ開）。ヘッダにセクション内の回答数バッジ（全回答で `done` 表示）。
- セクション内に「すべて『はい』/『いいえ』」の一括回答（`onBulkAnswer`、設問2問以上のとき）。
- 設問行（`QuestionRow`）：
  - boolean → 「はい/いいえ」トグル（選択中を色表示）。
  - number_min/threshold → 数値入力＋単位表示。
  - `verify` の設問は「要確認」タグ、`note` があれば下に補足表示。
  - 回答済みは左ボーダー（緑）で可視化。

### 11.3 `ResultCard`（`components/ResultCard.tsx`、Client）

- props：`result: DiagnosisResult`。
- ヘッダ：略称＋（新設なら「令和8新設」タグ）＋正式名称・整理番号、右に verdict バッジ。
- 本文：未充足前提（前提基準名へ解決）／不足要件（`unmetLabels`）／要確認論点（`verifyLabels`）を箇条書き。
- アクション：「解説を表示」（`POST /api/explain` を叩き、`source` に応じて注記）／「点数・様式・出典を見る」（詳細トグル）。
- 詳細（`getStandardById` / `getOfficialForms`）：
  - 算定点数（fees）／届出様式（todokede・添付・電子申請可否）。
  - **整理番号＋確認厚生局**（`code_number_bureau`）。
  - **公式様式PDFリンク**（`officialForms`：共通届出書＋各様式。クリックで別タブ＝ワンタップ印刷）。
  - 厚生局・年度差の注意書き。
  - **経過措置**：`transitional_deadline` があれば**カウントダウンバッジ**（§13）＋ `transitional` 文。
  - 根拠（source_version）／出典リンク（sources）。
- state：`explain`（取得結果）/ `loading` / `showDetail`。

### 11.4 `RevenueSim`（`components/RevenueSim.tsx`、Client）

- props：`standards: DentalFacilityStandard[]`（届出可能＋要確認）。
- state：`included: Record<id, boolean>`（既定全 true）／`counts: Record<item, number>`（初期値は `default_monthly_count_hint`）。
- 上部に**対象基準のチェックボックス**（試算に含める基準を選択）。
- `simulateRevenueForMany`（`included` で絞った基準）で再計算（useMemo）。
- 表：算定項目／点数／月間回数（入力）／月額／年額。
  - `once_per_month` 行に「月1回/患者」バッジ。
  - `excluded` 行は淡色＋「併算定不可で除外」バッジ＋入力 disabled、金額 ¥0。
  - 合計行（月額・年額、年額は強調）。
- 表下の注記：除外された基準名＋「粗い上限の目安（月内回数制限・併算定不可・包括・査定は未反映）」。
- 対象0件時は案内表示。

---

## 12. 状態管理・永続化

- グローバル状態管理ライブラリは不使用。React `useState`/`useMemo`/`useEffect` のみ。
- **localStorage 永続化**（`page.tsx`）：
  - キー：`"dental-facility-inputs-v1"`。
  - 値：`inputs`（UserInputs）を `JSON.stringify`。
  - マウント時に読み込み・復元（パース失敗は無視）。`hydrated` フラグ確立後にのみ保存（初回の空上書き防止）。
  - `results`・`step`・`filter`・収益の `counts/included` は**保存しない**（再判定・再入力で再構築）。
- 保存対象は**医院の体制回答のみ**（患者個人データは扱わない＝個情法リスク低減の設計境界）。

---

## 13. 経過措置カウントダウン仕様（`ResultCard.deadlineInfo`）

入力 `dateStr`（YYYY-MM-DD）。

```
deadline = Date(`${dateStr}T23:59:59`)
days = ceil((deadline - now) / 86_400_000)
days < 0  → { label: "みなし終了済み（{dateStr}）", past: true }
days === 0 → { label: "本日みなし終了（{dateStr}）", past: false }
days > 0  → { label: "みなし終了まであと{days}日（{dateStr}まで）", past: false }
```

- `past` の場合はバッジを淡色（`.deadline-badge.past`）。
- 現在 `transitional_deadline` を持つ基準：歯医DX（ha_dx_1）・口管強（kokan_kyo）・歯援診1（shien_shin_1）・口実地（koku_jitchi）。値は `2027-05-31`（令和9年5月31日）。
- 評価はレンダー時の `new Date()`（クライアントのローカル時刻）。

---

## 14. 公式様式・ワンタップ印刷仕様（`data/standards.ts`）

- `officialForms: Record<standardId, OfficialForms>`。各 `OfficialForms` は `bureau`（"近畿 令和8"）・`common`（別添7/別添2）・`forms[]`（各様式）。
- URL は近畿厚生局の命名規則：
  - 基本診療料 共通届出書 別添7：`/kinki/r8-1-000-01.pdf`
  - 特掲診療料 共通届出書 別添2：`/kinki/r8-2-000-01.pdf`
  - 様式：基本 `/kinki/r8-k{様式}.pdf`、特掲 `/kinki/r8-t{様式}.pdf`
  - 整理番号別 別添：`/kinki/r8-1-{整理番号}.pdf`（基本）・`/kinki/r8-2-{整理番号}.pdf`（特掲）
- `ResultCard` 詳細で各リンクを `target="_blank" rel="noopener noreferrer"` で開く＝ブラウザの印刷でそのまま出力（様式を自作しない）。
- **注意**：URL・整理番号は厚生局・年度依存。GTR（`r8-2-484.pdf`）等は命名規則からの推定を含み「要確認」。UIに「管轄厚生局で要確認」を常時表示。

---

## 15. 印刷仕様（`@media print`）

- `.no-print` を全て非表示（ヘッダ・ステップナビ・各種ボタン・出典リンク・フッター・問診の一括回答 等）。
- `.print-title`（判定結果の印刷用見出し）を表示。
- カード・パネルは枠線付き・`break-inside: avoid`。背景は白。リンクの URL 追記は無効化。
- 「チェックリストを印刷 / PDF」「試算を印刷 / PDF」ボタンは `window.print()` を呼ぶだけ（ブラウザのPDF保存を利用）。

---

## 16. スタイル仕様（`app/globals.css`）

### 16.1 デザイントークン（`:root` CSS変数）

| 変数 | 値 | 用途 |
| --- | --- | --- |
| `--bg` | `#f6f7f9` | 背景 |
| `--panel` | `#ffffff` | パネル |
| `--border` | `#e3e6ea` | 罫線 |
| `--text` | `#1c2230` | 本文 |
| `--muted` | `#6b7280` | 補助テキスト |
| `--ok / --ok-bg` | `#157f3b / #e7f6ec` | 届出可能 |
| `--warn / --warn-bg` | `#9a6700 / #fff6e0` | 要確認 |
| `--ng / --ng-bg` | `#b42318 / #fdeceb` | 届出不可 |
| `--accent / --accent-bg` | `#1f6feb / #eaf1fe` | アクセント |

- フォント：`system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", Meiryo, sans-serif`。基準 15px / line-height 1.6。
- コンテナ最大幅 960px。

### 16.2 レスポンシブ（`@media (max-width: 640px)`）

本文14px、コンテナ余白縮小、ステップ縮小、詳細グリッド1列、問診行を縦積み、収益表の数値入力幅縮小、アクションボタンを伸長。

### 16.3 主なクラス

`.step/.panel/.accordion/.progress/.q-row/.toggle/.btn(.secondary/.ghost/.small)/.result-card(.v-*)/.badge(.eligible/.needs_verify/.not_eligible)/.detail-box/.form-links/.summary-bar .stat(.clickable/.sel)/.rev-table(.rev-excluded)/.cap-badge/.excluded-badge/.deadline-badge(.past)/.detail-note` 等。

---

## 17. 環境変数・ビルド・テスト

### 17.1 環境変数（すべて任意）

| 変数 | 既定 | 用途 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | （無） | 解説のLLM生成。未設定でフォールバック。 |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` | 解説モデル。 |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | （無） | 将来の永続化。現状未配線。 |

### 17.2 スクリプト（`package.json`）

`dev` / `build` / `start` / `lint`(next lint) / `typecheck`(tsc --noEmit) / `test`(node --test --import tsx test/*.test.ts)。

### 17.3 受け入れ条件

- `npm run typecheck` 無エラー。
- `npm test` 全件パス（現在17件）。
- `npm run build` 成功（ルート `/` 静的、`/api/explain` 動的）。

---

## 18. エッジケース・エラーハンドリング

| ケース | 挙動 |
| --- | --- |
| 全未回答で判定 | 各基準で条件未充足 → 全件 `not_eligible`（誤った可は出さない）。 |
| 数値欄に空文字 | `onChange` で 0 に正規化。number系条件は 0 で判定。 |
| localStorage 不可/破損 | try/catch で無視。空 `inputs` で続行。 |
| 解説 API 失敗・キー無 | `fallbackExplanation`（`source:"fallback"`）。UIで注記。 |
| 公式様式が未登録の id | 詳細の「公式様式PDF」ブロックを非表示。 |
| `transitional_deadline` 無 | カウントダウンバッジ非表示（`transitional` 文のみ）。 |
| 収益で同 exclusive_group 複数選択 | 最大1件のみ計上、他は除外行表示。 |

---

## 19. 既知の制約・非対応（要注意）

1. **空要件の基準は無条件 `eligible/needs_verify` になる**：`requirements` が全カテゴリ空だと `allResults.every` が true。現状24基準は全て条件1つ以上を持つため顕在化しないが、新規追加時は最低1条件を必須とする（実装上のガードは未導入）。同様に `composite_*` の `sub_conditions` 空も met=true になる。
2. **収益試算は「粗い上限」**：併算定不可は exclusive_group の単純排他のみ反映。包括化（まるめ）・月内回数上限・患者要件・査定は未反映。
3. **整理番号・様式PDFは厚生局/年度依存**：現状は確認した1〜2局の値。他局では異なる。一部URLは命名規則からの推定（要実在検証）。
4. **永続化・認証・デプロイ未実装**：localStorage のみ。マルチユーザー・端末間同期なし。
5. **`diagnoseAll` の `byId` は未使用**（無害なデッドコード）。
6. **解説 LLM はサーバ往復・コスト/レート制御未実装**（解説ボタン押下ごとに API 呼び出し。キャッシュ無し）。
7. **改定追従は手動**：`data/standards.ts` の手編集。自動監視・更新パイプライン未実装。

---

## 20. テストケース一覧（`test/engine.test.ts`、17件）

| # | テスト | 検証内容 |
| --- | --- | --- |
| 1 | boolean condition | true/false/undefined の met |
| 2 | number_min condition | 閾値以上/未満 |
| 3 | composite_or / and | OR/AND の met |
| 4 | nested composite | composite_and in composite_or |
| 5 | threshold type | threshold が number_min と同等 |
| 6 | verify bubble | verify=true かつ met で needsVerify |
| 7 | empty inputs → 全 not_eligible | 誤った可を出さない |
| 8 | ha_shoshin 全 true → needs_verify | verify_flags 持ちは eligible にならない |
| 9 | prerequisite ブロック | gai_kansen_1 は ha_shoshin 不成立で not_eligible |
| 10 | revenue 点数×回数×10 | 単一基準の金額 |
| 11 | revenue 複数合算 | 既定ヒントでの合算 |
| 12 | exclusive_group | 外感染1/2 で高い方のみ計上・他は除外 |
| 13 | 非衝突は合算 | exclusive_group 異なれば両方加算 |
| 14 | once_per_month 伝播 | 行に oncePerMonth が乗る |
| 15 | transitional_deadline 妥当性 | 日付がパース可能 |
| 16 | 一意 id・fee 1件以上・source 1件以上 | データ整合 |
| 17 | prerequisites 解決可能 | 前提 id が実在 |

---

（本書はコードと同期して更新すること。型・アルゴリズムを変更したら §5〜§8 と §20 を必ず追従させる。）

---

## 21. 追加機能（v2）：アンロック提案・届出ガイド

### 21.1 アンロック提案（`lib/suggest.ts` / `components/UnlockSuggestions.tsx`）

判定エンジンの出力（`unmetLabels` 不足要件 / `unmetPrerequisites` 不足前提）＋収益試算から、「あと一歩で出せる加算」を導出する。新規データ・新規調査は不要。

- `buildUnlockSuggestions(results, opts?) → UnlockSuggestion[]`
  - 対象は `verdict === "not_eligible"` のみ。
  - `gapCount = unmetLabels.length + unmetPrerequisites.length`。`maxGap`（既定3）以下のみ採用、`gapCount===0` は除外。
  - `gapPrerequisites` は前提を `getStandardById`/結果で解決（`alreadyAttainable`：前提が `not_eligible` 以外か、`ownGapCount`：前提自身の不足数）。
  - `prerequisiteOnly`：不足が前提のみ（自院要件は充足）。
  - `monthlyYen/yearlyYen = simulateRevenue(standard, {})`（既定ヒント・粗い上限）。
  - 並べ替え `sortSuggestions(list, "easiest"|"revenue")`：easiest=`gapCount`昇順→収益降順、revenue=収益降順→`gapCount`昇順。
- `buildPrerequisiteDominoes(results, standards) → PrerequisiteDomino[]`
  - `not_eligible` 基準の `unmetPrerequisites` を逆引きし、前提 id → 依存先 `common_name` 集合を作る。
  - 各 `PrerequisiteDomino`：`prerequisiteId/Name`・`attainable`・`unlocks[]`。`unlocks.length` 降順。
- UI：判定結果ページ上部のパネル（`no-print`）。並べ替えチップ、各カード（あとN項目・不足要件・前提・増収）、前提ドミノ、注意書き（要確認/粗い上限）。

### 21.2 届出ガイド（`lib/filing.ts` / `ResultCard` 詳細 + `components/CommonFilingRules.tsx`）

「どう出すか」をアプリ内で完結。手順・必要書類は様式データ（`forms`）から動的生成、共通ルール・宛先は一次照合の定数。

- `COMMON_FILING_RULES`：受理→算定（月末受理→翌月1日／月初開庁日受理→当月1日・遡及不可）、提出方法（正本1通・郵送/電子・FAX不可・押印不要/記名必須・副本不要）、令和8年6月向け受付期間（5/7〜6/1必着・5/25電子開始）、電子申請（324基準）。
- `BUREAUS`：8地方厚生（支）局＋厚労省一覧の届出案内URL。
- `buildProcedure(standard) → string[]`（5ステップ）：①要件を満たす（verify/前提の注記を動的付与）②`todokede_form`＋添付様式に記入 ③添付書類（`forms.attachments`）④管轄厚生局へ提出 ⑤受理日で算定開始。
- `buildRequiredDocuments(standard) → {label, sub?}[]`：届出書（正本1通）＋添付様式＋疎明資料。
- UI：`ResultCard` 詳細に「申請手順（ol）」「必要書類チェックリスト（チェック可・ローカル state）」を追加（既存の公式様式PDF・整理番号・経過措置と統合、ボタン名「届出ガイド・点数・様式を見る」）。`CommonFilingRules` は結果ページに共通ルール＋提出先の折りたたみパネルを1回表示。
- 印刷：申請手順・必要書類は印刷対象（様式PDFリンクは `no-print`）。詳細を開いた状態で「チェックリストを印刷」すると窓口持参用シートになる。

### 21.3 テスト追加（合計24件）

アンロック（前提のみgap抽出 / ドミノ集計 / not_eligibleのみ対象）、届出ガイド（手順5ステップ・必要書類に届出書を含む）。
