import type { DiagnosisResult } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// 不可理由・要確認の「解説」生成
//
// LLM の役割はここだけ：判定結果（決定木が出した事実）を、人が読みやすい日本語に
// 言い換える。判定そのものは一切させない（プロンプトでも明示する）。
// ANTHROPIC_API_KEY 未設定時はルールベースのフォールバック文を返す。
// ─────────────────────────────────────────────────────────────────────────────

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";

export interface ExplainInput {
  official_name: string;
  verdict: DiagnosisResult["verdict"];
  unmetLabels: string[];
  verifyLabels: string[];
  unmetPrerequisites: string[];
}

/** API キーが無い・失敗した場合のルールベース解説。 */
export function fallbackExplanation(input: ExplainInput): string {
  if (input.verdict === "eligible") {
    return `「${input.official_name}」は、入力された情報の範囲では要件を満たしており、届出可能と判定されました。届出前に最新の様式・告示で最終確認してください。`;
  }

  const parts: string[] = [];
  if (input.verdict === "not_eligible") {
    parts.push(`「${input.official_name}」は、現状では届出要件を満たしていません。`);
    if (input.unmetPrerequisites.length > 0) {
      parts.push(`前提となる施設基準（${input.unmetPrerequisites.join("、")}）の届出が先に必要です。`);
    }
    if (input.unmetLabels.length > 0) {
      parts.push("不足している要件：");
      for (const l of input.unmetLabels) parts.push(`・${l}`);
    }
  } else {
    parts.push(`「${input.official_name}」は要件を満たしている可能性が高いですが、解釈が分かれる論点があるため「要確認」です。`);
  }
  if (input.verifyLabels.length > 0) {
    parts.push("届出前に確認すべき論点：");
    for (const l of input.verifyLabels) parts.push(`・${l}`);
  }
  return parts.join("\n");
}

const SYSTEM_PROMPT = `あなたは歯科の保険診療・施設基準に詳しいアシスタントです。
あなたの仕事は「判定」ではありません。判定はすでにルールエンジンが完了しています。
与えられた判定結果（充足していない要件・要確認の論点）を、歯科医院の事務担当者にも分かるやさしい日本語で2〜4文に要約・解説してください。
制約：
- 新しい要件・点数・様式番号を創作しないこと。与えられた事実のみを言い換えること。
- 断定が必要な箇所（経過措置・常勤の定義など）は「厚生局への確認が必要」と添えること。
- 箇条書きは最小限にし、簡潔にすること。`;

export async function generateExplanation(input: ExplainInput): Promise<{
  text: string;
  source: "llm" | "fallback";
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { text: fallbackExplanation(input), source: "fallback" };
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const userContent = [
    `施設基準：${input.official_name}`,
    `判定：${verdictLabel(input.verdict)}`,
    input.unmetPrerequisites.length
      ? `未充足の前提基準：${input.unmetPrerequisites.join("、")}`
      : "",
    input.unmetLabels.length ? `不足している要件：\n- ${input.unmetLabels.join("\n- ")}` : "",
    input.verifyLabels.length ? `要確認の論点：\n- ${input.verifyLabels.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      return { text: fallbackExplanation(input), source: "fallback" };
    }
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) return { text: fallbackExplanation(input), source: "fallback" };
    return { text, source: "llm" };
  } catch {
    return { text: fallbackExplanation(input), source: "fallback" };
  }
}

function verdictLabel(v: DiagnosisResult["verdict"]): string {
  switch (v) {
    case "eligible":
      return "届出可能";
    case "needs_verify":
      return "要確認（要件は概ね充足）";
    case "not_eligible":
      return "届出不可（要件未充足）";
  }
}
