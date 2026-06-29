import type { DentalFacilityStandard } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// 令和8年度（2026年6月施行）改定対応 歯科 施設基準データ【一次情報照合版】
//
// 出典：
//  - 告示：令和8年厚生労働省告示第69号（点数表）・第70号（基本診療料施設基準）・
//          第71号（特掲診療料施設基準）
//  - 通知：保医発0305第6〜8号（令和8年3月5日）
//  - 各地方厚生局 令和8年度 届出様式一覧（近畿 kihon_r08k.html / tokukei_r08t.html、
//          関東信越・東海北陸・九州 等）、しろぼんねっと 令和8年点数表
//
// 検証状況：
//  - 整理番号・届出様式・点数は、原則として地方厚生局2機関以上の公式一覧＋点数表で
//    クロスチェックした確定値を採用（各 standard の sources を参照）。
//  - 一次資料で確認できなかった令和8年度の細目（実績件数の一部閾値・新設項目の細部・
//    令和8固有の経過措置の逐語等）は、憶測で確定にせず condition.verify / verify_flags
//    で「要確認」に倒している（返還リスク回避）。
// ─────────────────────────────────────────────────────────────────────────────

const KINKI_KIHON =
  "https://kouseikyoku.mhlw.go.jp/kinki/shinsei/shido_kansa/shitei_kijun/kihon_r08k.html";
const KINKI_TOKUTEI =
  "https://kouseikyoku.mhlw.go.jp/kinki/shinsei/shido_kansa/shitei_kijun/tokukei_r08t.html";
const KANTO_TOKUTEI =
  "https://kouseikyoku.mhlw.go.jp/kantoshinetsu/shinsei/shido_kansa/shitei_kijun/tokukei_shinryo_r08.html";
const SHIROBON_A000 =
  "https://shirobon.net/medicalfee/latest/shika/r08_shika/r08s_ch1/r08s1_pa1/r08s11_sec1/r08s111_A000.html";
const MHLW_R8 = "https://www.mhlw.go.jp/stf/newpage_67729.html";

export const standards: DentalFacilityStandard[] = [
  // ── 基本診療料系 ───────────────────────────────────────────────────────────
  {
    id: "ha_shoshin",
    official_name: "歯科点数表の初診料の注1に規定する施設基準（院内感染防止対策）",
    common_name: "歯初診",
    code_number: "1-16",
    code_number_bureau: "近畿・九州 令和8",
    notification_ref: "初診料（歯科）注1（歯A000注1）／ 保医発0305第7号 別添1 第2の7",
    category: "基本診療料",
    new_or_revised_r8: "改定",
    prerequisites: [],
    requirements: {
      equipment: [
        {
          key: "has_instrument_sterilization",
          label:
            "口腔内で使用する歯科医療機器等について、患者ごとの交換や専用の機器を用いた洗浄・滅菌処理を徹底している",
          type: "boolean",
        },
      ],
      staff: [
        {
          key: "fulltime_dentist_infection_training",
          label:
            "院内感染防止対策（標準予防策・新興感染症対策。抗菌薬の適正使用を含む）の研修を4年に1回以上受講し、受講記録を保管している常勤歯科医師が1名以上配置されている",
          type: "boolean",
        },
      ],
      system: [
        {
          key: "infection_patient_system",
          label: "感染症患者に対する歯科診療を円滑に実施する体制を確保している",
          type: "boolean",
        },
        {
          key: "infection_notice_posted",
          label: "院内感染防止対策を実施している旨を見やすい場所に院内掲示している",
          type: "boolean",
        },
        {
          key: "infection_website_posted",
          label: "院内掲示事項を原則としてウェブサイトに掲載している（自院HP等がない場合を除く）",
          type: "boolean",
        },
      ],
      performance: [],
      training: [
        {
          key: "staff_infection_training_held",
          label:
            "職員を対象とした院内感染防止対策（標準予防策・新興感染症対策等）の院内研修等を実施している（令和8年度新設）",
          type: "boolean",
        },
      ],
    },
    fees: [
      { item_name: "歯科初診料（届出あり）", points: 272, unit: "点", frequency_note: "届出なしは245点" },
      { item_name: "歯科再診料（届出あり）", points: 59, unit: "点", frequency_note: "届出なしは45点" },
    ],
    forms: {
      todokede_form: "別添7",
      attachment_forms: ["様式2の6"],
      attachments: ["院内感染防止対策に係る研修の受講を確認できる書類"],
      e_application_available: true,
    },
    transitional:
      "令和8年度改定で職員対象の院内研修(4)が新設、研修内容に抗菌薬の適正使用が追加、旧「年1回の様式2の7報告」は廃止。既届出機関は再届出不要（通知 表3「届出を必要としないもの」）。",
    revenue_sim: {
      // 歯初診は「加算」ではなく「減算」方式。届出による収益メリットは届出あり/なしの差額。
      // 初診 272-245=27点、再診 59-45=14点。
      linked_items: [
        { item: "歯科初診料 届出による差額（272-245）", points_per_event: 27, default_monthly_count_hint: 60 },
        { item: "歯科再診料 届出による差額（59-45）", points_per_event: 14, default_monthly_count_hint: 400 },
      ],
      formula: "(27 × 月間初診回数 + 14 × 月間再診回数) × 10円 ※届出あり/なしの差額",
      exclusive_group: "shoshin_type",
    },
    verify_flags: [
      "届出様式2の6の最新記載項目は各厚生局PDFで最終確認",
      "「常勤」の定義（週所定労働時間等）は通則に従う",
    ],
    last_updated: "2026-06-14",
    source_version: "告示第69/70号・保医発0305第7号（令和8年3月5日 別添1 第2の7）",
    sources: [
      MHLW_R8,
      "https://www.mhlw.go.jp/content/12400000/001707254.pdf",
      SHIROBON_A000,
      KINKI_KIHON,
    ],
  },
  {
    id: "gai_anzen_1",
    official_name: "歯科外来診療医療安全対策加算1",
    common_name: "外安全1",
    code_number: "1-18",
    code_number_bureau: "近畿・東海北陸 令和8",
    notification_ref: "通知 別添1-3 / 歯科初診料 注10 等",
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
        },
        {
          key: "safety_manager",
          label: "歯科医療安全管理者（責任者）を配置している",
          type: "boolean",
        },
      ],
      system: [
        {
          key: "emergency_link_other_clinic",
          label: "緊急時に対応できる別の医療機関との連携体制を確保している",
          type: "boolean",
        },
        {
          key: "hiyari_hatto_or_incident",
          label: "偶発症・ヒヤリハット事例の収集・分析等の医療安全管理体制を有する",
          type: "boolean",
        },
      ],
      performance: [],
      training: [],
    },
    fees: [{ item_name: "歯科外来診療医療安全対策加算1（初診）", points: 12, unit: "点", frequency_note: "初診時。再診時は2点" }],
    forms: {
      todokede_form: "別添7",
      attachment_forms: ["様式4"],
      attachments: ["AED等の設備状況がわかる資料", "研修受講を証する書類", "連携体制を示す資料"],
      e_application_available: true,
    },
    transitional:
      "令和6年改定で旧「歯科外来診療環境体制加算（外来環）」から医療安全対策加算・感染対策加算に再編済。令和8年は区分・点数据え置き。",
    revenue_sim: {
      linked_items: [
        { item: "外安全1（初診）", points_per_event: 12, default_monthly_count_hint: 60 },
        { item: "外安全1（再診）", points_per_event: 2, default_monthly_count_hint: 400 },
      ],
      formula: "(12 × 月間初診回数 + 2 × 月間再診回数) × 10円",
      exclusive_group: "gaianzen",
    },
    verify_flags: ["外安全2（整理番号1-19・様式4の1の2）との要件差", "医療安全管理者の常勤要件"],
    last_updated: "2026-06-14",
    source_version: "告示第70号・保医発0305第7号",
    sources: [KINKI_KIHON, "https://kouseikyoku.mhlw.go.jp/kinki/r8-k04.pdf", SHIROBON_A000],
  },
  {
    id: "gai_kansen_1",
    official_name: "歯科外来診療感染対策加算1",
    common_name: "外感染1",
    code_number: "1-20",
    code_number_bureau: "近畿・東海北陸 令和8",
    notification_ref: "通知 別添1-4の2 / 歯科初診料 注10・再診料 注9",
    category: "基本診療料",
    new_or_revised_r8: "継続",
    prerequisites: ["ha_shoshin"],
    requirements: {
      equipment: [
        {
          key: "has_dental_suction",
          label: "歯科用吸引装置等により、歯科ユニットごとに切削時等の飛散物質を吸収できる環境を有する",
          type: "boolean",
        },
      ],
      staff: [
        {
          key: "staff_config_infection",
          label:
            "歯科医師が複数名、又は歯科医師1名以上＋（歯科衛生士もしくは院内感染防止対策研修受講者）1名以上配置されている",
          type: "boolean",
        },
        { key: "infection_manager", label: "院内感染管理者を配置している", type: "boolean" },
      ],
      system: [
        {
          key: "infection_control_system",
          label: "標準予防策に基づく院内感染管理の体制を整備している",
          type: "boolean",
        },
      ],
      performance: [],
      training: [],
    },
    fees: [{ item_name: "歯科外来診療感染対策加算1（初診）", points: 12, unit: "点", frequency_note: "初診時。再診時は2点" }],
    forms: {
      todokede_form: "別添7",
      attachment_forms: ["様式4"],
      attachments: ["感染対策設備・体制がわかる資料"],
      e_application_available: true,
    },
    transitional:
      "歯科初診料（歯初診）の届出が前提。外感染1・2は様式4、外感染3・4（地域歯科診療支援病院）は様式4の1の2。届出に実績は不要。",
    revenue_sim: {
      linked_items: [
        { item: "外感染1（初診）", points_per_event: 12, default_monthly_count_hint: 60 },
        { item: "外感染1（再診）", points_per_event: 2, default_monthly_count_hint: 400 },
      ],
      formula: "(12 × 月間初診回数 + 2 × 月間再診回数) × 10円",
      exclusive_group: "gaikansen",
    },
    verify_flags: [
      "外感染2（1-21・初診14/再診4点）/3（1-22・13/3点）/4（1-23・15/5点）は新興感染症対応（BCP・医科連携・研修1年に1回）等の追加要件あり",
    ],
    last_updated: "2026-06-14",
    source_version: "告示第70号・保医発0305第7号",
    sources: [
      KINKI_KIHON,
      "https://kouseikyoku.mhlw.go.jp/kinki/r8-k04.pdf",
      "https://www.sedent.co.jp/pdf/kansen_02_flyer.pdf",
    ],
  },
  {
    id: "ha_dx_1",
    official_name: "電子的歯科診療情報連携体制整備加算1",
    common_name: "歯医DX1",
    code_number: "1-8",
    code_number_bureau: "近畿・東海北陸 令和8",
    notification_ref: "通知 別添1-1の8 / 初診料（A000）注15・再診料（A002）注12",
    category: "基本診療料",
    new_or_revised_r8: "新設",
    prerequisites: [],
    requirements: {
      equipment: [],
      staff: [],
      system: [
        {
          key: "e_receipt",
          label: "電子情報処理組織を使用した診療報酬請求（オンライン請求）を行っている",
          type: "boolean",
        },
        {
          key: "online_qualification",
          label: "オンライン資格確認（電子資格確認）を行う体制を整備している",
          type: "boolean",
        },
        {
          key: "detailed_receipt_free",
          label: "詳細な明細書を患者に無料で交付している",
          type: "boolean",
        },
        {
          key: "dx_notice_posted",
          label: "医療DX推進の体制に関する事項を見やすい場所に掲示し、ウェブサイトに掲載している",
          type: "boolean",
        },
        {
          key: "e_prescription",
          label: "電子処方箋を発行する体制を有する（加算1の上位要件）",
          type: "boolean",
        },
        {
          key: "e_karte_sharing",
          label:
            "電子カルテ情報共有サービス（または同サービスにより取得した診療情報を活用する体制）を有する（加算1の上位要件）",
          type: "boolean",
          verify: true,
          note: "電子カルテ情報共有サービスの活用要件には令和9年5月31日までの経過措置あり。",
        },
        {
          key: "myna_rate_threshold",
          label: "マイナ保険証の利用率が30%以上である（算定月の3〜5か月前のレセプト件数のいずれかで判定）",
          type: "boolean",
        },
      ],
      performance: [],
      training: [],
    },
    fees: [
      { item_name: "電子的歯科診療情報連携体制整備加算1（初診）", points: 9, unit: "点", frequency_note: "初診料 注14・月1回" },
      { item_name: "電子的歯科診療情報連携体制整備加算（再診）", points: 2, unit: "点", frequency_note: "再診料 注12・月1回（加算1/2共通）" },
    ],
    forms: {
      todokede_form: "別添7",
      attachment_forms: ["様式1の6"],
      attachments: ["オンライン資格確認・電子処方箋・電子カルテ情報共有サービス等の体制を示す資料"],
      e_application_available: true,
    },
    transitional:
      "令和8年新設。旧「医療DX推進体制整備加算（歯科）」を置換して新設。旧加算からの自動移行はなく、令和8年6月1日以降の算定には改めて届出が必要（疑義解釈 別添3 問2）。電子カルテ情報共有サービスの活用要件は令和9年5月31日まで経過措置。施行は令和8年6月1日。",
    transitional_deadline: "2027-05-31",
    revenue_sim: {
      linked_items: [
        { item: "歯医DX1（初診）", points_per_event: 9, default_monthly_count_hint: 60, once_per_month: true },
        { item: "歯医DX（再診）", points_per_event: 2, default_monthly_count_hint: 400, once_per_month: true },
      ],
      formula: "(9 × 月間初診回数 + 2 × 月間再診回数) × 10円",
    },
    verify_flags: [
      "加算2（整理番号1-8-2・初診4点）は電子処方箋等の上位要件が不要",
      "明細書発行体制等加算とは併算定不可",
    ],
    last_updated: "2026-06-14",
    source_version: "告示第70号・保医発0305第7号（歯科点数表 初診料注14/再診料注12）",
    sources: [
      "https://www.mhlw.go.jp/content/10808000/001655179.pdf",
      "https://kouseikyoku.mhlw.go.jp/tokaihokuriku/r8-k01-6.pdf",
      KINKI_KIHON,
    ],
  },
  {
    id: "baseup_1",
    official_name: "歯科外来・在宅ベースアップ評価料（Ⅰ）",
    common_name: "歯外在ベⅠ",
    code_number: "2-611",
    code_number_bureau: "近畿 令和8",
    notification_ref: "特掲診療料 / 告示第71号・保医発0305第8号",
    category: "特掲診療料",
    new_or_revised_r8: "改定",
    prerequisites: [],
    requirements: {
      equipment: [],
      staff: [
        {
          key: "has_target_staff",
          label: "賃金改善の対象となる職員（歯科衛生士・歯科技工士・看護職員・事務職員等）を雇用している",
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
        { key: "annual_report", label: "毎年8月に賃金改善実績報告書を地方厚生局へ提出する体制がある", type: "boolean" },
      ],
      performance: [],
      training: [],
    },
    fees: [
      { item_name: "歯科外来・在宅ベースアップ評価料（Ⅰ）初診時", points: 21, unit: "点", frequency_note: "1日につき・初診時" },
      { item_name: "（Ⅰ）再診時等", points: 4, unit: "点", frequency_note: "1日につき・再診時等" },
      { item_name: "（Ⅰ）訪問診療 イ（同一建物以外）", points: 66, unit: "点", frequency_note: "1日につき" },
      { item_name: "（Ⅰ）訪問診療 ロ（イ以外）", points: 11, unit: "点", frequency_note: "1日につき" },
    ],
    forms: {
      todokede_form: "別添2",
      attachment_forms: ["様式95"],
      attachments: ["賃金改善計画書", "対象職員数・賃金改善額がわかる資料（毎年8月実績報告）"],
      // ベースアップ評価料は電子申請・届出システムでは受け付けず、専用メールにExcel様式を添付して提出。
      e_application_available: false,
    },
    transitional:
      "令和8年度改定で点数引き上げ（初診10→21点等）、（Ⅱ）の区分拡大（8→12段階）、対象職員の拡大（40歳未満の勤務医・勤務歯科医師・事務職員を追加。40歳以上の医師・歯科医師・業務委託者・経営者・役員は除く）。賃金改善計画書の事前提出は廃止（届出簡略化）。令和8年6月1日施行に伴い再届出が必要。",
    revenue_sim: {
      linked_items: [
        { item: "ベースアップ評価料Ⅰ（初診）", points_per_event: 21, default_monthly_count_hint: 60 },
        { item: "ベースアップ評価料Ⅰ（再診）", points_per_event: 4, default_monthly_count_hint: 400 },
      ],
      formula: "(21 × 月間初診回数 + 4 × 月間再診回数 + 訪問分66/11点) × 10円",
    },
    verify_flags: [
      "（Ⅱ）は整理番号2-613・様式96。（Ⅰ）の届出が前提（（Ⅰ）で得る額が賃金改善必要額の5割未満の場合に算定）",
    ],
    last_updated: "2026-06-14",
    source_version: "告示第71号・保医発0305第8号（近畿厚生局 令和8年度届出ページ）",
    sources: [
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000188411_00053.html",
      "https://www.mhlw.go.jp/content/12400000/001671913.pdf",
      "https://kouseikyoku.mhlw.go.jp/kinki/gyomu/gyomu/hoken_kikan/shinryohoshuh04_00011.html",
    ],
  },

  // ── 特掲診療料系 ───────────────────────────────────────────────────────────
  {
    id: "kokan_kyo",
    official_name: "小児口腔機能管理料の注5に規定する口腔管理体制強化加算",
    common_name: "口管強",
    code_number: "2-89",
    code_number_bureau: "近畿・関東信越 令和8",
    notification_ref: "通知 別添1-13の2 / 保医発0305第8号",
    category: "特掲診療料",
    new_or_revised_r8: "継続",
    prerequisites: ["ha_shoshin"],
    requirements: {
      equipment: [
        { key: "has_aed", label: "自動体外式除細動器（AED）を備えている", type: "boolean" },
        { key: "has_pulse_oximeter", label: "パルスオキシメーターを備えている", type: "boolean" },
        { key: "has_oxygen", label: "酸素供給装置を備えている", type: "boolean" },
        { key: "has_emergency_kit", label: "血圧計・救急蘇生セット等を備えている", type: "boolean" },
        { key: "has_dental_suction", label: "歯科用吸引装置（ユニット毎の飛散物質吸引環境）を備えている", type: "boolean" },
      ],
      staff: [
        {
          key: "fulltime_dentist_kokan",
          label:
            "重症化予防に資する継続管理（う蝕・口腔機能管理を含む）並びに高齢者・小児の心身の特性・緊急時対応等の研修を修了した常勤歯科医師が1名以上",
          type: "boolean",
        },
        {
          key: "dentist_or_hygienist_config",
          label: "歯科医師が複数名、又は歯科医師1名以上＋歯科衛生士1名以上を配置している",
          type: "boolean",
        },
      ],
      system: [
        {
          key: "home_care_link",
          label: "緊急時対応のための別医療機関との連携体制を確保し、患者へ担当医・対応等を文書で事前提供している",
          type: "boolean",
        },
        {
          key: "multi_pro_link",
          label: "地域・多職種連携（居宅療養管理指導、地域ケア会議出席 等）の体制・実績がある",
          type: "boolean",
        },
      ],
      performance: [
        {
          key: "perf_visit_5",
          label: "過去1年間に歯科訪問診療1・2・3（又はその依頼）をあわせて5回以上",
          type: "number_min",
          number_min: 5,
          unit: "回/年",
        },
        {
          key: "perf_caries_12",
          label: "過去1年間にエナメル質初期う蝕管理料・根面う蝕管理料をあわせて12回以上",
          type: "number_min",
          number_min: 12,
          unit: "回/年",
        },
        {
          key: "perf_oral_func_12",
          label: "過去1年間に口腔機能管理関連（口腔機能発達不全症/低下症の管理等）をあわせて12回以上",
          type: "number_min",
          number_min: 12,
          unit: "回/年",
        },
        {
          key: "perf_p_support_30",
          label: "過去1年間に歯周病継続支援治療を30回以上",
          type: "number_min",
          number_min: 30,
          unit: "回/年",
        },
        {
          key: "perf_link_5",
          label: "過去1年間に診療情報提供料(Ⅰ)・診療情報等連携共有料をあわせて5回以上",
          type: "number_min",
          number_min: 5,
          unit: "回/年",
        },
      ],
      training: [],
    },
    fees: [
      { item_name: "口管強（小児口腔機能管理料 注5）", points: 50, unit: "点" },
      { item_name: "口管強（口腔機能管理料 注5）", points: 50, unit: "点" },
      { item_name: "口管強（エナメル質初期う蝕管理料 注2）", points: 48, unit: "点" },
    ],
    forms: {
      todokede_form: "別添2",
      attachment_forms: ["様式17の2"],
      attachments: ["研修修了を証する書類", "連携体制・実績がわかる資料"],
      e_application_available: true,
    },
    transitional:
      "令和6年改定で旧「かかりつけ歯科医機能強化型歯科診療所（か強診）」から再編。令和9年5月31日まで、改正前（令和8年5月31日以前）の旧項目の算定回数を新項目分と合算して実績要件を満たして差し支えない。",
    transitional_deadline: "2027-05-31",
    revenue_sim: {
      linked_items: [
        { item: "口腔管理体制強化加算（各管理料への上乗せ）", points_per_event: 48, default_monthly_count_hint: 120 },
      ],
      formula: "48〜50点 × 月間算定回数 × 10円（算定先の管理料により48点または50点）",
    },
    verify_flags: ["実績閾値は様式17の2＋複数解説で一致だが通知本文の逐語照合は推奨", "歯科衛生士の常勤要件の取扱い"],
    last_updated: "2026-06-14",
    source_version: "告示第71号・保医発0305第7号（様式17の2 r8-t17-2.pdf）",
    sources: [
      KANTO_TOKUTEI,
      "https://kouseikyoku.mhlw.go.jp/kinki/r8-t17-2.pdf",
      "https://iocil.jp/column/0693/",
    ],
  },
  {
    id: "shien_shin_1",
    official_name: "在宅療養支援歯科診療所1",
    common_name: "歯援診1",
    code_number: "2-92",
    code_number_bureau: "東海北陸 令和8",
    notification_ref: "通知 別添1-14 / 保医発0305第8号",
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
          label:
            "高齢者の心身の特性（認知症含む）・口腔機能管理・緊急時対応等の研修を受講した歯科医師を配置している",
          type: "boolean",
        },
        { key: "dental_hygienist_home", label: "歯科衛生士を配置している", type: "boolean" },
      ],
      system: [
        {
          key: "medical_link",
          label: "後方支援機能を有する別の医療機関・介護施設・地域包括ケアとの連携体制を有する",
          type: "boolean",
        },
        {
          key: "request_5",
          label: "在宅医療を担う他機関等からの歯科訪問診療の依頼実績が年5回以上ある",
          type: "number_min",
          number_min: 5,
          unit: "回/年",
        },
      ],
      performance: [
        {
          label: "歯科訪問診療の実績要件（令和8年・直近1か月評価の選択制）をいずれか満たす",
          type: "composite_or",
          verify: true,
          note: "令和8年は「過去1年18回」から直近1か月評価の4ルート選択制へ変更。歯援診2は年4回以上または臨床研修施設。告示（保医発0305第8号 別添1 第14）原本で要最終照合。",
          sub_conditions: [
            {
              key: "visit_1_3_monthly",
              label: "直近1か月で歯科訪問診療1〜3を10回以上算定している",
              type: "number_min",
              number_min: 10,
              unit: "回/月",
            },
            {
              key: "visit_2_5_monthly",
              label: "直近1か月で歯科訪問診療2〜5を5回以上（うち6割が20分以上）算定している",
              type: "number_min",
              number_min: 5,
              unit: "回/月",
            },
            {
              key: "visit_rehab_monthly",
              label: "直近1か月で訪問歯科口腔リハビリテーションを5回以上算定している",
              type: "number_min",
              number_min: 5,
              unit: "回/月",
            },
            {
              key: "clinical_training_facility",
              label: "歯科訪問診療に係る臨床研修施設である",
              type: "boolean",
            },
          ],
        },
      ],
      training: [],
    },
    fees: [{ item_name: "在宅療養支援歯科診療所加算1（歯援診1）", points: 100, unit: "点", frequency_note: "歯援診2は50点" }],
    forms: {
      todokede_form: "別添2",
      attachment_forms: ["様式18"],
      attachments: ["訪問診療実績がわかる資料", "連携先一覧", "研修受講を証する書類"],
      e_application_available: true,
    },
    transitional:
      "歯援診2は整理番号2-93（同枠に在宅療養支援歯科病院2-94）。様式18は歯援診2では項目7以外を記載。訪問実績要件の変更は令和9年5月31日までみなし（期間内に新基準を満たす体制整備が必要）。",
    transitional_deadline: "2027-05-31",
    revenue_sim: {
      linked_items: [
        { item: "在宅療養支援歯科診療所加算1（訪問診療料等への加算）", points_per_event: 100, default_monthly_count_hint: 20 },
      ],
      formula: "100 × 月間訪問関連算定回数 × 10円",
      exclusive_group: "shien_type",
    },
    verify_flags: [
      "令和8年の訪問診療実績要件（選択制）の回数は解説一致だが告示原本（別添1 第14）で要最終照合",
      "整理番号（歯援診1=2-92/2=2-93・東海北陸令和8で確認）は他局で要確認",
      "歯科衛生士の最低配置数の明示要件",
    ],
    last_updated: "2026-06-14",
    source_version: "告示第71号・保医発0305第8号",
    sources: [
      KINKI_TOKUTEI,
      "https://kouseikyoku.mhlw.go.jp/kinki/r6-t18.pdf",
      "https://www.houmonshika.org/dental/labo7/",
    ],
  },
  {
    id: "ha_homon_chiiki_renkei",
    official_name: "歯科訪問診療料の注11に規定する地域医療連携体制加算",
    common_name: "地域連携",
    code_number: "2-132",
    code_number_bureau: "東海北陸 令和8",
    notification_ref: "歯科訪問診療料（C000）注11 / 保医発0305第8号",
    category: "特掲診療料",
    new_or_revised_r8: "継続",
    prerequisites: [],
    requirements: {
      equipment: [],
      staff: [
        {
          key: "dentist_infection_training_4y",
          label: "院内感染防止対策研修を4年に1回以上受講している常勤歯科医師が1名以上",
          type: "boolean",
        },
      ],
      system: [
        {
          key: "emergency_24h_link",
          label: "複数の保険医療機関により、夜間・休日・診療時間外の緊急時に歯科診療ができる連携体制を整備している",
          type: "boolean",
        },
        {
          key: "info_provision",
          label: "患者の同意を得て、診療に必要な情報を連携保険医療機関に提供・共有する体制がある",
          type: "boolean",
        },
        {
          key: "infectious_disease_response",
          label: "感染症患者に対する歯科診療に対応する体制を確保している",
          type: "boolean",
        },
      ],
      performance: [],
      training: [],
    },
    fees: [{ item_name: "地域医療連携体制加算", points: 300, unit: "点", frequency_note: "患者1人につき1回に限り" }],
    forms: {
      todokede_form: "別添2",
      attachment_forms: ["様式21"],
      attachments: ["連携体制を示す資料"],
      e_application_available: true,
    },
    transitional: "緊急時診療体制確保の必要を認め、連携保険医療機関情報を文書で患者に提供し同意を得たうえで算定。",
    revenue_sim: {
      linked_items: [
        { item: "地域医療連携体制加算", points_per_event: 300, default_monthly_count_hint: 10 },
      ],
      formula: "300 × 月間算定回数 × 10円",
    },
    verify_flags: [
      "患者への文書交付は様式21の2・21の3（届出様式は様式21）",
      "令和8固有の経過措置",
    ],
    last_updated: "2026-06-14",
    source_version: "告示第71号・保医発0305第8号（しろぼん令和8 C000 注11）",
    sources: ["https://shirobon.net/medicalfee/latest/shika/r08_shika/", KINKI_TOKUTEI, "https://www.houmonshika.org/dental/labo7/"],
  },
  {
    id: "cadcam_kogaku",
    official_name: "光学印象 及び CAD/CAM冠・CAD/CAMインレーに係る施設基準",
    common_name: "光学印象・CAD/CAM",
    code_number: "2-300（光学印象）/ 2-301（CAD/CAM冠・インレー）",
    code_number_bureau: "関東信越 令和8",
    notification_ref: "M003-4（光学印象）/ M015-2・M015-3（CAD/CAM冠・インレー）",
    category: "特掲診療料",
    new_or_revised_r8: "改定",
    prerequisites: [],
    requirements: {
      equipment: [
        { key: "has_digital_impression", label: "光学印象に用いる口腔内スキャナー（デジタル印象採得装置）を院内に保有している", type: "boolean" },
        { key: "has_cadcam_unit", label: "CAD/CAM冠・インレーの作製に対応できる体制を有する", type: "boolean" },
      ],
      staff: [
        {
          key: "dentist_3yr_prosthetics",
          label: "歯科補綴治療に係る専門知識及び3年以上の経験を有する歯科医師が1名以上配置されている",
          type: "boolean",
        },
      ],
      system: [],
      performance: [],
      training: [],
    },
    fees: [
      { item_name: "光学印象", points: 150, unit: "点", frequency_note: "1歯につき（令和6:100→令和8:150点）" },
      { item_name: "CAD/CAMインレー（M015-3）", points: 770, unit: "点", frequency_note: "1歯につき（令和6:750→令和8:770点）" },
      { item_name: "CAD/CAM冠（M015-2）", points: 1200, unit: "点", frequency_note: "令和8据え置き・大臼歯へ適応拡大" },
      { item_name: "光学印象歯科技工士連携加算", points: 50, unit: "点", frequency_note: "対面のみ・単一50点（ICT区分なし）" },
    ],
    forms: {
      todokede_form: "別添2",
      attachment_forms: ["様式50の2"],
      attachments: ["口腔内スキャナー等の設備状況がわかる資料"],
      e_application_available: true,
    },
    transitional:
      "令和8年改定で光学印象の対象がCAD/CAMインレーに加えCAD/CAM冠へ拡大、CAD/CAM冠は咬合支持要件撤廃で全大臼歯（材料Ⅲ/Ⅴ使用）・後継永久歯が先天的に欠如している乳歯へ適応拡大。施行は令和8年6月1日（薬価のみ4月1日）。",
    revenue_sim: {
      linked_items: [
        { item: "光学印象", points_per_event: 150, default_monthly_count_hint: 20 },
        { item: "光学印象歯科技工士連携加算", points_per_event: 50, default_monthly_count_hint: 20 },
      ],
      formula: "(150 × 月間光学印象回数 + 50 × 連携加算回数) × 10円",
    },
    verify_flags: ["光学印象歯科技工士連携加算の令和8点数本文（50点据え置きの公算・本文未到達）"],
    last_updated: "2026-06-14",
    source_version: "告示第69/71号（しろぼん令和8 M003-4・厚生局令和8 特掲一覧）",
    sources: [
      "https://shirobon.net/medicalfee/latest/shika/r08_shika/r08s_ch2/r08s2_pa12/r08s2c_sec1/r08s2c1_cls1/r08s2c11_M003_4.html",
      KANTO_TOKUTEI,
      "https://www.shirane-dental.co.jp/2026kaitei",
    ],
  },
  {
    id: "giko_renkei",
    official_name: "歯科技工士連携加算1・2",
    common_name: "技工連携1・2",
    code_number: "2-298（加算1）/ 2-299（加算2）",
    code_number_bureau: "関東信越 令和8",
    notification_ref: "印象採得（M003）・咬合採得（M006）等への加算 / 保医発0305第8号",
    category: "特掲診療料",
    new_or_revised_r8: "改定",
    prerequisites: [],
    requirements: {
      equipment: [
        {
          key: "ict_for_renkei2",
          label: "情報通信機器（ICT）を用いて歯科技工士と連携できる体制を有する（加算2）",
          type: "boolean",
          verify: true,
        },
      ],
      staff: [
        {
          key: "dental_technician_coop",
          label: "歯科技工士を配置している、又は他の歯科技工所との連携を確保している（加算1）",
          type: "boolean",
        },
      ],
      system: [],
      performance: [],
      training: [],
    },
    fees: [
      { item_name: "歯科技工士連携加算1（対面）", points: 60, unit: "点", frequency_note: "令和6新設50→2025年4月60点" },
      { item_name: "歯科技工士連携加算2（ICT）", points: 80, unit: "点", frequency_note: "令和6新設70→2025年4月80点" },
    ],
    forms: {
      todokede_form: "別添2",
      attachment_forms: ["様式50の2の2"],
      attachments: ["歯科技工士の配置・連携体制を示す資料"],
      e_application_available: true,
    },
    transitional:
      "令和6年6月新設時は加算1=50点/加算2=70点。2025年4月に各+10点へ引き上げられ加算1=60点/加算2=80点（令和8年も同水準）。加算2はICTを用いた連携が要件。",
    revenue_sim: {
      linked_items: [
        { item: "歯科技工士連携加算1", points_per_event: 60, default_monthly_count_hint: 10 },
        { item: "歯科技工士連携加算2", points_per_event: 80, default_monthly_count_hint: 10 },
      ],
      formula: "(60 × 連携1回数 + 80 × 連携2回数(ICT)) × 10円",
    },
    verify_flags: ["加算が紐づく区分番号（印象採得M003・咬合採得M006等）の表記揺れ"],
    last_updated: "2026-06-14",
    source_version: "告示第69/71号（厚生局令和8 特掲一覧 2-298/2-299）",
    sources: [
      KANTO_TOKUTEI,
      "https://www.hhk.jp/member/hoken-seikyu-qa/shika/250915-070000.php",
      "https://www.dentwave.com/column_20241212_dw",
    ],
  },
  {
    id: "ushokugishososhaku",
    official_name: "有床義歯咀嚼機能検査に係る施設基準",
    common_name: "咀嚼機能検査",
    code_number: "2-184",
    code_number_bureau: "関東信越 令和8",
    notification_ref: "D011（有床義歯咀嚼機能検査）/ 保医発0305第8号",
    category: "特掲診療料",
    new_or_revised_r8: "改定",
    prerequisites: [],
    requirements: {
      equipment: [
        {
          key: "has_masticatory_device",
          label: "下顎運動測定器（非接触型）及びグルコース分析装置等、当該検査に対応する機器を有する",
          type: "boolean",
        },
      ],
      staff: [
        {
          key: "dentist_3yr_prosthetics_exam",
          label: "歯科補綴治療に係る専門知識及び3年以上の経験を有する歯科医師が1名以上配置されている",
          type: "boolean",
        },
      ],
      system: [],
      performance: [],
      training: [],
    },
    fees: [{ item_name: "有床義歯咀嚼機能検査（届出が前提・検査料は別途）", points: 0, unit: "点", frequency_note: "区分D011" }],
    forms: {
      todokede_form: "別添2",
      attachment_forms: ["様式38の1の2"],
      attachments: ["検査機器の保有状況がわかる資料"],
      e_application_available: true,
    },
    transitional:
      "令和8年6月改定で、咀嚼能力検査（D011-2）・咬合圧検査（D011-3）・口腔細菌定量検査の施設基準（届出）が廃止（届出不要化）。検査自体は存続し、検査機器（グルコース分析装置・歯科用咬合力計）の保有は引き続き必要。",
    revenue_sim: {
      linked_items: [
        { item: "有床義歯咀嚼機能検査 等", points_per_event: 0, default_monthly_count_hint: 5 },
      ],
      formula: "検査点数 × 月間算定回数 × 10円（点数は検査区分に依存）",
    },
    verify_flags: ["有床義歯咀嚼機能検査（D011）の各区分の令和8点数"],
    last_updated: "2026-06-14",
    source_version: "告示第69/71号（厚生局令和8 特掲一覧 2-184）",
    sources: [KANTO_TOKUTEI, "https://shirobon.net/medicalfee/latest/shika/r08_shika/", KINKI_TOKUTEI],
  },
  {
    id: "gtr",
    official_name: "歯周組織再生誘導手術（GTR）に係る施設基準",
    common_name: "GTR",
    code_number: "2-484（区分 J063）",
    code_number_bureau: "九州 令和6（令和8要確認）",
    notification_ref: "J063 / 保医発0305第8号",
    category: "特掲診療料",
    new_or_revised_r8: "継続",
    prerequisites: [],
    requirements: {
      equipment: [],
      staff: [
        {
          key: "dentist_perio_experience",
          label: "歯周病治療に係る5年以上の経験を有する歯科医師が1名以上配置されている",
          type: "boolean",
          verify: true,
        },
      ],
      system: [],
      performance: [],
      training: [],
    },
    fees: [
      { item_name: "歯周組織再生誘導手術 1次手術（吸収性又は非吸収性膜の固定）", points: 840, unit: "点", frequency_note: "1歯につき（令和8確定・r08本文）" },
      { item_name: "歯周組織再生誘導手術 2次手術（非吸収性膜の除去）", points: 380, unit: "点", frequency_note: "1歯につき（令和8確定・r08本文）" },
      { item_name: "手術時歯根面レーザー応用加算", points: 60, unit: "点", frequency_note: "GTR1次手術等に加算" },
    ],
    forms: {
      todokede_form: "別添2",
      attachment_forms: ["様式74"],
      attachments: ["歯科医師の経験を証する資料"],
      e_application_available: null,
    },
    transitional: "R6からの継続。整理番号2-484（九州厚生局）。GTR1次手術時は歯根面レーザー応用加算+60点。",
    revenue_sim: {
      linked_items: [
        { item: "歯周組織再生誘導手術 1次手術", points_per_event: 840, default_monthly_count_hint: 2 },
      ],
      formula: "840 × 月間1次手術算定回数 × 10円",
    },
    verify_flags: [
      "整理番号2-484は九州厚生局令和6。令和8・他局の整理番号は要確認",
      "届出様式番号（暫定様式74は一次未確認）",
    ],
    last_updated: "2026-06-14",
    source_version: "告示第69号（r08歯科点数表 J063で令和8点数840/380点を確認）",
    sources: [
      "https://shirobon.net/medicalfee/latest/shika/r06_shika/r06s_ch2/r06s2_pa9/",
      KINKI_TOKUTEI,
    ],
  },
  {
    id: "laser_koku_nenmaku",
    official_name: "口腔粘膜処置（レーザー機器加算）に係る施設基準",
    common_name: "口腔粘膜（レーザー）",
    code_number: "2-296",
    code_number_bureau: "東海北陸 令和8",
    notification_ref: "口腔粘膜処置（I029-3）/ レーザー機器加算（J200-4-2）/ 保医発0305第8号",
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
    fees: [
      { item_name: "口腔粘膜処置（I029-3）", points: 30, unit: "点", frequency_note: "1口腔につき・月1回（令和8確定・r08本文）" },
      { item_name: "レーザー機器加算1（J200-4-2）", points: 50, unit: "点", frequency_note: "手術の区分による（令和8確定）" },
      { item_name: "レーザー機器加算2", points: 100, unit: "点", frequency_note: "令和8確定（r08本文）" },
      { item_name: "レーザー機器加算3", points: 200, unit: "点", frequency_note: "令和8確定（r08本文）" },
    ],
    forms: {
      todokede_form: "別添2",
      attachment_forms: ["様式49の9"],
      attachments: ["レーザー機器の保有状況がわかる資料"],
      e_application_available: true,
    },
    transitional:
      "R6からの継続。様式49の9（九州厚生局で確認）。口腔粘膜処置は再発性アフタ性口内炎の小アフタ型病変へのレーザー照射が対象。",
    revenue_sim: {
      linked_items: [
        { item: "口腔粘膜処置（レーザー照射）", points_per_event: 30, default_monthly_count_hint: 10 },
      ],
      formula: "30 × 月間算定回数 × 10円（レーザー機器加算は別途）",
    },
    verify_flags: [],
    last_updated: "2026-06-14",
    source_version: "告示第69号（r08歯科点数表 I029-3=30点・J200-4-2=50/100/200点を確認）",
    sources: [KANTO_TOKUTEI, "https://kouseikyoku.mhlw.go.jp/shikoku/r6-t49-9.pdf"],
  },
  {
    id: "kikan_anzen_shika",
    official_name: "医療機器安全管理料（歯科）に係る施設基準",
    common_name: "機安歯",
    code_number: "2-86",
    code_number_bureau: "東海北陸 令和8",
    notification_ref: "医療機器安全管理料（B018）/ 通知 別添1-12の2 / 保医発0305第8号",
    category: "特掲診療料",
    new_or_revised_r8: "継続",
    prerequisites: [],
    requirements: {
      equipment: [
        { key: "has_radiation_device", label: "放射線治療に係る医療機器を有する", type: "boolean" },
      ],
      staff: [
        {
          key: "staff_for_device_safety",
          label: "放射線治療計画の策定に係る体制・責任者を配置している",
          type: "boolean",
          verify: true,
        },
      ],
      system: [],
      performance: [],
      training: [],
    },
    fees: [{ item_name: "医療機器安全管理料（歯科・B018）", points: 1100, unit: "点", frequency_note: "放射線治療計画策定に係るもの（一連につき）" }],
    forms: {
      todokede_form: "別添2",
      attachment_forms: ["様式15"],
      attachments: ["責任者の配置・機器の状況がわかる資料"],
      e_application_available: true,
    },
    transitional:
      "区分B018（放射線治療計画策定に係るもの・1,100点）。歯科は医科の「1（生命維持管理装置100点）」区分を持たず1,100点のみ。整理番号2-86「機安歯」・様式15（東海北陸令和8。令和6の2-068から振り直し）。",
    revenue_sim: {
      linked_items: [
        { item: "医療機器安全管理料（歯科）", points_per_event: 1100, default_monthly_count_hint: 1 },
      ],
      formula: "1100 × 月間算定回数 × 10円（一連につき）",
    },
    verify_flags: [
      "整理番号2-86は東海北陸令和8で確認。他局の令和8整理番号は要確認",
      "令和8点数の据え置き確認",
    ],
    last_updated: "2026-06-14",
    source_version: "告示第71号（厚生局令和8 特掲一覧 2-86・様式15）",
    sources: [KANTO_TOKUTEI, KINKI_TOKUTEI],
  },
  {
    id: "ikan",
    official_name: "歯科治療時医療管理料に係る施設基準",
    common_name: "医管",
    code_number: "2-88",
    code_number_bureau: "東海北陸 令和8",
    notification_ref: "歯科治療時医療管理料（B004-6-2）/ 保医発0305第8号",
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
    fees: [{ item_name: "歯科治療時医療管理料（B004-6-2）", points: 45, unit: "点", frequency_note: "1日につき（令和8据え置き確認）" }],
    forms: {
      todokede_form: "別添2",
      attachment_forms: ["様式17"],
      attachments: ["監視機器の保有状況・連携体制がわかる資料"],
      e_application_available: true,
    },
    transitional: "区分B004-6-2・45点（令和8据え置き）。様式17。在宅患者歯科治療時医療管理料（900/500点）は別系統。",
    revenue_sim: {
      linked_items: [
        { item: "歯科治療時医療管理料", points_per_event: 45, default_monthly_count_hint: 20 },
      ],
      formula: "45 × 月間算定回数 × 10円",
    },
    verify_flags: ["歯科医師の経験要件"],
    last_updated: "2026-06-14",
    source_version: "告示第71号（厚生局令和8 特掲一覧 2-88・様式17）",
    sources: [KANTO_TOKUTEI, KINKI_TOKUTEI],
  },

  // ── 令和8 追加収録（包括リサーチ報告より。診療所が届出可能なもの） ──────────
  {
    id: "koku_jitchi",
    official_name: "口腔機能実地指導料に係る施設基準",
    common_name: "口実地",
    code_number: "2-91（B001-2-2）",
    code_number_bureau: "近畿 令和8",
    notification_ref: "B001-2-2 / 保医発0305第8号 別添1 第13の4の2",
    category: "特掲診療料",
    new_or_revised_r8: "新設",
    prerequisites: [],
    requirements: {
      equipment: [],
      staff: [
        {
          key: "dh_oral_function_training",
          label:
            "口腔機能発達不全症・口腔機能低下症の概要・検査法・訓練法・実地指導方法等（入院・在宅・施設療養患者への対応を含む）の研修を受講した歯科衛生士が1名以上配置されている",
          type: "boolean",
          verify: true,
          note: "研修主催は歯科医師会・歯科衛生士会・日本老年歯科医学会・日本小児歯科学会等（疑義解釈その1 問6）。",
        },
      ],
      system: [
        { key: "oral_func_guidance_time", label: "口腔機能実地指導を実施する時間が定められている", type: "boolean" },
        { key: "oral_func_unit", label: "指導を実施するための歯科用ユニットが確保されている", type: "boolean" },
        {
          key: "dh_treatment_improvement",
          label: "当該指導を行う歯科衛生士の処遇改善に係る取組を行っている",
          type: "boolean",
        },
      ],
      performance: [],
      training: [],
    },
    fees: [{ item_name: "口腔機能実地指導料", points: 46, unit: "点", frequency_note: "月1回（新設）" }],
    forms: {
      todokede_form: "別添2",
      attachment_forms: ["様式17の4"],
      attachments: ["歯科衛生士の研修受講を確認できる書類"],
      e_application_available: true,
    },
    transitional:
      "令和8年新設（旧・歯科衛生実地指導料の口腔機能指導加算12点から独立・格上げ）。研修受講要件は令和9年5月31日まで経過措置（みなし）。令和9年5月診療分までは様式17の4に受講予定の旨の記載で可（疑義解釈その1 問8）。",
    transitional_deadline: "2027-05-31",
    revenue_sim: {
      linked_items: [{ item: "口腔機能実地指導料", points_per_event: 46, default_monthly_count_hint: 30, once_per_month: true }],
      formula: "46 × 月間算定回数 × 10円（月1回上限）",
    },
    verify_flags: [
      "整理番号2-91は局別・要確認",
      "様式17の4 PDF URLの実在検証",
      "研修主催団体の妥当性",
      "在宅歯科栄養サポートチーム等連携指導料(C001-7)算定月は算定不可（併算定制限）",
    ],
    last_updated: "2026-06-14",
    source_version: "告示第69号 歯科点数表（B001-2-2 46点）／保医発0305第8号",
    sources: [
      "https://www.mhlw.go.jp/content/10808000/001655179.pdf",
      "https://iocil.jp/column/0694/",
      KINKI_TOKUTEI,
    ],
  },
  {
    id: "zaikan",
    official_name: "在宅患者歯科治療時医療管理料に係る施設基準",
    common_name: "在歯管",
    code_number: "2-101（C001-4-2）",
    code_number_bureau: "近畿 令和8",
    notification_ref: "C001-4-2 / 保医発0305第8号",
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
          key: "dentist_management_zaitaku",
          label: "十分な経験を有する常勤歯科医師・歯科衛生士等により、治療前・中・後の全身状態を管理できる体制がある",
          type: "boolean",
          verify: true,
        },
      ],
      system: [
        {
          key: "emergency_hospital_link",
          label: "緊急時に対応できる病院である別の保険医療機関との連携体制がある（医科歯科併設病院は医科診療科との連携で可）",
          type: "boolean",
        },
      ],
      performance: [],
      training: [],
    },
    fees: [{ item_name: "在宅患者歯科治療時医療管理料", points: 45, unit: "点", frequency_note: "1日につき（令和6値・令和8確定値は要再確認）" }],
    forms: {
      todokede_form: "別添2",
      attachment_forms: ["様式17"],
      attachments: ["監視機器の保有状況・連携体制がわかる資料"],
      e_application_available: true,
    },
    transitional: "令和8年5月31日に現に算定の機関は引き続き算定する場合 届出不要（九州厚生局 表3）。",
    revenue_sim: {
      linked_items: [{ item: "在宅患者歯科治療時医療管理料", points_per_event: 45, default_monthly_count_hint: 20 }],
      formula: "45 × 月間算定回数 × 10円（1日につき）",
    },
    verify_flags: [
      "点数の令和8確定値（45点は令和6値）",
      "整理番号2-101は局別・要確認",
      "対象患者は14疾患＋人工呼吸器・在宅酸素・感染症患者に限定。対象外算定は返戻リスク",
      "周術期等口腔機能管理料・医科D220算定日は算定不可（併算定制限）",
    ],
    last_updated: "2026-06-14",
    source_version: "告示第69号／保医発0305第8号（しろぼん C001-4-2）",
    sources: ["https://shirobon.net/medicalfee/latest/shika/r08_shika/", KINKI_TOKUTEI],
  },
  {
    id: "hokan",
    official_name: "クラウン・ブリッジ維持管理料に係る施設基準",
    common_name: "補管",
    code_number: "2-580（M000-2）",
    code_number_bureau: "近畿 令和8",
    notification_ref: "M000-2 / 保医発0305第8号",
    category: "特掲診療料",
    new_or_revised_r8: "継続",
    prerequisites: [],
    requirements: {
      equipment: [],
      staff: [],
      system: [
        {
          key: "hokan_todokede_unit",
          label: "クラウン・ブリッジの維持管理を医療機関単位で行う旨を届け出ている（患者・補綴物ごとの選択は不可）",
          type: "boolean",
        },
      ],
      performance: [],
      training: [],
    },
    fees: [
      { item_name: "歯冠補綴物", points: 100, unit: "点", frequency_note: "装着日ごと（令和6値）" },
      { item_name: "ブリッジ（5歯以下・接着Br含む）", points: 330, unit: "点", frequency_note: "令和6値" },
      { item_name: "ブリッジ（6歯以上）", points: 440, unit: "点", frequency_note: "令和6値" },
    ],
    forms: {
      todokede_form: "別添2",
      attachment_forms: ["様式81"],
      attachments: [],
      e_application_available: true,
    },
    transitional:
      "令和6改定でFMC・3/4冠・5/4冠・レジン前装金属冠が補管対象外に。CAD/CAM冠・チタン冠・レジン前装チタン冠・全ブリッジ・HJC等は引き続き対象。未届の場合は対象補綴物の一連費用を所定点数の70/100で算定。装着日から2年以内の同一部位再製作等は算定不可。",
    revenue_sim: {
      linked_items: [
        { item: "補管（歯冠補綴物）", points_per_event: 100, default_monthly_count_hint: 30 },
        { item: "補管（ブリッジ5歯以下）", points_per_event: 330, default_monthly_count_hint: 5 },
        { item: "補管（ブリッジ6歯以上）", points_per_event: 440, default_monthly_count_hint: 2 },
      ],
      formula: "(100 × 歯冠補綴物 + 330 × ブリッジ5歯以下 + 440 × ブリッジ6歯以上) × 10円",
    },
    verify_flags: [
      "令和8整理番号2-580・様式81 PDF URLの最終検証（推定を含む）",
      "点数の令和8確定値（令和6値）",
    ],
    last_updated: "2026-06-14",
    source_version: "告示第69号／保医発0305第8号（しろぼん M000-2）",
    sources: ["https://shirobon.net/medicalfee/latest/shika/r08_shika/", "https://aichi-hkn.jp/", KINKI_TOKUTEI],
  },
  {
    id: "gai_kansen_2",
    official_name: "歯科外来診療感染対策加算2",
    common_name: "外感染2",
    code_number: "1-21",
    code_number_bureau: "近畿・東海北陸 令和8",
    notification_ref: "通知 別添1-4の2 / 歯科初診料 注10・再診料 注9",
    category: "基本診療料",
    new_or_revised_r8: "継続",
    prerequisites: ["ha_shoshin"],
    requirements: {
      equipment: [
        {
          key: "has_dental_suction",
          label: "歯科用吸引装置等により、歯科ユニットごとに切削時等の飛散物質を吸収できる環境を有する",
          type: "boolean",
        },
      ],
      staff: [
        {
          key: "staff_config_infection",
          label: "歯科医師が複数名、又は歯科医師1名以上＋（歯科衛生士もしくは院内感染防止対策研修受講者）1名以上配置されている",
          type: "boolean",
        },
        { key: "infection_manager", label: "院内感染管理者を配置している", type: "boolean" },
      ],
      system: [
        { key: "infection_control_system", label: "標準予防策に基づく院内感染管理の体制を整備している", type: "boolean" },
        {
          key: "shinko_kansen_taisei",
          label: "新型インフルエンザ等感染症等の患者・疑似症患者に対する診療体制を確保している（加算2）",
          type: "boolean",
        },
        {
          key: "shinko_bcp",
          label: "新興感染症等に係る事業継続計画（BCP）を策定している（加算2）",
          type: "boolean",
        },
        {
          key: "shinko_ika_renkei",
          label: "新興感染症等に係る医科医療機関との連携体制がある（加算2）",
          type: "boolean",
        },
        {
          key: "shinko_ukeire",
          label: "他の歯科医療機関から感染症患者等を受け入れる連携体制がある（加算2）",
          type: "boolean",
        },
      ],
      performance: [],
      training: [
        {
          key: "shinko_kansen_kenshu",
          label:
            "感染経路別予防策（個人防護具の着脱法等を含む）及び新型インフルエンザ等感染症対策の研修を1年に1回以上受講した常勤歯科医師が1名以上配置されている（加算2）",
          type: "boolean",
          verify: true,
        },
      ],
    },
    fees: [{ item_name: "歯科外来診療感染対策加算2（初診）", points: 14, unit: "点", frequency_note: "初診時。再診時は4点（令和6値・据え置き）" }],
    forms: {
      todokede_form: "別添7",
      attachment_forms: ["様式4"],
      attachments: ["新興感染症対応体制・研修受講を示す資料"],
      e_application_available: true,
    },
    transitional: "歯初診の届出が前提。加算1（外感染1）に新型インフルエンザ等感染症対応の体制・BCP・医科連携・研修を加えたもの。一般歯科診療所が届出可能（加算3・4は地域歯科診療支援病院＝病院向け）。",
    revenue_sim: {
      linked_items: [
        { item: "外感染2（初診）", points_per_event: 14, default_monthly_count_hint: 60 },
        { item: "外感染2（再診）", points_per_event: 4, default_monthly_count_hint: 400 },
      ],
      formula: "(14 × 月間初診回数 + 4 × 月間再診回数) × 10円",
      exclusive_group: "gaikansen",
    },
    verify_flags: ["令和8点数の確定（14/4点は令和6値・据え置き見込み）", "外感染1との併用不可（区分はいずれか一方）"],
    last_updated: "2026-06-14",
    source_version: "告示第70号・保医発0305第7号",
    sources: [KINKI_KIHON, "https://kouseikyoku.mhlw.go.jp/kinki/r8-k04.pdf", "https://www.sedent.co.jp/pdf/kansen_02_flyer.pdf"],
  },

  // ── 病院向け（地域歯科診療支援病院・歯援病 等）。診療所では対象外だが一覧として収録 ──
  {
    id: "byo_shoshin",
    official_name: "地域歯科診療支援病院歯科初診料に係る施設基準",
    common_name: "病初診",
    code_number: "1-17（要確認）",
    notification_ref: "通知（地域歯科診療支援病院歯科初診料）",
    category: "基本診療料",
    new_or_revised_r8: "継続",
    prerequisites: [],
    requirements: {
      equipment: [],
      staff: [
        {
          key: "is_hospital_dental",
          label: "病院であり、歯科外来診療部門（歯科・歯科口腔外科等）を有する",
          type: "boolean",
          verify: true,
        },
        {
          key: "byo_dentist_config",
          label: "歯科医師・歯科衛生士等を病院の基準に従い配置している",
          type: "boolean",
          verify: true,
        },
      ],
      system: [
        {
          key: "byo_regional_role",
          label: "地域の歯科診療所からの紹介患者・障害者・有病者等への対応や、地域歯科医療の連携・後方支援の体制を有する",
          type: "boolean",
          verify: true,
        },
        {
          key: "infection_notice_posted",
          label: "院内感染防止対策を実施している旨を院内掲示し、原則ウェブサイトに掲載している",
          type: "boolean",
        },
      ],
      performance: [],
      training: [],
    },
    fees: [
      { item_name: "地域歯科診療支援病院歯科初診料", points: 296, unit: "点", frequency_note: "初診時（令和8確定・r08本文）" },
      { item_name: "地域歯科診療支援病院歯科再診料", points: 76, unit: "点", frequency_note: "再診時（令和8確定・r08本文）" },
    ],
    forms: {
      todokede_form: "別添7",
      attachment_forms: ["様式3"],
      attachments: ["病院の体制・連携・実績がわかる資料"],
      e_application_available: true,
    },
    transitional: "病院向け基準。外安全2・外感染3・外感染4の前提となる。",
    revenue_sim: {
      linked_items: [
        { item: "地域歯科診療支援病院歯科初診料", points_per_event: 296, default_monthly_count_hint: 60 },
        { item: "地域歯科診療支援病院歯科再診料", points_per_event: 76, default_monthly_count_hint: 400 },
      ],
      formula: "(296 × 月間初診回数 + 76 × 月間再診回数) × 10円",
      exclusive_group: "shoshin_type",
    },
    verify_flags: [
      "病院向け基準。詳細な施設基準要件（人員・実績・連携）は告示・通知で要確認",
      "整理番号は局別・要確認",
    ],
    last_updated: "2026-06-14",
    source_version: "告示第70号（点数はr08歯科点数表 A000/A002）",
    sources: [SHIROBON_A000, KINKI_KIHON],
  },
  {
    id: "gai_anzen_2",
    official_name: "歯科外来診療医療安全対策加算2",
    common_name: "外安全2",
    code_number: "1-19",
    code_number_bureau: "近畿・東海北陸 令和8",
    notification_ref: "通知 別添1-4 / 歯科初診料 注10 等",
    category: "基本診療料",
    new_or_revised_r8: "継続",
    prerequisites: ["byo_shoshin"],
    requirements: {
      equipment: [
        { key: "has_aed", label: "自動体外式除細動器（AED）を設置している", type: "boolean" },
        { key: "has_pulse_oximeter", label: "パルスオキシメーターを設置している", type: "boolean" },
        { key: "has_oxygen", label: "酸素供給装置を備えている", type: "boolean" },
        { key: "has_bp_monitor", label: "血圧計を備えている", type: "boolean" },
        { key: "has_emergency_kit", label: "救急蘇生セット等を備えている", type: "boolean" },
      ],
      staff: [
        {
          key: "fulltime_dentist_safety_training",
          label: "医療安全対策に係る研修を受けた常勤の歯科医師が1名以上配置されている",
          type: "boolean",
        },
        {
          key: "safety_manager_dept",
          label: "歯科の外来診療部門に医療安全管理者を配置している（加算2は必須）",
          type: "boolean",
        },
        {
          key: "anzen2_staff",
          label: "歯科医師複数名、又は歯科医師1名以上＋歯科衛生士もしくは看護職員1名以上を配置している",
          type: "boolean",
        },
      ],
      system: [
        {
          key: "emergency_link_other_clinic",
          label: "緊急時に対応できる別の医療機関との連携体制を確保している",
          type: "boolean",
        },
        {
          key: "anzen2_incident",
          label: "歯科外来診療で発生した医療事故・インシデント等を報告・分析し改善する体制を整備している（加算2は必須）",
          type: "boolean",
        },
      ],
      performance: [],
      training: [],
    },
    fees: [{ item_name: "歯科外来診療医療安全対策加算2（初診）", points: 13, unit: "点", frequency_note: "初診時。再診時3点（令和6値・据え置き）" }],
    forms: {
      todokede_form: "別添7",
      attachment_forms: ["様式4の1の2"],
      attachments: ["AED等の設備状況・研修受講・連携体制を示す資料"],
      e_application_available: true,
    },
    transitional: "地域歯科診療支援病院歯科初診料（病初診）の届出が前提。加算2は医療安全管理者の歯科外来部門配置と事故報告体制が必須。",
    revenue_sim: {
      linked_items: [
        { item: "外安全2（初診）", points_per_event: 13, default_monthly_count_hint: 60 },
        { item: "外安全2（再診）", points_per_event: 3, default_monthly_count_hint: 400 },
      ],
      formula: "(13 × 月間初診回数 + 3 × 月間再診回数) × 10円",
      exclusive_group: "gaianzen",
    },
    verify_flags: ["令和8点数の確定（13/3点は令和6値）", "病院向け（病初診が前提）"],
    last_updated: "2026-06-14",
    source_version: "告示第70号・保医発0305第7号",
    sources: [KINKI_KIHON, "https://kouseikyoku.mhlw.go.jp/kinki/r8-k04-1-2.pdf"],
  },
  {
    id: "gai_kansen_3",
    official_name: "歯科外来診療感染対策加算3",
    common_name: "外感染3",
    code_number: "1-22",
    code_number_bureau: "近畿・東海北陸 令和8",
    notification_ref: "通知 別添1-4の2",
    category: "基本診療料",
    new_or_revised_r8: "継続",
    prerequisites: ["byo_shoshin"],
    requirements: {
      equipment: [
        {
          key: "has_dental_suction",
          label: "歯科用吸引装置等により、歯科ユニットごとに切削時等の飛散物質を吸収できる環境を有する",
          type: "boolean",
        },
      ],
      staff: [
        {
          key: "kansen3_staff",
          label: "歯科医師複数名、又は歯科医師1名以上＋（歯科衛生士もしくは看護職員）1名以上を配置している",
          type: "boolean",
        },
        { key: "infection_manager", label: "院内感染管理者を配置している（病院は歯科外来診療部門に配置）", type: "boolean" },
      ],
      system: [
        { key: "infection_control_system", label: "標準予防策に基づく院内感染管理の体制を整備している", type: "boolean" },
      ],
      performance: [],
      training: [],
    },
    fees: [{ item_name: "歯科外来診療感染対策加算3（初診）", points: 13, unit: "点", frequency_note: "初診時。再診時3点（令和6値・据え置き）" }],
    forms: {
      todokede_form: "別添7",
      attachment_forms: ["様式4の1の2"],
      attachments: ["感染対策設備・体制がわかる資料"],
      e_application_available: true,
    },
    transitional: "地域歯科診療支援病院歯科初診料（病初診）の届出が前提。外感染1に相当する病院版。",
    revenue_sim: {
      linked_items: [
        { item: "外感染3（初診）", points_per_event: 13, default_monthly_count_hint: 60 },
        { item: "外感染3（再診）", points_per_event: 3, default_monthly_count_hint: 400 },
      ],
      formula: "(13 × 月間初診回数 + 3 × 月間再診回数) × 10円",
      exclusive_group: "gaikansen",
    },
    verify_flags: ["令和8点数の確定（13/3点は令和6値）", "病院向け（病初診が前提）"],
    last_updated: "2026-06-14",
    source_version: "告示第70号・保医発0305第7号",
    sources: [KINKI_KIHON, "https://kouseikyoku.mhlw.go.jp/kinki/r8-k04-1-2.pdf"],
  },
  {
    id: "gai_kansen_4",
    official_name: "歯科外来診療感染対策加算4",
    common_name: "外感染4",
    code_number: "1-23",
    code_number_bureau: "近畿・東海北陸 令和8",
    notification_ref: "通知 別添1-4の2",
    category: "基本診療料",
    new_or_revised_r8: "継続",
    prerequisites: ["byo_shoshin"],
    requirements: {
      equipment: [
        {
          key: "has_dental_suction",
          label: "歯科用吸引装置等により、歯科ユニットごとに切削時等の飛散物質を吸収できる環境を有する",
          type: "boolean",
        },
      ],
      staff: [
        {
          key: "kansen3_staff",
          label: "歯科医師複数名、又は歯科医師1名以上＋（歯科衛生士もしくは看護職員）1名以上を配置している",
          type: "boolean",
        },
        { key: "infection_manager", label: "院内感染管理者を配置している（病院は歯科外来診療部門に配置）", type: "boolean" },
      ],
      system: [
        { key: "infection_control_system", label: "標準予防策に基づく院内感染管理の体制を整備している", type: "boolean" },
        { key: "shinko_kansen_taisei", label: "新型インフルエンザ等感染症等の患者・疑似症患者に対する診療体制を確保している", type: "boolean" },
        { key: "shinko_bcp", label: "新興感染症等に係る事業継続計画（BCP）を策定している", type: "boolean" },
        { key: "shinko_ika_renkei", label: "新興感染症等に係る医科医療機関との連携体制がある", type: "boolean" },
        { key: "shinko_ukeire", label: "他の歯科医療機関から感染症患者等を受け入れる連携体制がある", type: "boolean" },
      ],
      performance: [],
      training: [
        {
          key: "shinko_kansen_kenshu",
          label: "感染経路別予防策及び新型インフルエンザ等感染症対策の研修を1年に1回以上受講した常勤歯科医師が1名以上配置されている",
          type: "boolean",
          verify: true,
        },
      ],
    },
    fees: [{ item_name: "歯科外来診療感染対策加算4（初診）", points: 15, unit: "点", frequency_note: "初診時。再診時5点（令和6値・据え置き）" }],
    forms: {
      todokede_form: "別添7",
      attachment_forms: ["様式4の1の2"],
      attachments: ["新興感染症対応体制・研修受講を示す資料"],
      e_application_available: true,
    },
    transitional: "地域歯科診療支援病院歯科初診料（病初診）の届出が前提。外感染2に相当する病院版（新興感染症対応）。",
    revenue_sim: {
      linked_items: [
        { item: "外感染4（初診）", points_per_event: 15, default_monthly_count_hint: 60 },
        { item: "外感染4（再診）", points_per_event: 5, default_monthly_count_hint: 400 },
      ],
      formula: "(15 × 月間初診回数 + 5 × 月間再診回数) × 10円",
      exclusive_group: "gaikansen",
    },
    verify_flags: ["令和8点数の確定（15/5点は令和6値）", "病院向け（病初診が前提）"],
    last_updated: "2026-06-14",
    source_version: "告示第70号・保医発0305第7号",
    sources: [KINKI_KIHON, "https://kouseikyoku.mhlw.go.jp/kinki/r8-k04-1-2.pdf"],
  },
  {
    id: "shien_byo",
    official_name: "在宅療養支援歯科病院に係る施設基準",
    common_name: "歯援病",
    code_number: "2-94",
    code_number_bureau: "近畿 令和8（要確認）",
    notification_ref: "通知 別添1-14 系",
    category: "特掲診療料",
    new_or_revised_r8: "継続",
    prerequisites: ["byo_shoshin"],
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
          label: "高齢者の心身の特性・口腔機能管理・緊急時対応等の研修を受講した歯科医師を配置している",
          type: "boolean",
          verify: true,
        },
        { key: "dental_hygienist_home", label: "歯科衛生士を配置している", type: "boolean" },
      ],
      system: [
        {
          key: "medical_link",
          label: "医科・介護・地域包括ケアとの連携体制を有する",
          type: "boolean",
        },
      ],
      performance: [],
      training: [],
    },
    fees: [{ item_name: "在宅療養支援歯科病院加算（各種加算の前提）", points: 100, unit: "点", frequency_note: "関連加算に反映" }],
    forms: {
      todokede_form: "別添2",
      attachment_forms: ["様式18"],
      attachments: ["訪問診療実績・連携先一覧・研修受講を示す資料"],
      e_application_available: true,
    },
    transitional: "在宅療養支援歯科診療所（歯援診）の病院版。様式18（在宅療養支援歯科診療所1・2又は在宅療養支援歯科病院 共通）。",
    revenue_sim: {
      linked_items: [{ item: "在宅療養支援歯科病院加算", points_per_event: 100, default_monthly_count_hint: 20 }],
      formula: "100 × 月間訪問関連算定回数 × 10円",
      exclusive_group: "shien_type",
    },
    verify_flags: ["整理番号2-94は局別・要確認", "病院向け基準。実績・連携要件は告示で要確認"],
    last_updated: "2026-06-14",
    source_version: "告示第71号・保医発0305第8号",
    sources: [KINKI_TOKUTEI, "https://kouseikyoku.mhlw.go.jp/kinki/r6-t18.pdf"],
  },
];

/** id で施設基準を引く。 */
export function getStandardById(id: string): DentalFacilityStandard | undefined {
  return standards.find((s) => s.id === id);
}

// ─────────────────────────────────────────────────────────────────────────────
// 近畿厚生局 令和8年度の公式届出様式PDF（令和8年4月20日付ページ）。
// クリックで厚労省の正規PDFを開き、ブラウザの印刷でそのまま出力できる（様式の自作はしない）。
// 注意：様式PDF・整理番号は地方厚生局・改定年度ごとに異なる。ここでは「近畿厚生局・令和8年度」の値。
// 出典: https://kouseikyoku.mhlw.go.jp/kinki/shinsei/shido_kansa/shitei_kijun/kihon_r08k.html
//       https://kouseikyoku.mhlw.go.jp/kinki/shinsei/shido_kansa/shitei_kijun/tokukei_r08t.html
// ─────────────────────────────────────────────────────────────────────────────
const KINKI_PDF = "https://kouseikyoku.mhlw.go.jp/kinki/";
const BESSHI7 = KINKI_PDF + "r8-1-000-01.pdf"; // 基本診療料 共通届出書（別添7）
const BESSHI2 = KINKI_PDF + "r8-2-000-01.pdf"; // 特掲診療料 共通届出書（別添2）

export interface OfficialFormLink {
  label: string;
  url: string;
}
export interface OfficialForms {
  /** 厚生局・年度（例: '近畿 令和8'）。 */
  bureau: string;
  /** 共通届出書（別添7/別添2）のPDF。 */
  common: OfficialFormLink;
  /** 施設基準ごとの様式PDF。 */
  forms: OfficialFormLink[];
}

/** id → 近畿厚生局 令和8の公式様式PDF。 */
export const officialForms: Record<string, OfficialForms> = {
  ha_shoshin: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添7", url: BESSHI7 },
    forms: [
      { label: "別添7（歯初診）", url: KINKI_PDF + "r8-1-016.pdf" },
      { label: "様式2の6", url: KINKI_PDF + "r8-k02-6.pdf" },
    ],
  },
  gai_anzen_1: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添7", url: BESSHI7 },
    forms: [
      { label: "別添7（外安全1）", url: KINKI_PDF + "r8-1-018.pdf" },
      { label: "様式4", url: KINKI_PDF + "r8-k04.pdf" },
    ],
  },
  gai_kansen_1: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添7", url: BESSHI7 },
    forms: [
      { label: "別添7（外感染1）", url: KINKI_PDF + "r8-1-020.pdf" },
      { label: "様式4", url: KINKI_PDF + "r8-k04.pdf" },
    ],
  },
  ha_dx_1: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添7", url: BESSHI7 },
    forms: [
      { label: "別添7（歯医DX1）", url: KINKI_PDF + "r8-1-008.pdf" },
      { label: "別添7（歯医DX2）", url: KINKI_PDF + "r8-1-008-2.pdf" },
      { label: "様式1の6", url: KINKI_PDF + "r8-k01-6.pdf" },
    ],
  },
  baseup_1: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添2", url: BESSHI2 },
    forms: [
      { label: "様式95〜100（統合）", url: KINKI_PDF + "r8-t95-100.pdf" },
      { label: "様式94（特別事情届出書）", url: KINKI_PDF + "r8-t94.pdf" },
    ],
  },
  kokan_kyo: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添2", url: BESSHI2 },
    forms: [
      { label: "別添2（口管強）", url: KINKI_PDF + "r8-2-089.pdf" },
      { label: "様式17の2", url: KINKI_PDF + "r8-t17-2.pdf" },
    ],
  },
  shien_shin_1: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添2", url: BESSHI2 },
    forms: [
      { label: "別添2（歯援診1）", url: KINKI_PDF + "r8-2-092.pdf" },
      { label: "様式18", url: KINKI_PDF + "r8-t18.pdf" },
    ],
  },
  ha_homon_chiiki_renkei: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添2", url: BESSHI2 },
    forms: [
      { label: "別添2（歯地連）", url: KINKI_PDF + "r8-2-132.pdf" },
      { label: "様式21", url: KINKI_PDF + "r8-t21.pdf" },
    ],
  },
  cadcam_kogaku: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添2", url: BESSHI2 },
    forms: [
      { label: "別添2（CAD/CAM冠・インレー）", url: KINKI_PDF + "r8-2-301.pdf" },
      { label: "別添2（光学印象）", url: KINKI_PDF + "r8-2-300.pdf" },
      { label: "様式50の2", url: KINKI_PDF + "r8-t50-2.pdf" },
    ],
  },
  giko_renkei: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添2", url: BESSHI2 },
    forms: [
      { label: "別添2（技工連携1）", url: KINKI_PDF + "r8-2-298.pdf" },
      { label: "別添2（技工連携2）", url: KINKI_PDF + "r8-2-299.pdf" },
      { label: "様式50の2の2", url: KINKI_PDF + "r8-t50-2-2.pdf" },
    ],
  },
  ushokugishososhaku: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添2", url: BESSHI2 },
    forms: [
      { label: "別添2（咀嚼機能検査）", url: KINKI_PDF + "r8-2-184.pdf" },
      { label: "様式38の1の2", url: KINKI_PDF + "r8-t38-1-2.pdf" },
    ],
  },
  gtr: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添2", url: BESSHI2 },
    forms: [{ label: "別添2（GTR）※命名規則上ほぼ確実・要確認", url: KINKI_PDF + "r8-2-484.pdf" }],
  },
  laser_koku_nenmaku: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添2", url: BESSHI2 },
    forms: [{ label: "様式49の9", url: KINKI_PDF + "r8-t49-9.pdf" }],
  },
  kikan_anzen_shika: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添2", url: BESSHI2 },
    forms: [
      { label: "別添2（機安歯）", url: KINKI_PDF + "r8-2-086.pdf" },
      { label: "様式15", url: KINKI_PDF + "r8-t15.pdf" },
    ],
  },
  ikan: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添2", url: BESSHI2 },
    forms: [
      { label: "別添2（医管）", url: KINKI_PDF + "r8-2-088.pdf" },
      { label: "様式17", url: KINKI_PDF + "r8-t17.pdf" },
    ],
  },
  koku_jitchi: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添2", url: BESSHI2 },
    forms: [
      { label: "別添2（口実地）", url: KINKI_PDF + "r8-2-091.pdf" },
      { label: "様式17の4 ※推定・要検証", url: KINKI_PDF + "r8-t17-4.pdf" },
    ],
  },
  zaikan: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添2", url: BESSHI2 },
    forms: [
      { label: "別添2（在歯管）", url: KINKI_PDF + "r8-2-101.pdf" },
      { label: "様式17", url: KINKI_PDF + "r8-t17.pdf" },
    ],
  },
  hokan: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添2", url: BESSHI2 },
    forms: [
      { label: "別添2（補管）", url: KINKI_PDF + "r8-2-580.pdf" },
      { label: "様式81 ※推定・要検証", url: KINKI_PDF + "r8-t81.pdf" },
    ],
  },
  gai_kansen_2: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添7", url: BESSHI7 },
    forms: [
      { label: "別添7（外感染2）", url: KINKI_PDF + "r8-1-021.pdf" },
      { label: "様式4", url: KINKI_PDF + "r8-k04.pdf" },
    ],
  },
  byo_shoshin: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添7", url: BESSHI7 },
    forms: [
      { label: "別添7（病初診）※推定・要検証", url: KINKI_PDF + "r8-1-017.pdf" },
      { label: "様式3", url: KINKI_PDF + "r8-k03.pdf" },
    ],
  },
  gai_anzen_2: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添7", url: BESSHI7 },
    forms: [
      { label: "別添7（外安全2）", url: KINKI_PDF + "r8-1-019.pdf" },
      { label: "様式4の1の2", url: KINKI_PDF + "r8-k04-1-2.pdf" },
    ],
  },
  gai_kansen_3: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添7", url: BESSHI7 },
    forms: [
      { label: "別添7（外感染3）", url: KINKI_PDF + "r8-1-022.pdf" },
      { label: "様式4の1の2", url: KINKI_PDF + "r8-k04-1-2.pdf" },
    ],
  },
  gai_kansen_4: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添7", url: BESSHI7 },
    forms: [
      { label: "別添7（外感染4）", url: KINKI_PDF + "r8-1-023.pdf" },
      { label: "様式4の1の2", url: KINKI_PDF + "r8-k04-1-2.pdf" },
    ],
  },
  shien_byo: {
    bureau: "近畿 令和8",
    common: { label: "共通届出書 別添2", url: BESSHI2 },
    forms: [
      { label: "別添2（歯援病）※推定・要検証", url: KINKI_PDF + "r8-2-094.pdf" },
      { label: "様式18", url: KINKI_PDF + "r8-t18.pdf" },
    ],
  },
};

/** id で近畿厚生局の公式様式を引く。 */
export function getOfficialForms(id: string): OfficialForms | undefined {
  return officialForms[id];
}
