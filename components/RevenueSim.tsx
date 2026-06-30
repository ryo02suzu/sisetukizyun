"use client";

import { useMemo, useState } from "react";
import type { DentalFacilityStandard } from "@/lib/types";
import { simulateRevenueForMany, formatYen } from "@/lib/revenue";

interface Props {
  /** 届出「可能」または「要確認」と判定された基準。 */
  standards: DentalFacilityStandard[];
}

export default function RevenueSim({ standards }: Props) {
  // 試算に含める基準（既定は全件）。
  const [included, setIncluded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(standards.map((s) => [s.id, true])),
  );
  // item 名 → 月間回数。初期値は default_monthly_count_hint。
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const s of standards) {
      for (const li of s.revenue_sim.linked_items) {
        init[li.item] = li.default_monthly_count_hint ?? 0;
      }
    }
    return init;
  });

  const activeStandards = useMemo(
    () => standards.filter((s) => included[s.id]),
    [standards, included],
  );

  const result = useMemo(
    () =>
      simulateRevenueForMany(
        activeStandards.map((s) => ({ standard: s, monthlyCounts: counts })),
      ),
    [activeStandards, counts],
  );

  if (standards.length === 0) {
    return (
      <p className="sub">
        収益試算の対象（届出可能・要確認の基準）がありません。問診の回答を見直してください。
      </p>
    );
  }

  return (
    <>
      <p className="sub">
        各項目の<strong>月間算定回数</strong>（自院の直近のレセプト件数を目安に）を入力すると、1点=10円で月額・年額を試算します（点数 ×
        回数 × 10円の単純合算）。初期値は一般的な小規模診療所の目安です。試算に含める基準はチェックで選べます。
      </p>

      <div className="include-grid no-print">
        {standards.map((s) => (
          <label key={s.id} className="include-item">
            <input
              type="checkbox"
              checked={included[s.id] ?? false}
              onChange={(e) =>
                setIncluded((prev) => ({ ...prev, [s.id]: e.target.checked }))
              }
            />
            {s.common_name}
          </label>
        ))}
      </div>

      {result.excludedStandards.length > 0 && (
        <div className="rev-exclusion-notice no-print">
          ⚠ 同月に併算定しない区分（{result.excludedStandards.join("・")}
          ）が複数選択されています。収益が最大の1つだけを合計に計上し、他は下表で「除外」と表示しています。
        </div>
      )}

      <table className="rev-table">
        <thead>
          <tr>
            <th>算定項目</th>
            <th>点数</th>
            <th>月間回数</th>
            <th>月額</th>
            <th>年額</th>
          </tr>
        </thead>
        <tbody>
          {result.lines.map((line, i) => (
            <tr key={line.item + i} className={line.excluded ? "rev-excluded" : ""}>
              <td>
                {line.item}
                {line.oncePerMonth && <span className="cap-badge">月1回/患者</span>}
                {line.excluded && <span className="excluded-badge">併算定不可で除外</span>}
              </td>
              <td>{line.pointsPerEvent}点</td>
              <td>
                <input
                  type="number"
                  min={0}
                  value={counts[line.item] ?? 0}
                  disabled={line.excluded}
                  onChange={(e) => {
                    // 指数表記(1e500→Infinity)・負数・NaN を弾き、有限の0以上にクランプする。
                    // 未クランプだと収益試算が ¥∞/マイナス計上となり、排他グループの
                    // 勝者選定（最高点の採用）も汚染されるため。
                    const n = Number(e.target.value);
                    const safe = e.target.value === "" || !Number.isFinite(n) || n < 0 ? 0 : n;
                    setCounts((prev) => ({ ...prev, [line.item]: safe }));
                  }}
                  aria-label={`${line.item} の月間回数`}
                />
              </td>
              <td>{formatYen(line.monthlyYen)}</td>
              <td>{formatYen(line.yearlyYen)}</td>
            </tr>
          ))}
          {result.lines.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", color: "var(--muted)" }}>
                試算に含める基準を選択してください。
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td>合計</td>
            <td />
            <td />
            <td>{formatYen(result.monthlyYenTotal)}</td>
            <td className="rev-total">{formatYen(result.yearlyYenTotal)}</td>
          </tr>
        </tfoot>
      </table>

      {result.excludedStandards.length > 0 && (
        <p className="rev-note">
          ※ 同月に併算定しない区分（{result.excludedStandards.join("・")}
          ）は、収益最大の基準のみを合計に計上し、他は除外しています。
        </p>
      )}
      <p className="rev-note">
        ※ これは「点数 × 月間延べ算定回数 × 10円」の<strong>粗い上限の目安</strong>です。月内回数制限・併算定不可・包括化（まるめ）・査定は完全には反映していません。実際の収益は患者構成等により下振れします。
      </p>
    </>
  );
}
