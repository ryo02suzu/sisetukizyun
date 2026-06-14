"use client";

import { useMemo, useState } from "react";
import { standards, getStandardById } from "@/data/standards";
import { diagnoseAll } from "@/lib/engine";
import type { Condition, DiagnosisResult, UserInputs } from "@/lib/types";
import Questionnaire, { type QuestionGroup } from "@/components/Questionnaire";
import ResultCard from "@/components/ResultCard";
import RevenueSim from "@/components/RevenueSim";

type Step = "input" | "result" | "revenue";

// 全基準から、要件カテゴリ別に一意な設問を収集する。
function buildQuestionGroups(): QuestionGroup[] {
  const groupDefs: { key: keyof typeof CAT; title: string }[] = [
    { key: "equipment", title: "設備" },
    { key: "staff", title: "人員" },
    { key: "system", title: "体制" },
    { key: "performance", title: "実績" },
    { key: "training", title: "研修" },
  ];
  const seen = new Set<string>();
  const buckets: Record<string, Condition[]> = {
    equipment: [],
    staff: [],
    system: [],
    performance: [],
    training: [],
  };

  const pushConds = (bucket: string, conds: Condition[]) => {
    for (const c of conds) {
      if (c.sub_conditions && c.sub_conditions.length > 0) {
        pushConds(bucket, c.sub_conditions);
      } else if (c.key && !seen.has(c.key)) {
        seen.add(c.key);
        buckets[bucket].push(c);
      }
    }
  };

  for (const s of standards) {
    pushConds("equipment", s.requirements.equipment);
    pushConds("staff", s.requirements.staff);
    pushConds("system", s.requirements.system);
    pushConds("performance", s.requirements.performance);
    pushConds("training", s.requirements.training);
  }

  return groupDefs
    .map((g) => ({ title: g.title, questions: buckets[g.key] }))
    .filter((g) => g.questions.length > 0);
}

const CAT = { equipment: 0, staff: 0, system: 0, performance: 0, training: 0 };

export default function Page() {
  const [step, setStep] = useState<Step>("input");
  const [inputs, setInputs] = useState<UserInputs>({});
  const [results, setResults] = useState<DiagnosisResult[] | null>(null);

  const groups = useMemo(() => buildQuestionGroups(), []);

  function onChange(key: string, value: boolean | number) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  function onBulkAnswer(keys: string[], value: boolean) {
    setInputs((prev) => {
      const next = { ...prev };
      for (const k of keys) next[k] = value;
      return next;
    });
  }

  function runDiagnosis() {
    setResults(diagnoseAll(standards, inputs));
    setStep("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const eligibleStandards = useMemo(() => {
    if (!results) return [];
    return results
      .filter((r) => r.verdict !== "not_eligible")
      .map((r) => getStandardById(r.standardId))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
  }, [results]);

  const counts = useMemo(() => {
    if (!results) return { eligible: 0, verify: 0, ng: 0 };
    return {
      eligible: results.filter((r) => r.verdict === "eligible").length,
      verify: results.filter((r) => r.verdict === "needs_verify").length,
      ng: results.filter((r) => r.verdict === "not_eligible").length,
    };
  }, [results]);

  const basic = results?.filter((r) => r.category === "基本診療料") ?? [];
  const tokutei = results?.filter((r) => r.category === "特掲診療料") ?? [];

  return (
    <div className="container">
      <header className="app">
        <h1>歯科 施設基準 届出可否 診断</h1>
        <p>令和8年度（2026年6月施行）改定対応 ／ 届出可否の判定・収益試算</p>
      </header>

      <div className="steps">
        <div className={`step ${step === "input" ? "active" : ""}`}>1. 問診</div>
        <div className={`step ${step === "result" ? "active" : ""}`}>2. 判定結果</div>
        <div className={`step ${step === "revenue" ? "active" : ""}`}>3. 収益試算</div>
      </div>

      {step === "input" && (
        <div className="panel">
          <h2>診療所の状況を入力してください</h2>
          <p className="sub">
            設備・人員・体制・実績・研修について回答すると、{standards.length}{" "}
            件の施設基準について届出可否を判定します。「要確認」タグの項目は、満たしていても届出前に厚生局確認が必要な論点です。
          </p>
          <Questionnaire
            groups={groups}
            inputs={inputs}
            onChange={onChange}
            onBulkAnswer={onBulkAnswer}
          />
          <div className="actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={runDiagnosis}>
              判定する
            </button>
          </div>
        </div>
      )}

      {step === "result" && results && (
        <>
          <div className="summary-bar">
            <div className="stat">
              <div className="n" style={{ color: "var(--ok)" }}>
                {counts.eligible}
              </div>
              <div className="l">届出可能</div>
            </div>
            <div className="stat">
              <div className="n" style={{ color: "var(--warn)" }}>
                {counts.verify}
              </div>
              <div className="l">要確認</div>
            </div>
            <div className="stat">
              <div className="n" style={{ color: "var(--ng)" }}>
                {counts.ng}
              </div>
              <div className="l">届出不可</div>
            </div>
          </div>

          <div className="panel">
            <h2>基本診療料系</h2>
            <p className="sub">院内感染防止対策・外来診療体制・医療DX・ベースアップ評価料 等</p>
            {basic.map((r) => (
              <ResultCard key={r.standardId} result={r} />
            ))}
          </div>

          <div className="panel">
            <h2>特掲診療料系</h2>
            <p className="sub">口腔管理体制強化・在宅療養支援・CAD/CAM・検査・手術 等</p>
            {tokutei.map((r) => (
              <ResultCard key={r.standardId} result={r} />
            ))}
          </div>

          <div className="actions">
            <button type="button" className="btn secondary" onClick={() => setStep("input")}>
              ← 問診に戻る
            </button>
            <button type="button" className="btn" onClick={() => setStep("revenue")}>
              収益試算へ →
            </button>
          </div>

          <div className="disclaimer">
            本判定は入力情報に基づく目安です。点数・様式番号・経過措置・「常勤」の定義など解釈が分かれる項目は「要確認」として表示しています。実際の届出にあたっては、必ず最新の告示・通知および地方厚生（支）局の届出様式で最終確認してください。
          </div>
        </>
      )}

      {step === "revenue" && results && (
        <>
          <div className="panel">
            <h2>収益試算</h2>
            <RevenueSim standards={eligibleStandards} />
          </div>
          <div className="actions">
            <button type="button" className="btn secondary" onClick={() => setStep("result")}>
              ← 判定結果に戻る
            </button>
          </div>
          <div className="disclaimer">
            試算は「点数 × 月間算定回数 × 10円」の単純合算です。実際の収益は患者構成・併算定の制限・査定等により変動します。
          </div>
        </>
      )}
    </div>
  );
}
