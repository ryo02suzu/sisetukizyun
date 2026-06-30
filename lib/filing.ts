import type { DentalFacilityStandard } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// 届出ガイド（申請手順・必要書類・共通ルール・宛先）
//
// 申請手順と必要書類は、各基準の forms（届出書・添付様式・疎明資料）から動的に生成する。
// 共通の届出ルール（受理→算定の関係・提出方法・受付期間・電子申請）は一次情報で確認した定数。
// 整理番号・様式と同様、宛先（地方厚生局）は管轄により異なる。
// ─────────────────────────────────────────────────────────────────────────────

/** 全基準共通の届出ルール（厚労省・各地方厚生局で確認）。 */
export const COMMON_FILING_RULES: { label: string; text: string }[] = [
  {
    label: "受理日と算定開始",
    text: "月末までに受理されれば翌月1日から、月の最初の開庁日に受理されれば当月1日から算定できる。遡及算定は不可。",
  },
  {
    label: "提出方法",
    text: "正本1通を郵送、または「保険医療機関等電子申請・届出等システム」で電子申請。FAX不可。押印は不要だが開設者・管理者（院長）の記名・職名は必須。副本の提出は不要（控えは院内保管）。",
  },
  {
    label: "令和8年6月算定向けの受付期間",
    text: "令和8年6月1日から算定するには 令和8年5月7日〜6月1日（必着）に届出（窓口混雑回避のため5月18日までの提出が推奨）。電子申請の受付は5月25日開始。以降は通常の受理日基準。",
  },
  {
    label: "電子申請",
    text: "令和8年1月時点で324の施設基準が電子申請に対応（GビズID認証）。郵送・電子いずれも可。",
  },
];

/** 地方厚生（支）局の施設基準 届出案内ページ。宛先は自院の所在地を管轄する局。 */
export const BUREAUS: { name: string; url: string }[] = [
  { name: "厚労省 地方厚生局 一覧（管轄を確認）", url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/shido_kansa.html" },
  { name: "北海道厚生局", url: "https://kouseikyoku.mhlw.go.jp/hokkaido/" },
  { name: "東北厚生局", url: "https://kouseikyoku.mhlw.go.jp/tohoku/" },
  { name: "関東信越厚生局", url: "https://kouseikyoku.mhlw.go.jp/kantoshinetsu/" },
  { name: "東海北陸厚生局", url: "https://kouseikyoku.mhlw.go.jp/tokaihokuriku/" },
  { name: "近畿厚生局", url: "https://kouseikyoku.mhlw.go.jp/kinki/" },
  { name: "中国四国厚生局", url: "https://kouseikyoku.mhlw.go.jp/chugokushikoku/" },
  { name: "四国厚生支局", url: "https://kouseikyoku.mhlw.go.jp/shikoku/" },
  { name: "九州厚生局", url: "https://kouseikyoku.mhlw.go.jp/kyushu/" },
];

/** 基準ごとの申請手順を、様式データ＋共通ルールから生成する。 */
export function buildProcedure(s: DentalFacilityStandard): string[] {
  const attach = s.forms.attachment_forms.length
    ? `＋添付様式（${s.forms.attachment_forms.join("・")}）`
    : "";
  const prereqNote =
    s.prerequisites.length > 0
      ? "（前提となる施設基準の届出を先に済ませる）"
      : "";
  const verifyNote = s.verify_flags.length > 0 ? "（「要確認」の論点は事前に厚生局へ確認）" : "";
  const docs =
    s.forms.attachments.length > 0
      ? `添付書類（${s.forms.attachments.join("、")}）を揃える`
      : "必要に応じて疎明資料（研修修了証の写し等）を揃える";

  // 提出方法は基準ごとに異なる。電子申請に非対応の基準（例：ベースアップ評価料は
  // 電子申請・届出システムでは受け付けず専用の方法で提出）に「電子申請可」と
  // 案内すると受理されず算定開始が遅れるため、e_application_available で分岐する。
  const submit =
    s.forms.e_application_available === false
      ? `提出：本基準は電子申請・届出システムでは受け付けません。管轄の地方厚生（支）局が定める本基準専用の提出方法（所定の様式・提出先）に従って提出（FAX不可・押印不要／開設者・管理者の記名は必須）`
      : `提出：自院を管轄する地方厚生（支）局へ 正本1通を郵送 または 電子申請（FAX不可・押印不要／開設者・管理者の記名は必須・副本不要）`;

  return [
    `要件を満たす：本基準の設備・人員・体制・実績・研修の要件をすべて満たす${verifyNote}${prereqNote}`,
    `届出書に記入：${s.forms.todokede_form}${attach} に記入する`,
    docs,
    submit,
    `算定開始：月末までに受理されれば翌月1日から、月の最初の開庁日に受理されれば当月1日から算定（遡及不可）`,
  ];
}

export interface RequiredDocument {
  label: string;
  sub?: string;
}

/** 基準ごとの必要書類チェックリストを生成する。 */
export function buildRequiredDocuments(s: DentalFacilityStandard): RequiredDocument[] {
  const docs: RequiredDocument[] = [];
  docs.push({ label: `届出書 ${s.forms.todokede_form}`, sub: "正本1通" });
  for (const f of s.forms.attachment_forms) docs.push({ label: f, sub: "添付様式" });
  for (const a of s.forms.attachments) docs.push({ label: a, sub: "疎明資料" });
  return docs;
}
