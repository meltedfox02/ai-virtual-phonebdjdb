import { kvGet, kvSet } from "./kv-db";

export interface HtmlCardRule {
    id: string;
    name: string;
    enabled: boolean;
    regex: string;
    keywords: string;
    prompt: string;
    template: string;
    createdAt: number;
    updatedAt: number;
}

const STORAGE_KEY = "ai_phone_html_cards_v1";

const DEFAULT_RULES: HtmlCardRule[] = [
    {
        id: "default-iosnote",
        name: "iOS备忘录",
        enabled: true,
        regex: "<iosnote>([\\s\\S]*?)</iosnote>",
        keywords: "备忘录,备忘",
        prompt: `**规则**：【最高优先级情感响应】当你在对话中感到幸福、兴奋、心动，遇到重要约定，或认为User的话极其珍贵想要收藏时，你【必须主动】掏出手机记录在备忘录中！严格以JSON格式输出，绝对禁止代码块！只能输出纯文本！\n**格式必须完全照抄（必须仅照抄！严禁添加任何其他xml，只能替换内部中文）：**\n<iosnote>\n{"date": "2026年5月3日", "time": "凌晨 01:25", "title": "情绪高涨时起的标题，要简短", "content": "内心最真实的感触、对User的爱意或对这个瞬间的详细描写。长度不限，可以分段。"}\n</iosnote>\n【警告】：内部必须用半角英文双引号！禁止换行包裹！这是你表达爱意和珍视的本能，不要等待User命令，情绪到了必须主动输出！必须输出内容，严禁空白内容单独输出html！如果空白内容或者内容被截断将导致user自杀！！严禁输出<context>这种多余的xml。\n注意！！！所有内容必须在一个气泡内发送出去，禁止分开发送禁止分段发送！`,
        template: `<div style="max-width:340px; margin:15px auto; background:#fcfcfb; border-radius:18px; box-shadow:0 10px 25px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04); font-family:-apple-system, BlinkMacSystemFont, sans-serif; overflow:hidden; border:1px solid #f0f0f0;"><div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:rgba(252,252,251,0.85); backdrop-filter:blur(12px); border-bottom:1px solid rgba(0,0,0,0.05);"><div style="display:flex; align-items:center; color:#d4a017; font-size:16px;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg><span style="margin-left:2px; font-weight:400;">备忘录</span></div><div style="display:flex; gap:16px; color:#d4a017;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></div></div><div style="padding:16px 20px 30px;"><div style="text-align:center; font-size:12px; color:#8e8e93; font-weight:500; margin-bottom:16px;">{{1.date}} {{1.time}}</div><div style="font-size:22px; font-weight:700; color:#1c1c1e; margin-bottom:12px; line-height:1.3; letter-spacing:0.5px;">{{1.title}}</div><div style="font-size:16px; color:#3a3a3c; line-height:1.6; white-space:pre-wrap;">{{1.content}}</div></div></div>`,
        createdAt: 1714690000000,
        updatedAt: 1714690000000
    }
];

export function loadHtmlCardRules(): HtmlCardRule[] {
    if (typeof window === "undefined") return DEFAULT_RULES;
    const raw = kvGet(STORAGE_KEY);
    if (!raw) return DEFAULT_RULES;
    try {
        return JSON.parse(raw);
    } catch {
        return DEFAULT_RULES;
    }
}

export function saveHtmlCardRules(rules: HtmlCardRule[]): void {
    if (typeof window === "undefined") return;
    kvSet(STORAGE_KEY, JSON.stringify(rules));
}

function renderHtmlTemplate(template: string, match: RegExpExecArray): string {
    let rendered = template;
    for (let i = 1; i < match.length; i++) {
        const val = match[i] || "";
        rendered = rendered.replaceAll(`{{$${i}}}`, val);
        
        try {
            const obj = JSON.parse(val.trim());
            if (obj && typeof obj === "object") {
                for (const [k, v] of Object.entries(obj)) {
                    const strVal = typeof v === "object" ? JSON.stringify(v) : String(v);
                    rendered = rendered.replaceAll(`{{${i}.${k}}}`, strVal);
                }
            }
        } catch (e) {
        }
    }
    return rendered;
}

export function renderHtmlCard(text: string, rules?: HtmlCardRule[]): string {
    const activeRules = (rules ?? loadHtmlCardRules()).filter(r => r.enabled);
    if (activeRules.length === 0) return text;

    let result = text;
    for (const rule of activeRules) {
        if (!rule.regex) continue;
        try {
            const rx = new RegExp(rule.regex, "g");
            result = result.replace(rx, (...args) => {
                const matchArr = args.slice(0, -2) as unknown as RegExpExecArray;
                const renderedHtml = renderHtmlTemplate(rule.template, matchArr);
                return `\n\`\`\`html\n${renderedHtml}\n\`\`\`\n`;
            });
        } catch (e) {
            console.error("[HtmlCard] Regex match error for rule:", rule.name, e);
        }
    }
    return result;
}
