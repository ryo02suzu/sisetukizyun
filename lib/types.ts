// 統一スキーマ（パッケージ A. 統一JSONスキーマ定義 に対応）の TypeScript 型定義。
//
// 設計の要：
//   - 施設基準の「要件」は decision tree（条件木）としてデータ化する。
//   - 判定はルールエンジン（lib/engine.ts）が決定論的に行う。LLM は使わない。
//   - 解釈が割れる項目（常勤の定義 / 研修の有効性 / 経過措置 / 未確定の整理番号 等）は
//     condition.verify=true・standard.verify_flags で「要確認」に倒し、返還リスクを避ける。

/** 条件の種別。決定木の葉（leaf）または枝（composite）を表す。 */
export type ConditionType =
  | "boolean" // ユーザー回答が true なら充足
  | "number_min" // ユーザー回答(数値) >= number_min なら充足
  | "threshold" // ユーザー回答(数値) >= threshold なら充足（number_min の別名的用途）
  | "composite_or" // sub_conditions のいずれか1つ以上を充足
  | "composite_and"; // sub_conditions の全てを充足

/** 決定木の1ノード。ユーザー入力(key→value)に対して充足/未充足を評価する。 */
export interface Condition {
  /** ユーザー入力 user_inputs と紐づくキー。composite の場合は省略可。 */
  key?: string;
  /** 問診UIに表示するラベル（日本語）。 */
  label: string;
  /** 既定は "boolean"。 */
  type?: ConditionType;
  /** number_min 用のしきい値。 */
  number_min?: number;
  /** threshold 用のしきい値。 */
  threshold?: number;
  /** 数値入力の単位（"名" "回" "%" など）。UI 表示用。 */
  unit?: string;
  /** 列挙肢（select 入力にしたい場合）。 */
  options?: string[];
  /** composite_or / composite_and の子条件。 */
  sub_conditions?: Condition[];
  /**
   * true の場合、充足していても「要確認」として扱う。
   * 解釈が割れる要件（常勤性・研修の有効性・経過措置 等）に付与する。
   */
  verify?: boolean;
  /** 補足説明（任意）。 */
  note?: string;
}

/** 要件のカテゴリ別グルーピング。各配列は AND（すべて充足が必要）で評価する。 */
export interface Requirements {
  /** 設備 */
  equipment: Condition[];
  /** 人員 */
  staff: Condition[];
  /** 体制 */
  system: Condition[];
  /** 実績 */
  performance: Condition[];
  /** 研修 */
  training: Condition[];
}

/** 算定できる点数項目。 */
export interface Fee {
  item_name: string;
  /** 点数。0 は「届出が前提だが本項目自体は点数なし」等を表す。 */
  points: number;
  /** 単位（"点" 固定が基本）。 */
  unit?: string;
  /** 算定頻度・回数の注記（"1回につき" "月1回" 等）。 */
  frequency_note?: string;
}

/** 届出様式まわり。 */
export interface Forms {
  /** 届出書（別添）様式番号。 */
  todokede_form: string;
  /** 添付様式番号の配列。 */
  attachment_forms: string[];
  /** 添付書類（様式以外の疎明資料）。 */
  attachments: string[];
  /**
   * 電子申請（保険医療機関等電子申請・届出等システム）対応可否。
   * true=対応 / false=非対応 / null=未確認。
   */
  e_application_available: boolean | null;
}

/** 収益試算のための「点数 × 月間算定回数 × 10円」係数モデル。 */
export interface RevenueSimItem {
  item: string;
  /** 1回あたり点数。 */
  points_per_event: number;
  /** UI の月間回数入力の初期値ヒント。 */
  default_monthly_count_hint?: number;
  /** 患者1人につき月1回までの算定（延べ回数の意味を明示するための表示用フラグ）。 */
  once_per_month?: boolean;
}

export interface RevenueSim {
  linked_items: RevenueSimItem[];
  /** 人が読める算定式（表示用）。実際の計算は lib/revenue.ts が linked_items から行う。 */
  formula: string;
  /**
   * 同月に併算定できない（＝医療機関として通常いずれか一方しか算定しない）基準のグループID。
   * 同じ exclusive_group を持つ基準が複数選択された場合、試算では最も収益の高い1つだけを計上する
   * （例：外感染1〜4は通常いずれか1区分のみ、歯初診と病初診は施設種別で排他）。
   */
  exclusive_group?: string;
}

export type StandardCategory = "基本診療料" | "特掲診療料";
export type RevisionStatus = "新設" | "改定" | "廃止" | "継続" | "未確定";

/** 施設基準1件分の構造化データ（DentalFacilityStandard）。 */
export interface DentalFacilityStandard {
  /** スラッグ（例: 'ha_shoshin'）。 */
  id: string;
  /** 正式名称。 */
  official_name: string;
  /** 通称・略称（例: '歯初診'）。 */
  common_name: string;
  /** 整理番号（例: '1-16'）。整理番号は地方厚生局・改定年度ごとに振り直されるため確定値ではない。 */
  code_number: string;
  /** code_number を確認した地方厚生局・年度（例: '東海北陸 令和8'）。未確認の場合は省略。 */
  code_number_bureau?: string;
  /** 告示・通知の参照（例: '初診料 注1'）。 */
  notification_ref: string;
  category: StandardCategory;
  /** 令和8年度改定での区分。 */
  new_or_revised_r8: RevisionStatus;
  /** 前提となる他基準の id（例: 歯科外来診療感染対策加算は歯初診が前提）。 */
  prerequisites: string[];
  requirements: Requirements;
  fees: Fee[];
  forms: Forms;
  /** 経過措置の記述（任意）。 */
  transitional: string;
  /** 経過措置の「みなし終了日」（YYYY-MM-DD）。UIで「あと○日」のカウントダウンに使う。 */
  transitional_deadline?: string;
  revenue_sim: RevenueSim;
  /** この基準に関して「要確認」とすべき論点。UI に注意表示する。 */
  verify_flags: string[];
  /** データ更新日（YYYY-MM-DD）。 */
  last_updated: string;
  /** 根拠の版（告示番号・通知番号など）。 */
  source_version: string;
  /** 一次情報の URL 群。 */
  sources: string[];
}

// ── 判定結果まわり ────────────────────────────────────────

/** ユーザーの問診回答。key → 値（boolean / number / string）。 */
export type UserInputs = Record<string, boolean | number | string | undefined>;

/** 1条件の評価結果。 */
export interface ConditionResult {
  key?: string;
  label: string;
  met: boolean;
  /** verify=true の条件が met の場合に true。 */
  needsVerify: boolean;
  /** composite の場合の子結果。 */
  children?: ConditionResult[];
}

export type Verdict = "eligible" | "not_eligible" | "needs_verify";

/** 施設基準1件の判定結果。 */
export interface DiagnosisResult {
  standardId: string;
  official_name: string;
  common_name: string;
  category: StandardCategory;
  verdict: Verdict;
  /** カテゴリ別の条件評価。 */
  conditionResults: {
    equipment: ConditionResult[];
    staff: ConditionResult[];
    system: ConditionResult[];
    performance: ConditionResult[];
    training: ConditionResult[];
  };
  /** 充足していない条件のラベル一覧（解説生成の入力に使う）。 */
  unmetLabels: string[];
  /** 要確認の条件・論点のラベル一覧。 */
  verifyLabels: string[];
  /** 未充足の前提基準 id。 */
  unmetPrerequisites: string[];
}
