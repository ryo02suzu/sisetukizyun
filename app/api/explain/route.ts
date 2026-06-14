import { NextResponse } from "next/server";
import { generateExplanation, type ExplainInput } from "@/lib/explain";

// POST /api/explain
// body: ExplainInput（判定結果の要約）
// 返り値: { text, source }  source は "llm" | "fallback"
export async function POST(req: Request) {
  let body: Partial<ExplainInput>;
  try {
    body = (await req.json()) as Partial<ExplainInput>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.official_name || !body.verdict) {
    return NextResponse.json({ error: "official_name and verdict are required" }, { status: 400 });
  }

  const input: ExplainInput = {
    official_name: body.official_name,
    verdict: body.verdict,
    unmetLabels: body.unmetLabels ?? [],
    verifyLabels: body.verifyLabels ?? [],
    unmetPrerequisites: body.unmetPrerequisites ?? [],
  };

  const result = await generateExplanation(input);
  return NextResponse.json(result);
}
