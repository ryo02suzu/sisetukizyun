"use client";

import { useState } from "react";
import { COMMON_FILING_RULES, BUREAUS } from "@/lib/filing";

// 全基準共通の届出ルール（受理→算定・提出方法・受付期間・電子申請）と宛先一覧。
// 判定結果ページで1回だけ表示する折りたたみパネル。
export default function CommonFilingRules() {
  const [open, setOpen] = useState(false);
  return (
    <div className="panel filing-common no-print">
      <button
        type="button"
        className="filing-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
        届出の進め方（全基準 共通ルール）
      </button>
      {open && (
        <div className="filing-common-body">
          <ul className="filing-rules">
            {COMMON_FILING_RULES.map((r) => (
              <li key={r.label}>
                <strong>{r.label}</strong>：{r.text}
              </li>
            ))}
          </ul>
          <div className="filing-bureaus">
            <div className="detail-label">提出先（自院を管轄する地方厚生局）</div>
            <div className="form-links">
              {BUREAUS.map((b) => (
                <a key={b.url} href={b.url} target="_blank" rel="noopener noreferrer">
                  {b.name}
                </a>
              ))}
            </div>
          </div>
          <p className="rev-note">
            ※ 受付期間・宛先・様式は管轄の厚生局・年度で異なる場合があります。提出前に管轄局の最新案内で確認してください。
          </p>
        </div>
      )}
    </div>
  );
}
