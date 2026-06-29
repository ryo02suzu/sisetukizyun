import type {
  Condition,
  ConditionResult,
  DentalFacilityStandard,
  DiagnosisResult,
  UserInputs,
  Verdict,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// ルールエンジン（決定木による届出可否判定）
//
// 重要：このモジュールは純粋関数のみで構成し、LLM・乱数・外部I/Oを一切使わない。
//       点数・要件という「間違えてはいけない確定情報」を決定論的に扱うことで、
//       返還リスクを避ける（LLM は不可理由の解説生成にのみ使う）。
// ─────────────────────────────────────────────────────────────────────────────

/** 1つの条件（決定木ノード）を評価する。 */
export function evaluateCondition(cond: Condition, inputs: UserInputs): ConditionResult {
  const type = cond.type ?? "boolean";

  if (type === "composite_or" || type === "composite_and") {
    const children = (cond.sub_conditions ?? []).map((c) => evaluateCondition(c, inputs));
    const met =
      type === "composite_or"
        ? children.some((c) => c.met)
        : children.every((c) => c.met);
    const needsVerify =
      met && (cond.verify === true || children.some((c) => c.met && c.needsVerify));
    return { key: cond.key, label: cond.label, met, needsVerify, children };
  }

  const raw = cond.key !== undefined ? inputs[cond.key] : undefined;
  let met = false;

  if (type === "boolean") {
    met = raw === true || raw === "true";
  } else if (type === "number_min" || type === "threshold") {
    const limit = type === "number_min" ? cond.number_min : cond.threshold;
    const value = typeof raw === "number" ? raw : Number(raw);
    met = Number.isFinite(value) && limit !== undefined && value >= limit;
  }

  const needsVerify = met && cond.verify === true;
  return { key: cond.key, label: cond.label, met, needsVerify };
}

function evaluateGroup(conds: Condition[], inputs: UserInputs): ConditionResult[] {
  return conds.map((c) => evaluateCondition(c, inputs));
}

/** ConditionResult を平坦化して met=false の葉ラベルを集める。 */
function collectUnmet(results: ConditionResult[], acc: string[]): void {
  for (const r of results) {
    if (r.children && r.children.length > 0) {
      if (!r.met) acc.push(r.label);
      // composite が満たされていれば子の未充足は記録しない（OR/AND の結果が重要）
      if (!r.met) collectUnmet(r.children, acc);
    } else if (!r.met) {
      acc.push(r.label);
    }
  }
}

function collectVerify(results: ConditionResult[], acc: string[]): void {
  for (const r of results) {
    if (r.needsVerify) acc.push(r.label);
    if (r.children && r.children.length > 0) collectVerify(r.children, acc);
  }
}

/**
 * 1つの施設基準を判定する。
 * prerequisites は eligibleIds（既に「可」と判定された id 集合）で評価する。
 */
export function evaluateStandard(
  standard: DentalFacilityStandard,
  inputs: UserInputs,
  eligibleIds: Set<string>,
): DiagnosisResult {
  const conditionResults = {
    equipment: evaluateGroup(standard.requirements.equipment, inputs),
    staff: evaluateGroup(standard.requirements.staff, inputs),
    system: evaluateGroup(standard.requirements.system, inputs),
    performance: evaluateGroup(standard.requirements.performance, inputs),
    training: evaluateGroup(standard.requirements.training, inputs),
  };

  const allResults = [
    ...conditionResults.equipment,
    ...conditionResults.staff,
    ...conditionResults.system,
    ...conditionResults.performance,
    ...conditionResults.training,
  ];

  const unmetPrerequisites = standard.prerequisites.filter((p) => !eligibleIds.has(p));

  const unmetLabels: string[] = [];
  collectUnmet(allResults, unmetLabels);

  const verifyLabels: string[] = [];
  collectVerify(allResults, verifyLabels);
  // 基準そのものに付された要確認論点も合流させる
  for (const f of standard.verify_flags) verifyLabels.push(f);

  // 防御的措置：要件が1つも無い基準は無条件 eligible にしない（空配列の every は true のため）。
  const allConditionsMet = allResults.length > 0 && allResults.every((r) => r.met);
  const prerequisitesMet = unmetPrerequisites.length === 0;

  let verdict: Verdict;
  if (!allConditionsMet || !prerequisitesMet) {
    verdict = "not_eligible";
  } else if (verifyLabels.length > 0) {
    verdict = "needs_verify";
  } else {
    verdict = "eligible";
  }

  return {
    standardId: standard.id,
    official_name: standard.official_name,
    common_name: standard.common_name,
    category: standard.category,
    verdict,
    conditionResults,
    unmetLabels,
    verifyLabels,
    unmetPrerequisites,
  };
}

/**
 * 全施設基準を判定する。
 * prerequisites を解決するため、依存関係を考慮して反復評価する。
 */
export function diagnoseAll(
  standards: DentalFacilityStandard[],
  inputs: UserInputs,
): DiagnosisResult[] {
  // まず prerequisites を無視して各基準の「条件のみ」の可否を求め、
  // それを eligibleIds の初期集合として prerequisites を解決する（最大 N 回反復で収束）。
  let eligibleIds = new Set<string>();

  for (let iter = 0; iter < standards.length + 1; iter++) {
    const next = new Set<string>();
    for (const s of standards) {
      const r = evaluateStandard(s, inputs, eligibleIds);
      // prerequisites の前提に使う「可」は eligible / needs_verify を含める
      // （要確認でも要件自体は満たしているため、依存先の足切りには使わない）
      if (r.verdict !== "not_eligible") next.add(s.id);
    }
    if (setsEqual(next, eligibleIds)) break;
    eligibleIds = next;
  }

  return standards.map((s) => evaluateStandard(s, inputs, eligibleIds));
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

/** 問診UIに出すべき条件キーを全基準から収集（重複排除）。 */
export function collectAllQuestions(standards: DentalFacilityStandard[]): Condition[] {
  const seen = new Map<string, Condition>();
  const visit = (conds: Condition[]) => {
    for (const c of conds) {
      if (c.sub_conditions && c.sub_conditions.length > 0) {
        visit(c.sub_conditions);
      } else if (c.key && !seen.has(c.key)) {
        seen.set(c.key, c);
      }
    }
  };
  for (const s of standards) {
    visit(s.requirements.equipment);
    visit(s.requirements.staff);
    visit(s.requirements.system);
    visit(s.requirements.performance);
    visit(s.requirements.training);
  }
  return [...seen.values()];
}
