"use client";

import { useState } from "react";
import { COMMON_FILING_RULES, BUREAUS } from "@/lib/filing";
import { getBureauInfo } from "@/data/standards";

// 全基準共通の届出ルール（受理→算定・提出方法・受付期間・電子申請）と宛先一覧。
// 判定結果ページで1回だけ表示する折りたたみパネル。選択中の管轄局を強調表示する。
export default function CommonFilingRules({ bureau }: { bureau?: string }) {
  const [open, setOpen] = useState(false);
  const selected = bureau ? getBureauInfo(bureau) : null;
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
            {selected && (
              <p className="filing-selected-bureau">
                現在の選択：
                <a href={selected.url} target="_blank" rel="noopener noreferrer">
                  {selected.name}
                </a>
                {!selected.confirmed && "（整理番号・様式PDFは未確認のため要確認）"}
                {" "}
                — 実際の提出先は同局内の都道府県事務所です。局トップから所在地の事務所をご確認ください。
              </p>
            )}
            <div className="form-links">
              {BUREAUS.map((b) => (
                <a key={b.url} href={b.url} target="_blank" rel="noopener noreferrer">
                  {b.name}
                </a>
              ))}
            </div>
          </div>
          <p className="rev-note">
            ※ 受付期間・宛先・様式は管轄の厚生局・年度で異なる場合があります。提出前に管轄局（都道府県事務所）の最新案内で確認してください。
          </p>
        </div>
      )}
    </div>
  );
}
