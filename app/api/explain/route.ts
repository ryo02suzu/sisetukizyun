import { NextResponse } from "next/server";
import { generateExplanation, type ExplainInput } from "@/lib/explain";

// POST /api/explain
// body: ExplainInput（判定結果の要約）
// 返り値: { text, source }  source は "llm" | "fallback" | "rate_limited"
//
// 入力ハードニング：解説はユーザー入力（クライアント）から呼ばれるため、
// 長さ・型・列挙値を検証し、プロンプト注入や過大なトークン消費を抑える。
// さらに、課金LLMを叩く公開エンドポイントのため、(1)ボディサイズ上限、
// (2)IP単位の簡易レート制限、(3)同一入力の短期キャッシュで濫用コストを抑える。
const VALID_VERDICTS = new Set(["eligible", "needs_verify", "not_eligible"]);
const MAX_NAME = 200;
const MAX_LABEL = 200;
const MAX_ITEMS = 30;
const MAX_BODY_BYTES = 16 * 1024; // 16KB（解説要約には十分。超過は拒否）

// ─── 簡易レート制限（IP単位・スライディングウィンドウ）────────────────────────
// サーバーレスではインスタンス単位のベストエフォート。本格運用では
// Upstash/Vercel KV 等の共有ストアへ置き換える前提のフォールバック実装。
const RL_WINDOW_MS = 60_000;
const RL_MAX = 20; // 1IPあたり 20req / 60s
const hits = new Map<string, number[]>();

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function rateLimited(ip: string, now: number): boolean {
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) {
    // メモリ肥大の防止：古いIPエントリを掃除。
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RL_WINDOW_MS)) hits.delete(k);
    }
  }
  return arr.length > RL_MAX;
}

// ─── 同一入力の短期キャッシュ（重複した課金呼び出しを抑える）────────────────
const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<string, { text: string; source: string; ts: number }>();

function cacheKey(input: ExplainInput): string {
  return JSON.stringify([
    input.official_name,
    input.verdict,
    input.unmetLabels,
    input.verifyLabels,
    input.unmetPrerequisites,
  ]);
}

function cleanStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .slice(0, MAX_ITEMS)
    .map((s) => s.slice(0, MAX_LABEL));
}

export async function POST(req: Request) {
  const now = Date.now();

  // (1) ボディサイズ上限：JSON.parse 前に Content-Length と実バイト長で二重チェック。
  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }
  const rawText = await req.text();
  if (rawText.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  // (2) レート制限：超過時はフォールバック文を 429 で返し、UIは穏やかに劣化させる。
  if (rateLimited(clientIp(req), now)) {
    return NextResponse.json(
      {
        text: "アクセスが集中しているため、AI解説の生成を一時的に制限しています。少し時間をおいて再度お試しください（判定結果は上に表示されています）。",
        source: "rate_limited",
      },
      { status: 429 },
    );
  }

  let body: Partial<ExplainInput>;
  try {
    body = JSON.parse(rawText) as Partial<ExplainInput>;
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

  // (3) キャッシュヒットなら課金呼び出しを行わない。
  const key = cacheKey(input);
  const cached = cache.get(key);
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({ text: cached.text, source: cached.source });
  }

  const result = await generateExplanation(input);
  cache.set(key, { text: result.text, source: result.source, ts: now });
  return NextResponse.json(result);
}
