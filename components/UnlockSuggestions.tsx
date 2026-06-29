"use client";

import { useMemo, useState } from "react";
import { formatYen } from "@/lib/revenue";
import {
  sortSuggestions,
  type PrerequisiteDomino,
  type SuggestSort,
  type UnlockSuggestion,
} from "@/lib/suggest";

interface Props {
  suggestions: UnlockSuggestion[];
  dominoes: PrerequisiteDomino[];
}

export default function UnlockSuggestions({ suggestions, dominoes }: Props) {
  const [sort, setSort] = useState<SuggestSort>("easiest");
  const sorted = useMemo(() => sortSuggestions(suggestions, sort), [suggestions, sort]);

  if (suggestions.length === 0 && dominoes.length === 0) return null;

  return (
    <div className="panel unlock-panel no-print">
      <h2>あと一歩で出せる加算</h2>
      <p className="sub">
        いまは「届出不可」でも、<strong>あと数項目</strong>を満たせば届出できる加算です。満たした場合の増収（粗い上限の目安）も表示します。
      </p>

      {suggestions.length > 0 && (
        <div className="unlock-sort">
          <span>並び替え：</span>
          <button
            type="button"
            className={`chip ${sort === "easiest" ? "on" : ""}`}
            onClick={() => setSort("easiest")}
          >
            手軽な順
          </button>
          <button
            type="button"
            className={`chip ${sort === "revenue" ? "on" : ""}`}
            onClick={() => setSort("revenue")}
          >
            増収が大きい順
          </button>
        </div>
      )}

      {sorted.map((s) => (
        <div className="unlock-card" key={s.standardId}>
          <div className="unlock-head">
            <div className="unlock-title">
              {s.common_name}
              <span className="unlock-cat">{s.category}</span>
            </div>
            <span className="gap-badge">あと{s.gapCount}項目</span>
          </div>

          {s.gapConditions.length > 0 && (
            <ul className="unlock-gaps">
              {s.gapConditions.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          )}

          {s.gapPrerequisites.length > 0 && (
            <p className="unlock-prereq">
              前提が必要：
              {s.gapPrerequisites.map((p, i) => (
                <span key={p.id}>
                  {i > 0 ? "、" : ""}
                  「{p.common_name}」
                  {p.alreadyAttainable
                    ? "（先に届出すればOK）"
                    : `（こちらもあと${p.ownGapCount}項目）`}
                </span>
              ))}
            </p>
          )}

          <div className="unlock-rev">
            満たすと{" "}
            {s.yearlyYen > 0 ? (
              <>
                <strong>年 +{formatYen(s.yearlyYen)}</strong>（月 +{formatYen(s.monthlyYen)}）
              </>
            ) : (
              <span className="unlock-rev-na">増収は点数試算対象外（届出が前提の検査・手術等）</span>
            )}
          </div>
        </div>
      ))}

      {dominoes.length > 0 && (
        <div className="domino-box">
          <div className="domino-title">前提を満たすと連鎖で増える</div>
          {dominoes.map((d) => (
            <p key={d.prerequisiteId} className="domino-row">
              「{d.prerequisiteName}」{d.attainable ? "を届け出ると" : "を満たすと"} →{" "}
              <strong>{d.unlocks.join("・")}</strong>（{d.unlocks.length}件）が前進します
            </p>
          ))}
        </div>
      )}

      <p className="rev-note">
        ※ 「あと一歩」は不足が少ない順に最大数項目までを表示しています。増収額は「点数 × 既定の月間回数 ×
        10円」の粗い上限の目安です。「要確認」の論点が残る基準もあるため、最終確認は厚生局で。
      </p>
    </div>
  );
}
