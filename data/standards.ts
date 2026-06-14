import type { DentalFacilityStandard } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// 令和8年度（2026年6月施行）改定対応 歯科 施設基準データ
//
// 出典：厚労省告示第69〜71号 / 通知 保医発0305第6〜8号 / 近畿厚生局 令和8年度届出様式
//      （各 standard の sources を参照）
//
// 注意（パッケージ Caveats を反映）：
//  - 点数・整理番号は確定情報を優先。解釈が割れる項目は verify / verify_flags に倒している。
//  - 様式番号・電子申請可否（e_application_available）は地域差・更新があり得るため要確認扱い。
//  - 経過措置・「常勤」の定義・研修の有効性は verify=true として返還リスクを回避。
// ─────────────────────────────────────────────────────────────────────────────

const KINKI_KIHON =
  "https://kouseikyoku.mhlw.go.jp/kinki/shinsei/shido_kansa/shitei_kijun/kihon_shika.html";
const KINKI_TOKUTEI =
  "https://kouseikyoku.mhlw.go.jp/kinki/shinsei/shido_kansa/shitei_kijun/tokutei_shika.html";

export const standards: DentalFacilityStandard[] = [
  // ── 基本診療料系 ───────────────────────────────────────────────────────────
  {
    id: "ha_shoshin",
    official_name: "歯科初診料の注1に規定する施設基準（院内感染防止対策）",
    common_name: "歯初診",
    code_number: "1-16",
    notification_ref: "歯科初診料 注1 / 通知1-2の7",
    category: "基本診療料",
    new_or_revised_r8: "継続",
    prerequisites: [],
    requirements: {
      equipment: [
        {
          key: "has_instrument_sterilization",
          label:
            "歯科ユニットごとの注水・吸引・滅菌器等により、患者ごとの器具の交換・滅菌を徹底できる体制を有する",
          type: "boolean",
        },
      ],
      staff: [
        {
          key: "fulltime_dentist_infection_training",
          label: "院内感染防止対策に係る研修を受けた常勤の歯科医師が1名以上配置されている",
          type: "boolean",
          verify: true,
          note: "「常勤」の定義（週所定労働時間等）は厚生局確認が必要。",
        },
      ],
      system: [
        {
          key: "staff_infection_training_held",
          label: "職員に対する院内感染防止対策の研修を定期的に実施している",
          type: "boolean",
        },
        {
          key: "infection_notice_posted",
          label: "院内感染防止対策の体制を院内に掲示している",
          type: "boolean",
        },
        {
          key: "infection_website_posted",
          label: "掲示事項を原則としてウェブサイトに掲載している",
          type: "boolean",
        },
      ],
      performance: [],
      training: [
        {
          key: "training_amr_included",
          label: "令和8年6月1日以降、薬剤耐性（AMR）対策を含む院内感染防止対策研修を受講している",
          type: "boolean",
          verify: true,
          note: "研修内容の有効性・受講時期は経過措置の確認が必要。",
        },
      ],
    },
    fees: [
      { item_name: "歯科初診料", points: 272, unit: "点", frequency_note: "初診1回につき" },
      { item_name: "歯科再診料", points: 59, unit: "点", frequency_note: "再診1回につき" },
    ],
    forms: {
      todokede_form: "様式7",
      attachment_forms: ["様式2の6"],
      attachments: ["院内感染防止対策に関する研修の受講を証する書類"],
      e_application_available: true,
    },
    transitional:
      "令和8年6月1日以降に受講する研修はAMR対策を含むものとする経過措置あり（要確認）。",
    revenue_sim: {
      linked_items: [
        { item: "歯科初診料", points_per_event: 272, default_monthly_count_hint: 60 },
        { item: "歯科再診料", points_per_event: 59, default_monthly_count_hint: 400 },
      ],
      formula: "(272 × 月間初診回数 + 59 × 月間再診回数) × 10円",
    },
    verify_flags: ["常勤歯科医師の定義", "AMR対策研修の有効性・受講時期の経過措置"],
    last_updated: "2026-06-14",
    source_version: "告示第69/70号・通知 保医発0305第7号",
    sources: [
      "https://www.mhlw.go.jp/stf/newpage_67729.html",
      KINKI_KIHON,
      "https://iocil.jp/column/0691/",
    ],
  },
  {
    id: "gai_anzen_1",
    official_name: "歯科外来診療医療安全対策加算1",
    common_name: "外安全1",
    code_number: "1-18",
    notification_ref: "通知1-4",
    category: "基本診療料",
    new_or_revised_r8: "継続",
    prerequisites: [],
    requirements: {
      equipment: [
        { key: "has_aed", label: "自動体外式除細動器（AED）を設置している", type: "boolean" },
        { key: "has_pulse_oximeter", label: "パルスオキシメーターを設置している", type: "boolean" },
        { key: "has_oxygen", label: "酸素供給装置（酸素ボンベ等）を備えている", type: "boolean" },
        { key: "has_bp_monitor", label: "血圧計を備えている", type: "boolean" },
        { key: "has_emergency_kit", label: "救急蘇生セット等の緊急時対応物品を備えている", type: "boolean" },
      ],
      staff: [
        {
          key: "fulltime_dentist_safety_training",
          label: "医療安全対策に係る研修を受けた常勤の歯科医師が1名以上配置されている",
          type: "boolean",
          verify: true,
        },
        {
          key: "staff_config_safety",
          label: "歯科衛生士等の配置を含む医療安全に必要な人員体制を有する",
          type: "boolean",
        },
        {
          key: "safety_manager",
          label: "医療安全管理者を配置している",
          type: "boolean",
        },
      ],
      system: [
        {
          key: "emergency_link_other_clinic",
          label: "緊急時に対応できる他の医療機関との連携体制を確保している",
          type: "boolean",
        },
        {
          key: "hiyari_hatto_or_incident",
          label: "偶発症・ヒヤリハット事例の収集・分析を行う体制を有する",
          type: "boolean",
        },
        { key: "safety_notice_posted", label: "医療安全対策の体制を院内に掲示している", type: "boolean" },
        { key: "safety_website_posted", label: "掲示事項を原則としてウェブサイトに掲載している", type: "boolean" },
      ],
      performance: [],
      training: [],
    },
    fees: [{ item_name: "歯科外来診療医療安全対策加算1", points: 12, unit: "点", frequency_note: "初診時 等" }],
    forms: {
      todokede_form: "様式7",
      attachment_forms: ["様式4"],
      attachments: ["AED等の設備状況がわかる資料", "研修受講を証する書類", "連携体制を示す資料"],
      e_application_available: null,
    },
    transitional: "施設基準を満たせなくなった場合の取扱い等は通知に従う（要確認）。",
    revenue_sim: {
      linked_items: [
        { item: "歯科外来診療医療安全対策加算1（初診）", points_per_event: 12, default_monthly_count_hint: 60 },
        { item: "歯科外来診療医療安全対策加算1（再診）", points_per_event: 2, default_monthly_count_hint: 400 },
      ],
      formula: "(12 × 月間初診回数 + 2 × 月間再診回数) × 10円",
    },
    verify_flags: ["常勤歯科医師・医療安全管理者の要件", "再診時加算点数の有無・点数"],
    last_updated: "2026-06-14",
    source_version: "告示第70号・通知 保医発0305第7号",
    sources: [
      "https://www.tokyo-sk.com/shisetsukijun/",
      KINKI_KIHON,
      "https://3tei.jp/news/IjALkN8R",
    ],
  },
  {
    id: "gai_kansen_1",
    official_name: "歯科外来診療感染対策加算1",
    common_name: "外感染1",
    code_number: "1-20",
    notification_ref: "通知1-4の2",
    category: "基本診療料",
    new_or_revised_r8: "継続",
    prerequisites: ["ha_shoshin"],
    requirements: {
      equipment: [
        {
          key: "has_dental_suction",
          label: "口腔外バキューム等、診療室の感染対策に必要な設備を有する",
          type: "boolean",
        },
      ],
      staff: [
        {
          key: "staff_config_infection",
          label: "感染防止対策に必要な人員体制（常勤歯科医師1名以上 等）を有する",
          type: "boolean",
          verify: true,
        },
        { key: "infection_manager", label: "感染防止対策の責任者を配置している", type: "boolean" },
      ],
      system: [
        {
          key: "infection_control_system",
          label: "標準予防策・院内感染管理の体制を整備し継続している",
          type: "boolean",
        },
      ],
      performance: [],
      training: [],
    },
    fees: [{ item_name: "歯科外来診療感染対策加算1（初診）", points: 12, unit: "点" }],
    forms: {
      todokede_form: "様式7",
      attachment_forms: ["様式4"],
      attachments: ["感染対策設備・体制がわかる資料"],
      e_application_available: null,
    },
    transitional: "歯科初診料（歯初診）の届出が前提。",
    revenue_sim: {
      linked_items: [
        { item: "歯科外来診療感染対策加算1（初診）", points_per_event: 12, default_monthly_count_hint: 60 },
        { item: "歯科外来診療感染対策加算1（再診）", points_per_event: 2, default_monthly_count_hint: 400 },
      ],
      formula: "(12 × 月間初診回数 + 2 × 月間再診回数) × 10円",
    },
    verify_flags: ["常勤歯科医師の定義", "外感染2〜4との区分（人員・連携要件の差）"],
    last_updated: "2026-06-14",
    source_version: "告示第70号・通知 保医発0305第7号",
    sources: [
      "https://www.tokyo-sk.com/shisetsukijun/",
      "https://www.sedent.co.jp/pdf/kansen_02_flyer.pdf",
    ],
  },
  {
    id: "ha_dx_1",
    official_name: "電子的歯科診療情報連携体制整備加算1",
    common_name: "歯医DX1",
    code_number: "1-8",
    notification_ref: "通知1-1の8",
    category: "基本診療料",
    new_or_revised_r8: "新設",
    prerequisites: [],
    requirements: {
      equipment: [],
      staff: [],
      system: [
        {
          key: "online_qualification",
          label: "オンライン資格確認の体制を整備し、運用している",
          type: "boolean",
        },
        { key: "e_receipt", label: "電子レセプトによる請求を行っている", type: "boolean" },
        {
          key: "e_prescription",
          label: "電子処方箋の発行体制を有する（歯医DX1の要件）",
          type: "boolean",
          verify: true,
        },
        {
          key: "e_karte_sharing",
          label: "電子カルテ情報共有サービス等を活用できる体制を有する",
          type: "boolean",
          verify: true,
        },
        {
          key: "myna_rate_30",
          label: "マイナ保険証の利用率が一定割合（30%等）以上である",
          type: "boolean",
          verify: true,
          note: "利用率の基準値・算定期間は告示・経過措置で変動。要確認。",
        },
        { key: "dx_notice_posted", label: "医療DX推進に関する事項を院内・ウェブで掲示している", type: "boolean" },
      ],
      performance: [],
      training: [],
    },
    fees: [
      { item_name: "電子的歯科診療情報連携体制整備加算1（初診）", points: 9, unit: "点" },
      { item_name: "電子的歯科診療情報連携体制整備加算（再診相当）", points: 2, unit: "点" },
    ],
    forms: {
      todokede_form: "様式7",
      attachment_forms: ["様式1の6"],
      attachments: ["オンライン資格確認・電子処方箋等の体制を示す資料"],
      e_application_available: true,
    },
    transitional:
      "旧・医療DX推進体制整備加算／医療情報取得加算を統合して令和8年新設。利用率要件等に経過措置（要確認）。",
    revenue_sim: {
      linked_items: [
        { item: "歯医DX1（初診）", points_per_event: 9, default_monthly_count_hint: 60 },
        { item: "歯医DX1（再診相当）", points_per_event: 2, default_monthly_count_hint: 400 },
      ],
      formula: "(9 × 月間初診回数 + 2 × 月間再診回数) × 10円",
    },
    verify_flags: [
      "マイナ保険証利用率の基準値・算定期間",
      "電子処方箋・電子カルテ情報共有の要否（DX1/DX2の区分）",
      "新設項目のため点数・整理番号は確定情報で要再確認",
    ],
    last_updated: "2026-06-14",
    source_version: "告示第70号・通知 保医発0305第7号（DX加算1）",
    sources: [
      KINKI_KIHON,
      "https://www.phchd.com/jp/medicom/park/idea/medicalfees-medical-promotion-system",
      "https://www.pt-ot-st.net/contents4/medical-treatment-reiwa-8/department/50",
    ],
  },
  {
    id: "baseup_1",
    official_name: "歯科外来・在宅ベースアップ評価料（Ⅰ）",
    common_name: "BU Ⅰ",
    code_number: "区分番号 D01/D02 相当",
    notification_ref: "通知 P100 相当",
    category: "基本診療料",
    new_or_revised_r8: "継続",
    prerequisites: [],
    requirements: {
      equipment: [],
      staff: [
        {
          key: "has_target_staff",
          label: "賃金改善の対象となる職員（歯科衛生士・歯科技工士・事務職員等）を40時間換算等で雇用している",
          type: "boolean",
        },
      ],
      system: [
        {
          key: "outpatient_or_home_care",
          label: "外来・在宅医療を提供する保険医療機関である",
          type: "boolean",
        },
        { key: "wage_improvement_plan", label: "賃金改善計画書を作成している", type: "boolean" },
        { key: "annual_report", label: "毎年8月に賃金改善実績報告書を提出する体制がある", type: "boolean" },
      ],
      performance: [],
      training: [],
    },
    fees: [
      { item_name: "歯科外来・在宅ベースアップ評価料（Ⅰ）初診時", points: 17, unit: "点", frequency_note: "初診時" },
      { item_name: "歯科外来・在宅ベースアップ評価料（Ⅰ）再診時等", points: 4, unit: "点", frequency_note: "再診時等" },
      { item_name: "歯科外来・在宅ベースアップ評価料（Ⅰ）訪問診療1", points: 79, unit: "点" },
      { item_name: "歯科外来・在宅ベースアップ評価料（Ⅰ）訪問診療2", points: 19, unit: "点" },
    ],
    forms: {
      todokede_form: "様式2",
      attachment_forms: ["様式95", "様式100", "D01: 様式I", "D02: 様式I + 様式II"],
      attachments: ["対象職員数・賃金改善額がわかる資料（毎年8月報告）"],
      e_application_available: null,
    },
    transitional: "賃金改善の実績報告は毎年8月1日が期限（要確認）。",
    revenue_sim: {
      linked_items: [
        { item: "ベースアップ評価料Ⅰ（初診）", points_per_event: 17, default_monthly_count_hint: 60 },
        { item: "ベースアップ評価料Ⅰ（再診）", points_per_event: 4, default_monthly_count_hint: 400 },
      ],
      formula: "(17 × 月間初診回数 + 4 × 月間再診回数 + 訪問分) × 10円",
    },
    verify_flags: ["Ⅰ/Ⅱの区分と算定区分番号（D01/D02）", "対象職員の範囲・40時間換算"],
    last_updated: "2026-06-14",
    source_version: "告示第69/71号・通知 保医発0305第8号",
    sources: [
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000188411_00053.html",
      "https://www.pt-ot-st.net/contents4/medical-treatment-reiwa-8/department/67",
      "https://1post.jp/reiwa8-kaitei/o002",
    ],
  },

  // ── 特掲診療料系 ───────────────────────────────────────────────────────────
  {
    id: "kokan_kyo",
    official_name: "口腔管理体制強化加算",
    common_name: "口管強",
    code_number: "2-89",
    notification_ref: "通知1-13の2",
    category: "特掲診療料",
    new_or_revised_r8: "継続",
    prerequisites: ["ha_shoshin"],
    requirements: {
      equipment: [
        {
          key: "has_emergency_equipment",
          label: "緊急時対応の医療機器（AED・酸素・パルスオキシメーター等）を備えている",
          type: "boolean",
        },
      ],
      staff: [
        {
          key: "fulltime_dentist_kokan",
          label: "口腔管理体制の整備に係る研修を修了した常勤の歯科医師が1名以上配置されている",
          type: "boolean",
          verify: true,
        },
        { key: "dental_hygienist", label: "歯科衛生士を配置している", type: "boolean" },
      ],
      system: [
        {
          key: "home_care_link",
          label: "在宅・他医療機関との連携体制（情報提供・診療情報共有）を有する",
          type: "boolean",
        },
        {
          key: "ict_emergency",
          label: "緊急時にICT等を用いて連携医療機関と情報共有できる体制がある",
          type: "boolean",
          verify: true,
        },
      ],
      performance: [
        {
          key: "oral_function_record",
          label: "口腔機能管理（口腔機能発達不全症・口腔機能低下症等）の実績がある",
          type: "boolean",
        },
        { key: "caries_prevention_record", label: "う蝕・歯周病の重症化予防に係る管理実績がある", type: "boolean" },
      ],
      training: [
        {
          key: "training_kokan",
          label: "口腔管理体制強化加算に係る所定の研修を修了している",
          type: "boolean",
          verify: true,
        },
      ],
    },
    fees: [{ item_name: "口腔管理体制強化加算", points: 48, unit: "点", frequency_note: "所定の管理料に加算" }],
    forms: {
      todokede_form: "様式2",
      attachment_forms: ["様式17の2"],
      attachments: ["研修修了証", "連携体制・実績がわかる資料"],
      e_application_available: null,
    },
    transitional: "令和6年改定で旧『かかりつけ歯科医機能強化型歯科診療所（か強診）』から再編。",
    revenue_sim: {
      linked_items: [
        { item: "口腔管理体制強化加算（SPT・歯管 等に加算）", points_per_event: 48, default_monthly_count_hint: 120 },
      ],
      formula: "48 × 月間算定回数 × 10円",
    },
    verify_flags: ["常勤歯科医師の研修要件（整理番号 2-89 系の確定情報）", "実績要件の閾値"],
    last_updated: "2026-06-14",
    source_version: "告示第71号・通知 保医発0305第8号",
    sources: [
      "https://iocil.jp/column/0693/",
      "https://kouseikyoku.mhlw.go.jp/kantoshinetsu/r6-t17-2.pdf",
      "https://www.ibaho.jp/20250117-2",
    ],
  },
  {
    id: "shien_shin_1",
    official_name: "在宅療養支援歯科診療所1",
    common_name: "歯援診1",
    code_number: "2-92",
    notification_ref: "通知1-14",
    category: "特掲診療料",
    new_or_revised_r8: "継続",
    prerequisites: [],
    requirements: {
      equipment: [
        {
          key: "has_portable_equipment",
          label: "歯科訪問診療に必要な可搬式機器（ポータブルユニット・吸引・レントゲン等）を有する",
          type: "boolean",
        },
      ],
      staff: [
        {
          key: "dentist_home_training",
          label: "在宅歯科医療・高齢者の口腔機能管理等に係る研修を修了した歯科医師を配置している",
          type: "boolean",
          verify: true,
        },
        { key: "dental_hygienist_home", label: "歯科衛生士を配置している", type: "boolean" },
      ],
      system: [
        {
          key: "medical_link",
          label: "医科医療機関・介護施設・地域包括ケアとの連携体制を有する",
          type: "boolean",
        },
      ],
      performance: [
        {
          key: "visit_performance_select",
          label: "歯科訪問診療の実績（直近1年間の訪問診療件数等）が基準を満たす",
          type: "number_min",
          number_min: 15,
          unit: "件/年",
          verify: true,
          note: "歯援診1/2で要求件数が異なる。確定値は通知で要確認。",
        },
      ],
      training: [],
    },
    fees: [{ item_name: "在宅療養支援歯科診療所1（各種加算の前提）", points: 100, unit: "点", frequency_note: "関連加算に反映" }],
    forms: {
      todokede_form: "様式2",
      attachment_forms: ["様式18"],
      attachments: ["訪問診療実績がわかる資料", "連携先一覧", "研修修了証"],
      e_application_available: null,
    },
    transitional: "歯援診1（様式18）。実績件数・連携要件は令和8年版で要確認。",
    revenue_sim: {
      linked_items: [
        { item: "歯援診1 関連加算（訪問診療料等への加算）", points_per_event: 100, default_monthly_count_hint: 20 },
      ],
      formula: "100 × 月間訪問関連算定回数(目安) × 10円",
    },
    verify_flags: ["訪問診療の実績件数の閾値（歯援診1/2の区分）", "連携・研修要件"],
    last_updated: "2026-06-14",
    source_version: "告示第71号・通知 保医発0305第8号",
    sources: [
      "https://note.com/wise_gecko5071/n/ne1a708c86e68",
      KINKI_TOKUTEI,
      "https://www.mhlw.go.jp/content/12400000/001671913.pdf",
    ],
  },
  {
    id: "ha_homon_chiiki_renkei",
    official_name: "歯科訪問診療料の注に規定する地域医療連携体制加算",
    common_name: "地域連携",
    code_number: "2-132",
    notification_ref: "通知1-14の系",
    category: "特掲診療料",
    new_or_revised_r8: "改定",
    prerequisites: [],
    requirements: {
      equipment: [],
      staff: [],
      system: [
        {
          key: "emergency_24h_link",
          label: "24時間対応可能な連携医療機関・後方支援体制を確保している",
          type: "boolean",
        },
        {
          key: "info_provision",
          label: "連携医療機関等への診療情報提供・共有体制を整備している",
          type: "boolean",
        },
      ],
      performance: [],
      training: [],
    },
    fees: [{ item_name: "地域医療連携体制加算", points: 300, unit: "点", frequency_note: "1回につき" }],
    forms: {
      todokede_form: "様式2",
      attachment_forms: ["様式21"],
      attachments: ["連携体制を示す資料"],
      e_application_available: null,
    },
    transitional: "様式21の3／整理番号2-133系との関係に注意（要確認）。",
    revenue_sim: {
      linked_items: [
        { item: "地域医療連携体制加算", points_per_event: 300, default_monthly_count_hint: 10 },
      ],
      formula: "300 × 月間算定回数 × 10円",
    },
    verify_flags: ["様式21/様式21の3の別", "整理番号2-132/2-133の確定情報"],
    last_updated: "2026-06-14",
    source_version: "告示第71号・通知 保医発0305第8号",
    sources: ["https://www.houmonshika.org/dental/labo7/", KINKI_TOKUTEI],
  },
  {
    id: "cadcam_kogaku",
    official_name: "CAD/CAM冠・CAD/CAMインレー及び光学印象に係る施設基準",
    common_name: "CAD/CAM・光学印象",
    code_number: "特掲（区分 M015-2 等）",
    notification_ref: "M015-2/M015-3/M003-4",
    category: "特掲診療料",
    new_or_revised_r8: "改定",
    prerequisites: [],
    requirements: {
      equipment: [
        { key: "has_cadcam_unit", label: "院内技工またはCAD/CAM冠の作製に対応できる体制を有する", type: "boolean" },
        { key: "has_digital_impression", label: "光学印象に用いる口腔内スキャナーを有する", type: "boolean" },
      ],
      staff: [
        {
          key: "dentist_3yr_prosthetics",
          label: "歯科補綴に係る3年以上の経験を有する歯科医師を配置している",
          type: "boolean",
          verify: true,
        },
        { key: "dental_technician", label: "歯科技工士との連携体制を有する", type: "boolean" },
      ],
      system: [
        { key: "data_security", label: "デジタルデータの管理・安全管理体制を有する", type: "boolean" },
      ],
      performance: [],
      training: [],
    },
    fees: [
      { item_name: "光学印象（CAD/CAM インレー等）", points: 150, unit: "点", frequency_note: "1装置につき" },
      { item_name: "光学印象歯科技工士連携加算", points: 50, unit: "点", frequency_note: "1回につき" },
    ],
    forms: {
      todokede_form: "様式2",
      attachment_forms: ["様式50の2"],
      attachments: ["CAD/CAM・口腔内スキャナーの設備状況がわかる資料"],
      e_application_available: null,
    },
    transitional: "令和8年改定でCAD/CAMの対象範囲・点数が見直し（要確認）。",
    revenue_sim: {
      linked_items: [
        { item: "光学印象", points_per_event: 150, default_monthly_count_hint: 20 },
        { item: "光学印象歯科技工士連携加算", points_per_event: 50, default_monthly_count_hint: 20 },
      ],
      formula: "(150 × 月間光学印象回数 + 50 × 連携加算回数) × 10円",
    },
    verify_flags: ["歯科医師の経験年数要件（3年）", "対象補綴物の範囲・点数（令和8年改定）"],
    last_updated: "2026-06-14",
    source_version: "告示第69/71号・R6点数表からの改定差分",
    sources: [
      "https://shirobon.net/medicalfee/latest/shika/r06_shika/r06s_ch2/r06s2_pa12/",
      "https://kouseikyoku.mhlw.go.jp/kyushu/r6-t50-2.pdf",
      "https://www.shirane-dental.co.jp/2026kaitei",
    ],
  },
  {
    id: "giko_renkei",
    official_name: "歯科技工士連携加算1・2（光学印象歯科技工士連携加算）",
    common_name: "技工連携1・2",
    code_number: "特掲（区分 M003-4 等）",
    notification_ref: "通知（技工連携）",
    category: "特掲診療料",
    new_or_revised_r8: "改定",
    prerequisites: [],
    requirements: {
      equipment: [
        {
          key: "ict_for_renkei2",
          label: "ICTを用いて歯科技工士とリアルタイム連携できる環境を有する（連携加算2）",
          type: "boolean",
          verify: true,
        },
      ],
      staff: [
        { key: "dental_technician_coop", label: "歯科技工士との連携体制（院内技工士または外部委託先）を有する", type: "boolean" },
      ],
      system: [],
      performance: [],
      training: [],
    },
    fees: [
      { item_name: "歯科技工士連携加算1", points: 50, unit: "点", frequency_note: "1装置1回" },
      { item_name: "歯科技工士連携加算2", points: 70, unit: "点", frequency_note: "1装置1回" },
    ],
    forms: {
      todokede_form: "様式2",
      attachment_forms: ["様式（CAD/CAM・技工連携 関連）"],
      attachments: ["連携体制を示す資料"],
      e_application_available: null,
    },
    transitional: "連携加算2はICTを用いた連携が要件（要確認）。",
    revenue_sim: {
      linked_items: [
        { item: "歯科技工士連携加算1", points_per_event: 50, default_monthly_count_hint: 10 },
        { item: "歯科技工士連携加算2", points_per_event: 70, default_monthly_count_hint: 10 },
      ],
      formula: "(50 × 連携1回数 + 70 × 連携2回数(ICT)) × 10円",
    },
    verify_flags: ["連携加算2のICT要件の具体", "区分番号・整理番号の確定情報"],
    last_updated: "2026-06-14",
    source_version: "告示第69/71号",
    sources: [
      "https://www.dentwave.com/column_20241212_dw",
      "https://www.shirane-dental.co.jp/2026kaitei",
    ],
  },
  {
    id: "ushokugishososhaku",
    official_name: "有床義歯咀嚼機能検査・咀嚼能力検査・咬合圧検査に係る施設基準",
    common_name: "咀嚼機能検査",
    code_number: "2-184",
    notification_ref: "D011/D011-2/D011-3",
    category: "特掲診療料",
    new_or_revised_r8: "継続",
    prerequisites: [],
    requirements: {
      equipment: [
        {
          key: "has_masticatory_device",
          label: "咀嚼能力検査・咬合圧検査に対応する検査機器を有する",
          type: "boolean",
        },
      ],
      staff: [
        {
          key: "dentist_experience",
          label: "当該検査に係る経験を有する歯科医師を配置している",
          type: "boolean",
          verify: true,
        },
      ],
      system: [],
      performance: [],
      training: [],
    },
    fees: [{ item_name: "有床義歯咀嚼機能検査 1（届出が前提）", points: 0, unit: "点", frequency_note: "検査料は別途算定" }],
    forms: {
      todokede_form: "様式2",
      attachment_forms: ["様式38の1の2"],
      attachments: ["検査機器の保有状況がわかる資料"],
      e_application_available: null,
    },
    transitional: "検査区分（D011/D012）の対応関係に注意（要確認）。",
    revenue_sim: {
      linked_items: [
        { item: "有床義歯咀嚼機能検査 等", points_per_event: 0, default_monthly_count_hint: 5 },
      ],
      formula: "検査点数 × 月間算定回数 × 10円（点数は検査区分に依存）",
    },
    verify_flags: ["検査機器の要件", "D011/D012系の区分（咀嚼能力検査・咬合圧検査）"],
    last_updated: "2026-06-14",
    source_version: "告示第69/71号",
    sources: [
      "https://shirobon.net/medicalfee/latest/shika/r06_shika/r06s_ch2/",
      KINKI_TOKUTEI,
    ],
  },
  {
    id: "gtr",
    official_name: "歯周組織再生誘導手術（GTR）に係る施設基準",
    common_name: "GTR",
    code_number: "特掲（区分 J063）",
    notification_ref: "J063",
    category: "特掲診療料",
    new_or_revised_r8: "継続",
    prerequisites: [],
    requirements: {
      equipment: [],
      staff: [
        {
          key: "dentist_perio_experience",
          label: "歯周外科手術に係る経験を有する歯科医師を配置している",
          type: "boolean",
          verify: true,
        },
      ],
      system: [],
      performance: [],
      training: [],
    },
    fees: [
      { item_name: "歯周組織再生誘導手術 1歯（複雑なもの）", points: 840, unit: "点", frequency_note: "1歯につき" },
      { item_name: "歯周組織再生誘導手術 2（その他）", points: 380, unit: "点", frequency_note: "1歯につき" },
    ],
    forms: {
      todokede_form: "様式2",
      attachment_forms: ["様式74"],
      attachments: ["歯科医師の経験を証する資料"],
      e_application_available: null,
    },
    transitional: "R6からの継続。様式74。",
    revenue_sim: {
      linked_items: [
        { item: "歯周組織再生誘導手術 1歯", points_per_event: 840, default_monthly_count_hint: 2 },
      ],
      formula: "840 × 月間1歯算定回数 × 10円",
    },
    verify_flags: ["歯科医師の経験要件（R6 様式74）", "対象部位・点数区分"],
    last_updated: "2026-06-14",
    source_version: "R6点数表からの継続（告示第69号）",
    sources: [
      "https://shirobon.net/medicalfee/latest/shika/r06_shika/r06s_ch2/r06s2_pa9/",
      "https://kouseikyoku.mhlw.go.jp/kyushu/shinsei/shido_kansa/shitei_kijun/doc",
    ],
  },
  {
    id: "laser_koku_nenmaku",
    official_name: "レーザー機器加算（口腔粘膜処置）に係る施設基準",
    common_name: "レーザー",
    code_number: "特掲（区分 49-9 系）",
    notification_ref: "口腔粘膜処置 / レーザー機器加算",
    category: "特掲診療料",
    new_or_revised_r8: "継続",
    prerequisites: [],
    requirements: {
      equipment: [
        { key: "has_laser_device", label: "口腔粘膜処置に用いるレーザー機器を有する", type: "boolean" },
      ],
      staff: [],
      system: [],
      performance: [],
      training: [],
    },
    fees: [{ item_name: "レーザー機器加算（口腔粘膜処置）", points: 0, unit: "点", frequency_note: "処置に加算" }],
    forms: {
      todokede_form: "様式2",
      attachment_forms: ["様式49の9"],
      attachments: ["レーザー機器の保有状況がわかる資料"],
      e_application_available: null,
    },
    transitional: "R6からの継続。様式49の9。",
    revenue_sim: {
      linked_items: [
        { item: "レーザー機器加算", points_per_event: 0, default_monthly_count_hint: 10 },
      ],
      formula: "加算点数 × 月間算定回数 × 10円",
    },
    verify_flags: ["対象機器・対象処置の範囲（様式49の9）", "加算点数の確定情報"],
    last_updated: "2026-06-14",
    source_version: "R6点数表からの継続（告示第69号）",
    sources: [
      "https://kouseikyoku.mhlw.go.jp/shikoku/r6-t49-9.pdf",
      "https://clinicalsup.jp/jpoc/shinryou.aspx?file=ika_2_10_3/k939-7.html",
    ],
  },
  {
    id: "kikan_anzen_shika",
    official_name: "医療機器安全管理料（歯科）に係る施設基準",
    common_name: "機器安全",
    code_number: "2-86",
    notification_ref: "通知1-12の2",
    category: "特掲診療料",
    new_or_revised_r8: "継続",
    prerequisites: [],
    requirements: {
      equipment: [
        { key: "has_radiation_device", label: "管理対象となる医療機器（歯科用X線等）を有する", type: "boolean" },
      ],
      staff: [
        {
          key: "staff_for_device_safety",
          label: "医療機器の安全管理に係る責任者を配置している",
          type: "boolean",
          verify: true,
        },
      ],
      system: [],
      performance: [],
      training: [],
    },
    fees: [{ item_name: "医療機器安全管理料（歯科）", points: 0, unit: "点", frequency_note: "区分に依存" }],
    forms: {
      todokede_form: "様式2",
      attachment_forms: ["様式15"],
      attachments: ["責任者の配置・機器の状況がわかる資料"],
      e_application_available: null,
    },
    transitional: "",
    revenue_sim: {
      linked_items: [
        { item: "医療機器安全管理料（歯科）", points_per_event: 0, default_monthly_count_hint: 5 },
      ],
      formula: "区分点数 × 月間算定回数 × 10円",
    },
    verify_flags: ["責任者の要件", "対象機器・点数区分（様式15）"],
    last_updated: "2026-06-14",
    source_version: "告示第71号",
    sources: [KINKI_TOKUTEI],
  },
  {
    id: "ikan",
    official_name: "歯科治療時医療管理料に係る施設基準",
    common_name: "医管",
    code_number: "2-88",
    notification_ref: "通知1-13",
    category: "特掲診療料",
    new_or_revised_r8: "継続",
    prerequisites: [],
    requirements: {
      equipment: [
        {
          key: "has_monitoring_device",
          label: "血圧・脈拍・経皮的動脈血酸素飽和度等を経時的に監視できる機器を有する",
          type: "boolean",
        },
      ],
      staff: [
        {
          key: "dentist_management",
          label: "全身的な医療管理に係る経験を有する歯科医師を配置している",
          type: "boolean",
          verify: true,
        },
      ],
      system: [
        {
          key: "emergency_link_ikan",
          label: "緊急時に対応できる医科医療機関との連携体制を有する",
          type: "boolean",
        },
      ],
      performance: [],
      training: [],
    },
    fees: [{ item_name: "歯科治療時医療管理料", points: 45, unit: "点", frequency_note: "1日につき" }],
    forms: {
      todokede_form: "様式2",
      attachment_forms: ["様式17"],
      attachments: ["監視機器の保有状況・連携体制がわかる資料"],
      e_application_available: null,
    },
    transitional: "整理番号 2-101／様式17 系の確定情報を要確認。",
    revenue_sim: {
      linked_items: [
        { item: "歯科治療時医療管理料", points_per_event: 45, default_monthly_count_hint: 20 },
      ],
      formula: "45 × 月間算定回数 × 10円",
    },
    verify_flags: ["歯科医師の経験要件", "整理番号・様式（2-88/2-101系）の確定情報"],
    last_updated: "2026-06-14",
    source_version: "告示第71号",
    sources: [KINKI_TOKUTEI],
  },
];

/** id で施設基準を引く。 */
export function getStandardById(id: string): DentalFacilityStandard | undefined {
  return standards.find((s) => s.id === id);
}
