"use client";

import { useState } from "react";
import type { DiagnosisResult } from "@/lib/types";
import { getStandardById, getOfficialForms } from "@/data/standards";
import { buildProcedure, buildRequiredDocuments } from "@/lib/filing";
import { collectUnmetLabels } from "@/lib/engine";

const CATEGORY_ORDER = [
  { key: "equipment", label: "設備" },
  { key: "staff", label: "人員" },
  { key: "system", label: "体制" },
  { key: "performance", label: "実績" },
  { key: "training", label: "研修" },
] as const;

const VERDICT_LABEL: Record<DiagnosisResult["verdict"], string> = {
  eligible: "届出可能",
  needs_verify: "要確認",
  not_eligible: "届出不可",
};

/** 経過措置の「みなし終了日」から、現在日基準の残日数ラベルを作る。 */
function deadlineInfo(dateStr: string): { label: string; past: boolean } {
  const deadline = new Date(`${dateStr}T23:59:59`);
  const now = new Date();
  const days = Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return { label: `みなし終了済み（${dateStr}）`, past: true };
  if (days === 0) return { label: `本日みなし終了（${dateStr}）`, past: false };
  return { label: `みなし終了まであと${days}日（${dateStr}まで）`, past: false };
}

export default function ResultCard({
  result,
  bureau,
}: {
  result: DiagnosisResult;
  bureau?: string;
}) {
  const [explain, setExplain] = useState<{ text: string; source: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [checkedDocs, setCheckedDocs] = useState<Record<number, boolean>>({});
  const standard = getStandardById(result.standardId);
  const official = getOfficialForms(result.standardId, bureau);

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
          {CATEGORY_ORDER.map(({ key, label }) => {
            const items = collectUnmetLabels(result.conditionResults[key]);
            if (items.length === 0) return null;
            return (
              <div className="unmet-cat" key={key}>
                <span className={`cat-chip cat-${key}`}>{label}</span>
                <ul>
                  {items.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            );
          })}
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
            {showDetail ? "閉じる" : "届出ガイド・点数・様式を見る"}
          </button>
        )}
      </div>

      {explain && (
        <div className="explain-box">
          {explain.text}
          <span className="src">
            {explain.source === "llm"
              ? "※ AI（Claude）が判定結果を言い換えた解説です。判定ロジックは決定論的（同じ入力には同じ結果を返す）ですが、結論の正しさを保証するものではありません。要確認・経過措置・整理番号・様式は厚生局で最終確認してください。"
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

          <div className="filing-guide">
            <div className="detail-label">申請手順</div>
            <ol className="filing-steps">
              {buildProcedure(standard).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="filing-guide">
            <div className="detail-label">必要書類チェックリスト</div>
            <ul className="filing-docs">
              {buildRequiredDocuments(standard).map((d, i) => (
                <li key={i}>
                  <label>
                    <input
                      type="checkbox"
                      checked={checkedDocs[i] ?? false}
                      onChange={(e) =>
                        setCheckedDocs((prev) => ({ ...prev, [i]: e.target.checked }))
                      }
                    />
                    {d.label}
                    {d.sub ? <span className="doc-sub">（{d.sub}）</span> : null}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="detail-row">
            <span className="detail-label">整理番号</span> {standard.code_number}
            {standard.code_number_bureau ? `（${standard.code_number_bureau}）` : ""}
          </div>

          {official && (
            <div className="detail-row no-print">
              <div className="detail-label">
                公式様式PDF（{official.bureau}・クリックで開いて印刷）
              </div>
              <div className="form-links">
                <a href={official.common.url} target="_blank" rel="noopener noreferrer">
                  📄 {official.common.label}
                </a>
                {official.forms.map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noopener noreferrer">
                    📄 {f.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="detail-note">
            ※ 整理番号・様式番号は全国共通です。様式PDFは選択中の管轄局（
            {official?.bureau ?? "近畿厚生局 令和8"}）のものを表示しています。改定年度・局の更新で
            差し替わる場合があるため、提出前に管轄局の令和8年度 届出様式一覧で最終確認してください。
          </div>

          {(standard.transitional || standard.transitional_deadline) && (
            <div className="detail-row">
              <span className="detail-label">経過措置</span>
              {standard.transitional_deadline && (
                <span
                  className={`deadline-badge ${
                    deadlineInfo(standard.transitional_deadline).past ? "past" : ""
                  }`}
                >
                  {deadlineInfo(standard.transitional_deadline).label}
                </span>
              )}{" "}
              {standard.transitional}
              {standard.transitional_deadline && (
                <span className="doc-sub">
                  {" "}
                  ※ 期限までは経過措置（みなし）の扱い。期限後は新基準を満たす必要があるため、並行して体制整備を。
                </span>
              )}
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
