import type { Region } from "../domain";

/**
 * Event regions: which places an item is about, inferred from organisations,
 * places, and institutions named in the title (and, at lower priority, the body).
 * Multi-label and explicitly an inference; publisher location is a separate field.
 */

type Term = string | { term: string; caseSensitive: true };

const TERMS: Record<Exclude<Region, "global">, Term[]> = {
  us: [
    "OpenAI", "ChatGPT", "Anthropic", "Claude", "Google", "Gemini", "DeepMind", "Microsoft", "Copilot", "Meta", "Llama",
    "Apple", "Amazon", "AWS", "Nvidia", "xAI", "Grok", "Tesla", "Intel", "AMD", "Qualcomm", "IBM", "Oracle", "Salesforce",
    "Perplexity", { term: "Cursor", caseSensitive: true }, "Databricks", "Snowflake", "Palantir", "Pentagon", "White House", "Silicon Valley", "California",
    "Trump", "Congress", "FTC",
    { term: "US", caseSensitive: true }, { term: "U.S.", caseSensitive: true }, "United States", "American",
    "美國", "美国", "白宮", "白宫", "矽谷", "硅谷", "谷歌", "微軟", "微软", "輝達", "英伟达", "蘋果", "苹果", "亞馬遜", "亚马逊",
    "アメリカ", "米国", "米国", "グーグル", "マイクロソフト", "미국", "구글", "오픈AI", "엔비디아", "마이크로소프트"
  ],
  china: [
    "China", "Chinese", "Beijing", "Shanghai", "Shenzhen", "Hangzhou", "Alibaba", "Qwen", "DeepSeek", "Baidu", "ERNIE", "Tencent",
    "Hunyuan", "ByteDance", "Doubao", "Moonshot", "Kimi", "Zhipu", "GLM", "MiniMax", "Huawei", "Xiaomi", "SenseTime", "StepFun",
    "Unitree", "iFlytek",
    "中國", "中国", "北京", "上海", "深圳", "杭州", "阿里", "通义", "通義", "千问", "千問", "深度求索", "百度", "文心", "腾讯", "騰訊",
    "混元", "字节", "字節", "豆包", "月之暗面", "智谱", "智譜", "华为", "華為", "小米", "商汤", "商湯", "阶跃", "階躍", "宇树", "宇樹",
    "科大讯飞", "摩尔线程", "沐曦", "寒武纪", "中国", "中国企業", "중국"
  ],
  taiwan: [
    "Taiwan", "Taiwanese", "Taipei", "Hsinchu", "TSMC", "Foxconn", "Hon Hai", "MediaTek", "Quanta", "Wistron", "ASUS", "Acer",
    "ITRI", "Academia Sinica",
    "台灣", "臺灣", "台湾", "台北", "臺北", "新竹", "台中", "臺中", "台南", "高雄", "台積電", "臺積電", "台积电", "鴻海", "鸿海",
    "聯發科", "联发科", "廣達", "緯創", "華碩", "宏碁", "國科會", "数位部", "數位部", "數發部", "經濟部", "工研院", "中研院",
    "資策會", "國研院", "竹科", "南科", "中科", "行政院", "立法院", "賴清德", "대만"
  ],
  europe: [
    "Europe", "European", "Brussels", "Mistral", "DeepL", "Aleph Alpha", "Stability AI", "Synthesia", "Helsing", "ASML", "SAP",
    "Station F", "AI Act", "Britain", "British", "London", "France", "French", "Paris", "Germany", "German", "Berlin", "Munich",
    "Netherlands", "Dutch", "Amsterdam", "Sweden", "Spain", "Italy", "Switzerland", "Zurich",
    { term: "EU", caseSensitive: true }, { term: "UK", caseSensitive: true },
    "歐盟", "欧盟", "歐洲", "欧洲", "英國", "英国", "倫敦", "伦敦", "法國", "法国", "巴黎", "德國", "德国", "柏林", "荷蘭", "荷兰",
    "欧州", "イギリス", "英国", "フランス", "ドイツ", "유럽", "영국", "프랑스", "독일"
  ],
  japan: [
    "Japan", "Japanese", "Tokyo", "Osaka", "SoftBank", "Sakana", "Preferred Networks", "NTT", "Sony", "Rakuten", "Fujitsu",
    "NEC", "Hitachi", "Toyota", "Nintendo", "Panasonic",
    "日本", "東京", "东京", "大阪", "軟銀", "软银", "ソフトバンク", "ソニー", "楽天", "富士通", "日立", "トヨタ", "任天堂", "パナソニック",
    "政府", "経産省", "総務省", "デジタル庁", "일본", "도쿄", "소프트뱅크"
  ],
  korea: [
    "Korea", "Korean", "Seoul", "Samsung", "SK hynix", "Hynix", "Naver", "Kakao", "Upstage", "LG AI", "Hyundai",
    { term: "LG", caseSensitive: true },
    "韓國", "韩国", "首爾", "首尔", "三星", "海力士", "現代", "韓国", "ソウル", "サムスン",
    "한국", "서울", "삼성", "하이닉스", "네이버", "카카오", "업스테이지", "현대", "정부", "과기정통부"
  ]
};

/** Terms that would mislabel a publisher's home-language text if counted for every item (e.g. 政府 in Japanese or Korean). */
const PUBLISHER_GENERIC: Partial<Record<Exclude<Region, "global">, string[]>> = {
  japan: ["政府"],
  korea: ["정부"]
};

const ASCII = /^[\x20-\x7e]+$/;

function compile(term: Term): RegExp {
  const text = typeof term === "string" ? term : term.term;
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!ASCII.test(text)) return new RegExp(escaped);
  const flags = typeof term === "string" ? "i" : "";
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, flags);
}

const compiled = Object.fromEntries(
  Object.entries(TERMS).map(([region, terms]) => [
    region,
    [...new Map(terms.map((term) => [typeof term === "string" ? term : term.term, term])).values()]
      .filter((term) => !(PUBLISHER_GENERIC[region as Exclude<Region, "global">] ?? []).includes(typeof term === "string" ? term : term.term))
      .map((term) => ({ term: typeof term === "string" ? term : term.term, pattern: compile(term) }))
  ])
) as Record<Exclude<Region, "global">, Array<{ term: string; pattern: RegExp }>>;

const generic = Object.fromEntries(
  Object.entries(PUBLISHER_GENERIC).map(([region, terms]) => [region, (terms ?? []).map((term) => new RegExp(term))])
) as Partial<Record<Exclude<Region, "global">, RegExp[]>>;

/**
 * Regions an item concerns. Title matches decide; the body is consulted only when
 * the title names no region. A generic word like 政府 ("government") counts only
 * for the region the publisher is in.
 */
export function eventRegions(title: string, body = "", publisherRegion: Region = "global"): Region[] {
  const scan = (text: string) =>
    (Object.keys(compiled) as Array<Exclude<Region, "global">>).filter(
      (region) =>
        compiled[region].some(({ pattern }) => pattern.test(text)) ||
        (region === publisherRegion && (generic[region] ?? []).some((pattern) => pattern.test(text)))
    );
  const fromTitle = scan(title);
  return fromTitle.length > 0 ? fromTitle : scan(body.slice(0, 400));
}
