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

const DEFAULT_RULES: HtmlCardRule[] = [];

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
    // 使用标准的 replace(replaceString) 逻辑，将 $1, $2, function renderHtmlTemplate(template: string, match: RegExpExecArray): string {
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
} 等标准替换语法原汁原味展开
    let rendered = template.replace(/\$([1-9]\d*|&|`|'|\$)/g, (fullMatch, symbol) => {
        if (symbol === "$") return "$";
        if (symbol === "&") return match[0] || "";
        const groupIndex = parseInt(symbol, 10);
        if (!isNaN(groupIndex)) {
            return match[groupIndex] !== undefined ? match[groupIndex] : fullMatch;
        }
        return fullMatch;
    });
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
