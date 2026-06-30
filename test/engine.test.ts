import { test } from "node:test";
import assert from "node:assert/strict";
import { standards, getStandardById } from "../data/standards";
import { diagnoseAll, evaluateCondition } from "../lib/engine";
import { simulateRevenue, simulateRevenueForMany } from "../lib/revenue";
import type { Condition, UserInputs } from "../lib/types";

test("boolean condition: met only when true", () => {
  const c: Condition = { key: "x", label: "x", type: "boolean" };
  assert.equal(evaluateCondition(c, { x: true }).met, true);
  assert.equal(evaluateCondition(c, { x: false }).met, false);
  assert.equal(evaluateCondition(c, {}).met, false);
});

test("number_min condition: met when value >= threshold", () => {
  const c: Condition = { key: "n", label: "n", type: "number_min", number_min: 15 };
  assert.equal(evaluateCondition(c, { n: 15 }).met, true);
  assert.equal(evaluateCondition(c, { n: 20 }).met, true);
  assert.equal(evaluateCondition(c, { n: 14 }).met, false);
});

test("composite_or / composite_and", () => {
  const or: Condition = {
    label: "or",
    type: "composite_or",
    sub_conditions: [
      { key: "a", label: "a" },
      { key: "b", label: "b" },
    ],
  };
  assert.equal(evaluateCondition(or, { a: true, b: false }).met, true);
  assert.equal(evaluateCondition(or, { a: false, b: false }).met, false);

  const and: Condition = {
    label: "and",
    type: "composite_and",
    sub_conditions: [
      { key: "a", label: "a" },
      { key: "b", label: "b" },
    ],
  };
  assert.equal(evaluateCondition(and, { a: true, b: true }).met, true);
  assert.equal(evaluateCondition(and, { a: true, b: false }).met, false);
});

test("verify flag bubbles into needsVerify when met", () => {
  const c: Condition = { key: "x", label: "x", verify: true };
  assert.equal(evaluateCondition(c, { x: true }).needsVerify, true);
  assert.equal(evaluateCondition(c, { x: false }).needsVerify, false);
});

test("empty inputs -> every standard not_eligible (no false eligibility)", () => {
  const results = diagnoseAll(standards, {});
  for (const r of results) {
    assert.equal(r.verdict, "not_eligible", `${r.standardId} should be not_eligible with no input`);
  }
});

test("ha_shoshin: all conditions true -> needs_verify (has verify flags)", () => {
  const s = getStandardById("ha_shoshin")!;
  const inputs: UserInputs = {};
  for (const grp of [
    s.requirements.equipment,
    s.requirements.staff,
    s.requirements.system,
    s.requirements.performance,
    s.requirements.training,
  ]) {
    for (const c of grp) if (c.key) inputs[c.key] = true;
  }
  const result = diagnoseAll(standards, inputs).find((r) => r.standardId === "ha_shoshin")!;
  assert.notEqual(result.verdict, "not_eligible");
  assert.equal(result.verdict, "needs_verify"); // ha_shoshin has verify_flags
});

test("prerequisite: gai_kansen_1 blocked when ha_shoshin not eligible", () => {
  // satisfy only gai_kansen_1's own conditions, but NOT ha_shoshin's
  const inputs: UserInputs = {
    has_dental_suction: true,
    staff_config_infection: true,
    infection_manager: true,
    infection_control_system: true,
  };
  const result = diagnoseAll(standards, inputs).find((r) => r.standardId === "gai_kansen_1")!;
  assert.equal(result.verdict, "not_eligible");
  assert.ok(result.unmetPrerequisites.includes("ha_shoshin"));
});

test("revenue: points * count * 10yen", () => {
  const s = getStandardById("kokan_kyo")!;
  const res = simulateRevenue(s, { "口腔管理体制強化加算（各管理料への上乗せ）": 100 });
  // 48 * 100 * 10 = 48,000
  assert.equal(res.monthlyYenTotal, 48000);
  assert.equal(res.yearlyYenTotal, 576000);
});

test("threshold type behaves like number_min", () => {
  const c: Condition = { key: "t", label: "t", type: "threshold", threshold: 30 };
  assert.equal(evaluateCondition(c, { t: 30 }).met, true);
  assert.equal(evaluateCondition(c, { t: 29 }).met, false);
});

test("nested composite_and inside composite_or", () => {
  const c: Condition = {
    label: "root",
    type: "composite_or",
    sub_conditions: [
      {
        label: "and",
        type: "composite_and",
        sub_conditions: [
          { key: "a", label: "a" },
          { key: "b", label: "b" },
        ],
      },
      { key: "c", label: "c" },
    ],
  };
  assert.equal(evaluateCondition(c, { a: true, b: true }).met, true); // and-branch met
  assert.equal(evaluateCondition(c, { a: true, b: false, c: true }).met, true); // c met
  assert.equal(evaluateCondition(c, { a: true, b: false, c: false }).met, false);
});

test("every standard has unique id and at least one fee", () => {
  const ids = new Set<string>();
  for (const s of standards) {
    assert.ok(!ids.has(s.id), `duplicate id ${s.id}`);
    ids.add(s.id);
    assert.ok(s.fees.length >= 1, `${s.id} has no fees`);
    assert.ok(s.sources.length >= 1, `${s.id} has no sources`);
  }
});

test("all prerequisite ids resolve to an existing standard", () => {
  const ids = new Set(standards.map((s) => s.id));
  for (const s of standards) {
    for (const p of s.prerequisites) {
      assert.ok(ids.has(p), `${s.id} references unknown prerequisite ${p}`);
    }
  }
});

test("revenue: multiple standards aggregate", () => {
  const s1 = getStandardById("kokan_kyo")!;
  const res = simulateRevenue(s1, {});
  // default hint 120 * 48 * 10 = 57,600
  assert.equal(res.monthlyYenTotal, 57600);
});

test("revenue exclusive_group keeps only the highest-yield standard", () => {
  const k1 = getStandardById("gai_kansen_1")!; // 外感染1: 12/2
  const k2 = getStandardById("gai_kansen_2")!; // 外感染2: 14/4 (higher)
  const res = simulateRevenueForMany([
    { standard: k1, monthlyCounts: {} },
    { standard: k2, monthlyCounts: {} },
  ]);
  assert.ok(res.excludedStandards.includes("外感染1"), "外感染1 should be excluded");
  const onlyK2 = simulateRevenue(k2, {}).monthlyYenTotal;
  assert.equal(res.monthlyYenTotal, onlyK2);
});

test("revenue without exclusive collision sums both", () => {
  const a = getStandardById("kokan_kyo")!;
  const b = getStandardById("gtr")!;
  const res = simulateRevenueForMany([
    { standard: a, monthlyCounts: {} },
    { standard: b, monthlyCounts: {} },
  ]);
  assert.equal(res.excludedStandards.length, 0);
  const sum = simulateRevenue(a, {}).monthlyYenTotal + simulateRevenue(b, {}).monthlyYenTotal;
  assert.equal(res.monthlyYenTotal, sum);
});

test("once_per_month flag flows into revenue line", () => {
  const dx = getStandardById("ha_dx_1")!;
  const res = simulateRevenue(dx, {});
  assert.ok(res.lines.some((l) => l.oncePerMonth === true));
});

test("standards with transitional_deadline parse to valid dates", () => {
  for (const s of standards) {
    if (s.transitional_deadline) {
      const d = new Date(`${s.transitional_deadline}T00:00:00`);
      assert.ok(!Number.isNaN(d.getTime()), `${s.id} has invalid deadline`);
    }
  }
});

test("every standard has at least one requirement condition (guards empty->eligible)", () => {
  const countLeaves = (cs: import("../lib/types").Condition[]): number =>
    cs.reduce((n, c) => n + (c.sub_conditions?.length ? countLeaves(c.sub_conditions) : 1), 0);
  for (const s of standards) {
    const total =
      countLeaves(s.requirements.equipment) +
      countLeaves(s.requirements.staff) +
      countLeaves(s.requirements.system) +
      countLeaves(s.requirements.performance) +
      countLeaves(s.requirements.training);
    assert.ok(total >= 1, `${s.id} has zero conditions (would be auto-eligible)`);
  }
});

test("no composite condition has empty sub_conditions (would be met=true)", () => {
  const check = (cs: import("../lib/types").Condition[], sid: string) => {
    for (const c of cs) {
      if (c.type === "composite_or" || c.type === "composite_and") {
        assert.ok(c.sub_conditions && c.sub_conditions.length > 0, `${sid}: empty composite "${c.label}"`);
        check(c.sub_conditions, sid);
      }
    }
  };
  for (const s of standards) {
    for (const cat of [s.requirements.equipment, s.requirements.staff, s.requirements.system, s.requirements.performance, s.requirements.training]) {
      check(cat, s.id);
    }
  }
});

test("full-affirmative input yields zero not_eligible", () => {
  const inputs: UserInputs = {};
  const visit = (cs: import("../lib/types").Condition[]) => {
    for (const c of cs) {
      if (c.sub_conditions?.length) visit(c.sub_conditions);
      else if (c.key) {
        const t = c.type ?? "boolean";
        inputs[c.key] = t === "number_min" || t === "threshold" ? 99999 : true;
      }
    }
  };
  for (const s of standards) {
    for (const cat of [s.requirements.equipment, s.requirements.staff, s.requirements.system, s.requirements.performance, s.requirements.training]) {
      visit(cat);
    }
  }
  const results = diagnoseAll(standards, inputs);
  const ng = results.filter((r) => r.verdict === "not_eligible");
  assert.equal(ng.length, 0, `not_eligible under full input: ${ng.map((r) => r.standardId).join(",")}`);
});

test("unlock suggestion surfaces prerequisite-only gap", async () => {
  const { buildUnlockSuggestions } = await import("../lib/suggest");
  const inputs: UserInputs = {
    has_dental_suction: true,
    staff_config_infection: true,
    infection_manager: true,
    infection_control_system: true,
  };
  const results = diagnoseAll(standards, inputs);
  const sug = buildUnlockSuggestions(results, { maxGap: 5 });
  const k = sug.find((s) => s.standardId === "gai_kansen_1");
  assert.ok(k, "外感染1 should be suggested as close");
  assert.equal(k!.prerequisiteOnly, true);
  assert.ok(k!.gapPrerequisites.some((p) => p.id === "ha_shoshin"));
});

test("prerequisite domino lists dependents of ha_shoshin", async () => {
  const { buildPrerequisiteDominoes } = await import("../lib/suggest");
  const results = diagnoseAll(standards, {});
  const dom = buildPrerequisiteDominoes(results, standards);
  const ha = dom.find((d) => d.prerequisiteId === "ha_shoshin");
  assert.ok(ha, "ha_shoshin domino expected");
  assert.ok(ha!.unlocks.length >= 1, "should unlock at least one dependent");
});

test("unlock suggestions exclude eligible/needs_verify standards", async () => {
  const { buildUnlockSuggestions } = await import("../lib/suggest");
  const results = diagnoseAll(standards, {});
  const sug = buildUnlockSuggestions(results, { maxGap: 99 });
  for (const s of sug) {
    const r = results.find((x) => x.standardId === s.standardId)!;
    assert.equal(r.verdict, "not_eligible");
  }
});

test("filing guide: procedure has 5 steps and docs include the 届出書", async () => {
  const { buildProcedure, buildRequiredDocuments } = await import("../lib/filing");
  const s = getStandardById("ha_shoshin")!;
  const steps = buildProcedure(s);
  assert.equal(steps.length, 5);
  assert.ok(steps[1].includes(s.forms.todokede_form), "step2 references the 届出書 form");
  const docs = buildRequiredDocuments(s);
  assert.ok(docs.length >= 1);
  assert.ok(docs[0].label.includes(s.forms.todokede_form), "first doc is the 届出書");
});

test("composite_or met: failed sibling not listed in unmet (spec §6.3)", async () => {
  const { evaluateStandard } = await import("../lib/engine");
  const s = {
    id: "t_or", official_name: "t", common_name: "t", code_number: "x",
    notification_ref: "", category: "特掲診療料", new_or_revised_r8: "継続",
    prerequisites: [], requirements: {
      equipment: [], staff: [], system: [], performance: [{
        label: "or", type: "composite_or", sub_conditions: [
          { key: "ra", label: "A" }, { key: "rb", label: "B" },
        ],
      }], training: [],
    },
    fees: [{ item_name: "x", points: 0 }], forms: { todokede_form: "別添2", attachment_forms: [], attachments: [], e_application_available: null },
    transitional: "", revenue_sim: { linked_items: [], formula: "" }, verify_flags: [],
    last_updated: "2026-06-15", source_version: "", sources: ["x"],
  } as unknown as import("../lib/types").DentalFacilityStandard;
  // A satisfied, B not -> composite met -> B should NOT be in unmetLabels
  const r = evaluateStandard(s, { ra: true }, new Set());
  assert.equal(r.verdict, "eligible");
  assert.ok(!r.unmetLabels.includes("B"));
});

test("composite_or unmet: only the parent summary label is counted, not each child", async () => {
  const { evaluateStandard } = await import("../lib/engine");
  const s = {
    id: "t_or2", official_name: "t", common_name: "t", code_number: "x",
    notification_ref: "", category: "特掲診療料", new_or_revised_r8: "継続",
    prerequisites: [], requirements: {
      equipment: [], staff: [], system: [], performance: [{
        label: "実績(いずれか)", type: "composite_or", sub_conditions: [
          { key: "ra", label: "A" }, { key: "rb", label: "B" },
          { key: "rc", label: "C" }, { key: "rd", label: "D" },
        ],
      }], training: [],
    },
    fees: [{ item_name: "x", points: 0 }], forms: { todokede_form: "別添2", attachment_forms: [], attachments: [], e_application_available: null },
    transitional: "", revenue_sim: { linked_items: [], formula: "" }, verify_flags: [],
    last_updated: "2026-06-15", source_version: "", sources: ["x"],
  } as unknown as import("../lib/types").DentalFacilityStandard;
  // すべて未充足 → composite は未充足。親要約1件のみ計上し、子A〜Dは展開しない。
  const r = evaluateStandard(s, {}, new Set());
  assert.equal(r.verdict, "not_eligible");
  assert.deepEqual(r.unmetLabels, ["実績(いずれか)"]);
  assert.equal(r.unmetLabels.length, 1, "gapCount inflation regression: composite counts as 1");
});

test("official forms: GTR includes 別添2(2-538) and 様式74; baseup_1 includes 別添2(2-611)", async () => {
  const { getOfficialForms } = await import("../data/standards");
  const gtr = getOfficialForms("gtr", "kinki")!;
  const gtrFiles = [gtr.common, ...gtr.forms].map((f) => f.url.split("/").pop());
  assert.ok(gtrFiles.includes("r8-2-538.pdf"), "GTR 別添2 = r8-2-538");
  assert.ok(gtrFiles.includes("r8-t74.pdf"), "GTR 様式74 = r8-t74");
  assert.ok(!gtrFiles.includes("r8-2-484.pdf"), "old wrong GTR form removed");
  const bu = getOfficialForms("baseup_1", "kinki")!;
  const buFiles = bu.forms.map((f) => f.url.split("/").pop());
  assert.ok(buFiles.includes("r8-2-611.pdf"), "baseup_1 別添2 = r8-2-611");
  assert.ok(!buFiles.includes("r8-t94.pdf"), "spurious 様式94 removed");
});

test("official forms: path-swap exclusion falls back to bureau index (no dead link)", async () => {
  const { getOfficialForms } = await import("../data/standards");
  // r8-2-611 は北海道・九州では別番号。直リンクではなく局トップへ誘導する。
  const hok = getOfficialForms("baseup_1", "hokkaido")!;
  const besshi = hok.forms.find((f) => f.label.includes("別添2"))!;
  assert.ok(besshi.url.endsWith("/hokkaido/"), "excluded form points to bureau index");
  assert.ok(!besshi.url.includes("r8-2-611"), "no dead r8-2-611 link on hokkaido");
  // 様式95〜100 は全局で取得可能なのでパス差し替えのまま。
  const yoshiki = hok.forms.find((f) => f.label.includes("様式95"))!;
  assert.ok(yoshiki.url.includes("/hokkaido/r8-t95-100.pdf"));
});

test("empty-requirements standard is not auto-eligible (defensive guard)", async () => {
  const { evaluateStandard } = await import("../lib/engine");
  const empty = {
    id: "t_empty", official_name: "t", common_name: "t", code_number: "x",
    notification_ref: "", category: "特掲診療料", new_or_revised_r8: "継続",
    prerequisites: [], requirements: { equipment: [], staff: [], system: [], performance: [], training: [] },
    fees: [{ item_name: "x", points: 0 }], forms: { todokede_form: "別添2", attachment_forms: [], attachments: [], e_application_available: null },
    transitional: "", revenue_sim: { linked_items: [], formula: "" }, verify_flags: [],
    last_updated: "2026-06-15", source_version: "", sources: ["x"],
  } as unknown as import("../lib/types").DentalFacilityStandard;
  const r = evaluateStandard(empty, {}, new Set());
  assert.equal(r.verdict, "not_eligible");
});
