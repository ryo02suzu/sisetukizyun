import type { DentalFacilityStandard } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// 収益試算（係数調整型）
//
// 依頼者の方針どおり：
//   ユーザーが入力した「月間算定回数」に、各項目の点数（1点=10円）を掛けて月額・年額を出す。
//   AI による推計は行わず、point × count × 10円 の単純合算（決定論的）。
// ─────────────────────────────────────────────────────────────────────────────

const YEN_PER_POINT = 10;

export interface RevenueLineInput {
  /** revenue_sim.linked_items[].item と対応するキー（item 名）。 */
  item: string;
  pointsPerEvent: number;
  /** ユーザー入力の月間算定回数。 */
  monthlyCount: number;
}

export interface RevenueLineResult extends RevenueLineInput {
  monthlyYen: number;
  yearlyYen: number;
}

export interface RevenueResult {
  lines: RevenueLineResult[];
  monthlyYenTotal: number;
  yearlyYenTotal: number;
}

/** 月間回数マップ（item 名 → 回数）から収益を計算する。 */
export function simulateRevenue(
  standard: DentalFacilityStandard,
  monthlyCounts: Record<string, number>,
): RevenueResult {
  const lines: RevenueLineResult[] = standard.revenue_sim.linked_items.map((li) => {
    const monthlyCount = monthlyCounts[li.item] ?? li.default_monthly_count_hint ?? 0;
    const monthlyYen = li.points_per_event * monthlyCount * YEN_PER_POINT;
    return {
      item: li.item,
      pointsPerEvent: li.points_per_event,
      monthlyCount,
      monthlyYen,
      yearlyYen: monthlyYen * 12,
    };
  });

  const monthlyYenTotal = lines.reduce((sum, l) => sum + l.monthlyYen, 0);
  return {
    lines,
    monthlyYenTotal,
    yearlyYenTotal: monthlyYenTotal * 12,
  };
}

/** 複数基準の合算試算（届出「可」な基準のみ渡す想定）。 */
export function simulateRevenueForMany(
  entries: { standard: DentalFacilityStandard; monthlyCounts: Record<string, number> }[],
): RevenueResult {
  const allLines: RevenueLineResult[] = [];
  for (const e of entries) {
    allLines.push(...simulateRevenue(e.standard, e.monthlyCounts).lines);
  }
  const monthlyYenTotal = allLines.reduce((sum, l) => sum + l.monthlyYen, 0);
  return {
    lines: allLines,
    monthlyYenTotal,
    yearlyYenTotal: monthlyYenTotal * 12,
  };
}

export function formatYen(yen: number): string {
  return `¥${Math.round(yen).toLocaleString("ja-JP")}`;
}
