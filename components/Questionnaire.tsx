"use client";

import type { Condition, UserInputs } from "@/lib/types";

export interface QuestionGroup {
  title: string;
  questions: Condition[];
}

interface Props {
  groups: QuestionGroup[];
  inputs: UserInputs;
  onChange: (key: string, value: boolean | number) => void;
}

export default function Questionnaire({ groups, inputs, onChange }: Props) {
  return (
    <>
      {groups.map((g) => (
        <div className="group" key={g.title}>
          <div className="group-title">{g.title}</div>
          {g.questions.map((q) => (
            <QuestionRow key={q.key} q={q} inputs={inputs} onChange={onChange} />
          ))}
        </div>
      ))}
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

  return (
    <div className="q-row">
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
