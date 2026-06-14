"use client";

import { useState } from "react";
import type { DiagnosisResult } from "@/lib/types";
import { getStandardById } from "@/data/standards";

const VERDICT_LABEL: Record<DiagnosisResult["verdict"], string> = {
  eligible: "届出可能",
  needs_verify: "要確認",
  not_eligible: "届出不可",
};

export default function ResultCard({ result }: { result: DiagnosisResult }) {
  const [explain, setExplain] = useState<{ text: string; source: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const standard = getStandardById(result.standardId);

  async function fetchExplanation() {
    setLoading(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          official_name: result.official_name,
          verdict: result.verdict,
          unmetLabels: result.unmetLabels,
          verifyLabels: result.verifyLabels,
          unmetPrerequisites: result.unmetPrerequisites,
        }),
      });
      const data = await res.json();
      setExplain({ text: data.text, source: data.source });
    } catch {
      setExplain({ text: "解説の取得に失敗しました。", source: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="result-card">
      <div className="result-head">
        <div className="result-title">
          {result.common_name}
          <span className="code">
            {result.official_name}
            {standard ? `／整理番号 ${standard.code_number}` : ""}
          </span>
        </div>
        <span className={`badge ${result.verdict}`}>{VERDICT_LABEL[result.verdict]}</span>
      </div>

      {result.unmetPrerequisites.length > 0 && (
        <div className="reasons">
          <span className="heading">前提となる施設基準が未届出：</span>
          <ul>
            {result.unmetPrerequisites.map((p) => {
              const s = getStandardById(p);
              return <li key={p}>{s ? `${s.common_name}（${s.official_name}）` : p}</li>;
            })}
          </ul>
        </div>
      )}

      {result.unmetLabels.length > 0 && (
        <div className="reasons">
          <span className="heading">不足している要件：</span>
          <ul>
            {result.unmetLabels.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      {result.verifyLabels.length > 0 && (
        <div className="reasons">
          <span className="heading">届出前に確認すべき論点：</span>
          <ul>
            {result.verifyLabels.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <button
          type="button"
          className="btn secondary small"
          onClick={fetchExplanation}
          disabled={loading}
        >
          {loading ? "生成中…" : "解説を表示"}
        </button>
      </div>

      {explain && (
        <div className="explain-box">
          {explain.text}
          <span className="src">
            {explain.source === "llm"
              ? "※ AI（Claude）が判定結果を言い換えた解説です。判定自体はルールエンジンによる確定的なものです。"
              : "※ ルールベースの解説です（AI解説は ANTHROPIC_API_KEY 設定時に有効）。"}
          </span>
        </div>
      )}
    </div>
  );
}
