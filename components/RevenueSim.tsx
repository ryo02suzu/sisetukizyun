"use client";

import { useMemo, useState } from "react";
import type { DentalFacilityStandard } from "@/lib/types";
import { simulateRevenueForMany, formatYen } from "@/lib/revenue";

interface Props {
  /** 届出「可能」または「要確認」と判定された基準。 */
  standards: DentalFacilityStandard[];
}

export default function RevenueSim({ standards }: Props) {
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

  const result = useMemo(
    () =>
      simulateRevenueForMany(
        standards.map((s) => ({ standard: s, monthlyCounts: counts })),
      ),
    [standards, counts],
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
        各項目の<strong>月間算定回数</strong>を入力すると、1点=10円で月額・年額を試算します（点数 ×
        回数 × 10円の単純合算）。
      </p>
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
          {result.lines.map((line) => (
            <tr key={line.item}>
              <td>{line.item}</td>
              <td>{line.pointsPerEvent}点</td>
              <td>
                <input
                  type="number"
                  min={0}
                  value={counts[line.item] ?? 0}
                  onChange={(e) =>
                    setCounts((prev) => ({
                      ...prev,
                      [line.item]: e.target.value === "" ? 0 : Number(e.target.value),
                    }))
                  }
                  aria-label={`${line.item} の月間回数`}
                />
              </td>
              <td>{formatYen(line.monthlyYen)}</td>
              <td>{formatYen(line.yearlyYen)}</td>
            </tr>
          ))}
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
    </>
  );
}
