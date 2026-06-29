import { NextResponse } from "next/server";
import { generateExplanation, type ExplainInput } from "@/lib/explain";

// POST /api/explain
// body: ExplainInput（判定結果の要約）
// 返り値: { text, source }  source は "llm" | "fallback"
//
// 入力ハードニング：解説はユーザー入力（クライアント）から呼ばれるため、
// 長さ・型・列挙値を検証し、プロンプト注入や過大なトークン消費を抑える。
const VALID_VERDICTS = new Set(["eligible", "needs_verify", "not_eligible"]);
const MAX_NAME = 200;
const MAX_LABEL = 200;
const MAX_ITEMS = 30;

function cleanStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .slice(0, MAX_ITEMS)
    .map((s) => s.slice(0, MAX_LABEL));
}

export async function POST(req: Request) {
  let body: Partial<ExplainInput>;
  try {
    body = (await req.json()) as Partial<ExplainInput>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (typeof body.official_name !== "string" || !body.official_name.trim()) {
    return NextResponse.json({ error: "official_name is required" }, { status: 400 });
  }
  if (typeof body.verdict !== "string" || !VALID_VERDICTS.has(body.verdict)) {
    return NextResponse.json({ error: "verdict is invalid" }, { status: 400 });
  }

  const input: ExplainInput = {
    official_name: body.official_name.slice(0, MAX_NAME),
    verdict: body.verdict as ExplainInput["verdict"],
    unmetLabels: cleanStrings(body.unmetLabels),
    verifyLabels: cleanStrings(body.verifyLabels),
    unmetPrerequisites: cleanStrings(body.unmetPrerequisites),
  };

  const result = await generateExplanation(input);
  return NextResponse.json(result);
}
