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
  const [showDetail, setShowDetail] = useState(false);
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
    <div className={`result-card v-${result.verdict}`}>
      <div className="result-head">
        <div className="result-title">
          {result.common_name}
          {standard?.new_or_revised_r8 === "新設" && <span className="tag-new">令和8新設</span>}
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

      <div className="card-actions no-print">
        <button
          type="button"
          className="btn secondary small"
          onClick={fetchExplanation}
          disabled={loading}
        >
          {loading ? "生成中…" : "解説を表示"}
        </button>
        {standard && (
          <button
            type="button"
            className="btn ghost small"
            onClick={() => setShowDetail((v) => !v)}
            aria-expanded={showDetail}
          >
            {showDetail ? "詳細を閉じる" : "点数・様式・出典を見る"}
          </button>
        )}
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

      {showDetail && standard && (
        <div className="detail-box">
          <div className="detail-grid">
            <div>
              <div className="detail-label">算定できる点数</div>
              <ul className="detail-list">
                {standard.fees.map((f, i) => (
                  <li key={i}>
                    {f.item_name}：<strong>{f.points}点</strong>
                    {f.frequency_note ? `（${f.frequency_note}）` : ""}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="detail-label">届出様式</div>
              <ul className="detail-list">
                <li>届出書：{standard.forms.todokede_form}</li>
                {standard.forms.attachment_forms.length > 0 && (
                  <li>添付様式：{standard.forms.attachment_forms.join("、")}</li>
                )}
                <li>
                  電子申請：
                  {standard.forms.e_application_available === true
                    ? "対応"
                    : standard.forms.e_application_available === false
                      ? "非対応"
                      : "要確認"}
                </li>
              </ul>
            </div>
          </div>

          {standard.transitional && (
            <div className="detail-row">
              <span className="detail-label">経過措置</span> {standard.transitional}
            </div>
          )}

          <div className="detail-row">
            <span className="detail-label">根拠</span> {standard.source_version}
          </div>

          <div className="detail-row no-print">
            <span className="detail-label">出典</span>
            <span className="src-links">
              {standard.sources.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  [{i + 1}]
                </a>
              ))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
