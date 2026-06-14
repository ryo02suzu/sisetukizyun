"use client";

import { useState } from "react";
import type { Condition, UserInputs } from "@/lib/types";

export interface QuestionGroup {
  title: string;
  questions: Condition[];
}

interface Props {
  groups: QuestionGroup[];
  inputs: UserInputs;
  onChange: (key: string, value: boolean | number) => void;
  /** セクション一括回答（はい/いいえ）。 */
  onBulkAnswer?: (keys: string[], value: boolean) => void;
}

function isAnswered(q: Condition, inputs: UserInputs): boolean {
  const v = q.key ? inputs[q.key] : undefined;
  return v !== undefined;
}

export default function Questionnaire({ groups, inputs, onChange, onBulkAnswer }: Props) {
  const totalQ = groups.reduce((n, g) => n + g.questions.length, 0);
  const answeredQ = groups.reduce(
    (n, g) => n + g.questions.filter((q) => isAnswered(q, inputs)).length,
    0,
  );
  const pct = totalQ === 0 ? 0 : Math.round((answeredQ / totalQ) * 100);

  // 既定で最初のセクションだけ開く。
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g, i) => [g.title, i === 0])),
  );

  return (
    <>
      <div className="progress">
        <div className="progress-head">
          <span>回答状況</span>
          <span className="progress-count">
            {answeredQ} / {totalQ} 問（{pct}%）
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="progress-hint">
          未回答の項目は「いいえ」とみなして判定します。当てはまる設備・体制だけ「はい」にしてください。
        </p>
      </div>

      {groups.map((g) => {
        const ans = g.questions.filter((q) => isAnswered(q, inputs)).length;
        const isOpen = open[g.title];
        const keys = g.questions.map((q) => q.key as string).filter(Boolean);
        return (
          <div className={`accordion ${isOpen ? "open" : ""}`} key={g.title}>
            <button
              type="button"
              className="accordion-head"
              onClick={() => setOpen((p) => ({ ...p, [g.title]: !p[g.title] }))}
              aria-expanded={isOpen}
            >
              <span className="chevron" aria-hidden>
                {isOpen ? "▾" : "▸"}
              </span>
              <span className="accordion-title">{g.title}</span>
              <span className={`section-count ${ans === g.questions.length ? "done" : ""}`}>
                {ans}/{g.questions.length}
              </span>
            </button>

            {isOpen && (
              <div className="accordion-body">
                {onBulkAnswer && keys.length > 1 && (
                  <div className="bulk-row">
                    <span>このセクションを一括：</span>
                    <button type="button" className="link-btn" onClick={() => onBulkAnswer(keys, true)}>
                      すべて「はい」
                    </button>
                    <button type="button" className="link-btn" onClick={() => onBulkAnswer(keys, false)}>
                      すべて「いいえ」
                    </button>
                  </div>
                )}
                {g.questions.map((q) => (
                  <QuestionRow key={q.key} q={q} inputs={inputs} onChange={onChange} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function QuestionRow({
  q,
  inputs,
  onChange,
}: {
  q: Condition;
  inputs: UserInputs;
  onChange: (key: string, value: boolean | number) => void;
}) {
  const key = q.key as string;
  const type = q.type ?? "boolean";
  const value = inputs[key];
  const answered = value !== undefined;

  return (
    <div className={`q-row ${answered ? "answered" : "unanswered"}`}>
      <div className="q-label">
        {q.label}
        {q.verify && <span className="verify-tag">要確認</span>}
        {q.note && <span className="q-note">{q.note}</span>}
      </div>
      {type === "number_min" || type === "threshold" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <input
            type="number"
            value={typeof value === "number" ? value : ""}
            onChange={(e) => onChange(key, e.target.value === "" ? 0 : Number(e.target.value))}
            min={0}
            aria-label={q.label}
          />
          {q.unit && <span style={{ fontSize: 13, color: "var(--muted)" }}>{q.unit}</span>}
        </div>
      ) : (
        <div className="toggle" role="group" aria-label={q.label}>
          <button
            type="button"
            className={value === true ? "on-yes" : ""}
            onClick={() => onChange(key, true)}
          >
            はい
          </button>
          <button
            type="button"
            className={value === false ? "on-no" : ""}
            onClick={() => onChange(key, false)}
          >
            いいえ
          </button>
        </div>
      )}
    </div>
  );
}
