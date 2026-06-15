import type { DentalFacilityStandard } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// 収益試算（係数調整型）
//
// 依頼者の方針どおり：
//   ユーザーが入力した「月間算定回数」に、各項目の点数（1点=10円）を掛けて月額・年額を出す。
//   AI による推計は行わず、point × count × 10円 の単純合算（決定論的）。
//
// 精緻化（過大見積もりの抑制）：
//   - exclusive_group：同月に併算定しない基準（例 外感染1〜4／外安全1・2／歯初診・病初診）は、
//     複数選択されても収益最大の1つだけを計上し、残りは「除外」として明示する。
//   - once_per_month：患者1人につき月1回までの項目は表示で明示（合計は延べ算定回数のまま）。
//   これでも併算定不可・包括化を完全には反映しないため、結果は「粗い上限の目安」である。
// ─────────────────────────────────────────────────────────────────────────────

const YEN_PER_POINT = 10;

export interface RevenueLineInput {
  /** revenue_sim.linked_items[].item と対応するキー（item 名）。 */
  item: string;
  pointsPerEvent: number;
  /** ユーザー入力の月間算定回数。 */
  monthlyCount: number;
  oncePerMonth?: boolean;
}

export interface RevenueLineResult extends RevenueLineInput {
  monthlyYen: number;
  yearlyYen: number;
  /** 排他グループにより計上から除外された場合 true。 */
  excluded?: boolean;
  /** 除外理由（表示用）。 */
  excludedReason?: string;
}

export interface RevenueResult {
  lines: RevenueLineResult[];
  monthlyYenTotal: number;
  yearlyYenTotal: number;
  /** 排他グループで除外された基準名のリスト（UI 表示用）。 */
  excludedStandards: string[];
}

/** 月間回数マップ（item 名 → 回数）から、単一基準の各行を計算する（除外判定は行わない）。 */
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
      oncePerMonth: li.once_per_month,
      monthlyYen,
      yearlyYen: monthlyYen * 12,
    };
  });

  const monthlyYenTotal = lines.reduce((sum, l) => sum + l.monthlyYen, 0);
  return {
    lines,
    monthlyYenTotal,
    yearlyYenTotal: monthlyYenTotal * 12,
    excludedStandards: [],
  };
}

interface StandardEntry {
  standard: DentalFacilityStandard;
  monthlyCounts: Record<string, number>;
}

/**
 * 複数基準の合算試算。exclusive_group が同じ基準が複数あれば、収益最大の1つだけを計上し
 * 残りは除外（excluded）として行に残す。
 */
export function simulateRevenueForMany(entries: StandardEntry[]): RevenueResult {
  // まず基準ごとに小計を出す。
  const perStandard = entries.map((e) => {
    const r = simulateRevenue(e.standard, e.monthlyCounts);
    return {
      standard: e.standard,
      lines: r.lines,
      subtotalMonthly: r.monthlyYenTotal,
      group: e.standard.revenue_sim.exclusive_group,
    };
  });

  // 排他グループごとに、収益最大の基準を1つだけ採用する。
  const winnerByGroup = new Map<string, string>(); // group -> winning standard id
  for (const ps of perStandard) {
    if (!ps.group) continue;
    const cur = winnerByGroup.get(ps.group);
    if (cur === undefined) {
      winnerByGroup.set(ps.group, ps.standard.id);
    } else {
      const curEntry = perStandard.find((p) => p.standard.id === cur)!;
      if (ps.subtotalMonthly > curEntry.subtotalMonthly) {
        winnerByGroup.set(ps.group, ps.standard.id);
      }
    }
  }

  const allLines: RevenueLineResult[] = [];
  const excludedStandards: string[] = [];
  for (const ps of perStandard) {
    const isExcluded =
      ps.group !== undefined && winnerByGroup.get(ps.group) !== ps.standard.id;
    if (isExcluded) {
      excludedStandards.push(ps.standard.common_name);
      for (const l of ps.lines) {
        allLines.push({
          ...l,
          excluded: true,
          excludedReason: `${ps.standard.common_name} は同月に併算定しない区分（収益最大の基準のみ計上）`,
          monthlyYen: 0,
          yearlyYen: 0,
        });
      }
    } else {
      allLines.push(...ps.lines);
    }
  }

  const monthlyYenTotal = allLines.reduce((sum, l) => sum + l.monthlyYen, 0);
  return {
    lines: allLines,
    monthlyYenTotal,
    yearlyYenTotal: monthlyYenTotal * 12,
    excludedStandards,
  };
}

export function formatYen(yen: number): string {
  return `¥${Math.round(yen).toLocaleString("ja-JP")}`;
}
