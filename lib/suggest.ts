import type { DentalFacilityStandard, DiagnosisResult, StandardCategory } from "@/lib/types";
import { getStandardById } from "@/data/standards";
import { simulateRevenue } from "@/lib/revenue";

// ─────────────────────────────────────────────────────────────────────────────
// 「あと一歩で出せる加算」提案（アンロック提案）
//
// 判定エンジンが出した not_eligible の基準について、「あと何を満たせば届出可能か」と
// 「満たした場合の増収（粗い上限の目安）」を算出して提案する。新規調査は不要で、
// unmetLabels（不足要件）/ unmetPrerequisites（不足の前提）/ revenue_sim から導出する。
// ─────────────────────────────────────────────────────────────────────────────

export interface GapPrerequisite {
  id: string;
  common_name: string;
  /** その前提自体が現状で届出可能か（eligible / needs_verify なら true）。 */
  alreadyAttainable: boolean;
  /** その前提自体の不足項目数（前提も not_eligible のとき）。 */
  ownGapCount: number;
}

export interface UnlockSuggestion {
  standardId: string;
  common_name: string;
  official_name: string;
  category: StandardCategory;
  /** 不足している要件（ラベル）。 */
  gapConditions: string[];
  /** 不足している前提基準。 */
  gapPrerequisites: GapPrerequisite[];
  /** あと満たすべき項目の総数（要件＋前提）。小さいほど手軽。 */
  gapCount: number;
  /** 不足が前提基準のみ（自院の要件は満たしている）か。 */
  prerequisiteOnly: boolean;
  /** 届出できた場合の増収（既定の月間回数ヒント・1点=10円。粗い上限の目安）。 */
  monthlyYen: number;
  yearlyYen: number;
}

export type SuggestSort = "easiest" | "revenue";

/**
 * not_eligible の基準から「あと一歩」提案を作る。
 * @param maxGap これ以下の不足項目数のものだけを対象にする（既定3）。
 */
export function buildUnlockSuggestions(
  results: DiagnosisResult[],
  opts?: { maxGap?: number; sort?: SuggestSort },
): UnlockSuggestion[] {
  const maxGap = opts?.maxGap ?? 3;
  const sort = opts?.sort ?? "easiest";
  const byId = new Map(results.map((r) => [r.standardId, r]));

  const suggestions: UnlockSuggestion[] = [];
  for (const r of results) {
    if (r.verdict !== "not_eligible") continue;
    const standard = getStandardById(r.standardId);
    if (!standard) continue;

    const gapPrerequisites: GapPrerequisite[] = r.unmetPrerequisites.map((pid) => {
      const ps = getStandardById(pid);
      const pr = byId.get(pid);
      const attainable = pr ? pr.verdict !== "not_eligible" : false;
      const ownGap = pr ? pr.unmetLabels.length + pr.unmetPrerequisites.length : 0;
      return {
        id: pid,
        common_name: ps?.common_name ?? pid,
        alreadyAttainable: attainable,
        ownGapCount: ownGap,
      };
    });

    const gapCount = r.unmetLabels.length + r.unmetPrerequisites.length;
    if (gapCount === 0 || gapCount > maxGap) continue;

    const rev = simulateRevenue(standard, {});
    suggestions.push({
      standardId: r.standardId,
      common_name: r.common_name,
      official_name: r.official_name,
      category: r.category,
      gapConditions: r.unmetLabels,
      gapPrerequisites,
      gapCount,
      prerequisiteOnly: r.unmetLabels.length === 0 && r.unmetPrerequisites.length > 0,
      monthlyYen: rev.monthlyYenTotal,
      yearlyYen: rev.yearlyYenTotal,
    });
  }

  return sortSuggestions(suggestions, sort);
}

export function sortSuggestions(list: UnlockSuggestion[], sort: SuggestSort): UnlockSuggestion[] {
  const arr = [...list];
  if (sort === "revenue") {
    arr.sort((a, b) => b.yearlyYen - a.yearlyYen || a.gapCount - b.gapCount);
  } else {
    arr.sort((a, b) => a.gapCount - b.gapCount || b.yearlyYen - a.yearlyYen);
  }
  return arr;
}

/**
 * 前提の「ドミノ」：not_eligible の前提基準ごとに、それを満たすと新たに対象になり得る
 * 依存先（現在その前提だけで止まっている基準）を集計する。
 */
export interface PrerequisiteDomino {
  prerequisiteId: string;
  prerequisiteName: string;
  /** その前提自体が現状で届出可能か。 */
  attainable: boolean;
  /** 解けると新たに前進する依存先の略称。 */
  unlocks: string[];
}

export function buildPrerequisiteDominoes(
  results: DiagnosisResult[],
  standards: DentalFacilityStandard[],
): PrerequisiteDomino[] {
  const byId = new Map(results.map((r) => [r.standardId, r]));
  const map = new Map<string, Set<string>>(); // prereqId -> dependent common_names

  for (const s of standards) {
    if (s.prerequisites.length === 0) continue;
    const r = byId.get(s.id);
    if (!r || r.verdict !== "not_eligible") continue;
    for (const pid of r.unmetPrerequisites) {
      const set = map.get(pid) ?? new Set<string>();
      set.add(s.common_name);
      map.set(pid, set);
    }
  }

  const out: PrerequisiteDomino[] = [];
  for (const [pid, deps] of map) {
    if (deps.size < 1) continue;
    const ps = getStandardById(pid);
    const pr = byId.get(pid);
    out.push({
      prerequisiteId: pid,
      prerequisiteName: ps?.common_name ?? pid,
      attainable: pr ? pr.verdict !== "not_eligible" : false,
      unlocks: [...deps],
    });
  }
  // 解けると一番多く前進するものを上に
  out.sort((a, b) => b.unlocks.length - a.unlocks.length);
  return out;
}
