"use client";

import { useState, useEffect, useContext, useCallback, useRef } from "react";
import { Plus, Trash2, Download, Upload, ChevronLeft, AlertCircle, Play, Check, Copy, Eye } from "lucide-react";
import {
    loadHtmlCards,
    saveHtmlCards,
    createHtmlCardGroup,
    createHtmlCardRule,
} from "@/lib/settings-storage";
import type { HtmlCardConfig, HtmlCardRule } from "@/lib/settings-types";
import { SettingsContext } from "../phone-settings-app";
import { BottomSheet, ConfirmDialog } from "@/components/ui/modal";
import { SwipeActionRow, useSwipeActions } from "@/components/ui/swipe-actions";

export function HtmlCardManager() {
    const [groups, setGroups] = useState<HtmlCardConfig[]>([]);
    const [activeGroupId, setActiveBookId] = useState<string>("");
    const [viewMode, setViewMode] = useState<"list" | "detail">("list");
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<{
        type: "group" | "rule";
        id: string;
    } | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { setSubpageTitle, setOverrideBack } = useContext(SettingsContext);

    useEffect(() => {
        const loaded = loadHtmlCards();
        setGroups(loaded);
        if (loaded.length > 0) {
            setActiveBookId(loaded[0].id);
        }
        setIsLoaded(false);
    }, []);

    const persist = useCallback((newGroups: HtmlCardConfig[]) => {
        setGroups(newGroups);
        saveHtmlCards(newGroups);
    }, []);

    const activeGroup = groups.find(g => g.id === activeGroupId);

    useEffect(() => {
        if (viewMode === "detail" && activeGroup) {
            setOverrideBack(() => () => setViewMode("list"));
            setSubpageTitle(activeGroup.name || "卡片组详情");
        } else {
            setOverrideBack(null);
            setSubpageTitle(null);
        }
    }, [viewMode, activeGroup, setOverrideBack, setSubpageTitle]);

    // 导出文件
    const handleExport = () => {
        if (!activeGroup) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeGroup, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `html_card_${activeGroup.name || "export"}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };

    // 导入文件
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const parsed = JSON.parse(evt.target?.result as string);
                if (parsed && typeof parsed === "object" && Array.isArray(parsed.rules)) {
                    const newGroup: HtmlCardConfig = {
                        id: `html_card_group_${Date.now()}`,
                        name: parsed.name || "导入的卡片组",
                        description: parsed.description || "",
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        rules: parsed.rules.map((r: any) => ({
                            id: r.id || `rule_${Math.random()}`,
                            name: r.name || "未命名规则",
                            keyword: r.keyword || "",
                            prompt: r.prompt || "",
                            findRegex: r.findRegex || "",
                            replaceHtml: r.replaceHtml || "",
                            renderMode: r.renderMode === "css" ? "css" : "iframe",
                            disabled: !!r.disabled,
                        })),
                    };
                    const updated = [...groups, newGroup];
                    persist(updated);
                    setActiveBookId(newGroup.id);
                    setViewMode("detail");
                } else {
                    alert("无效的 HTML 卡片配置文件格式");
                }
            } catch (err) {
                alert("读取 JSON 文件失败");
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    // 添加卡片组
    const handleAddGroup = () => {
        const name = prompt("请输入新卡片组名称：");
        if (!name) return;
        const newGroup = createHtmlCardGroup(name);
        const updated = [...groups, newGroup];
        persist(updated);
        setActiveBookId(newGroup.id);
        setViewMode("detail");
    };

    // 添加规则
    const handleAddRule = () => {
        if (!activeGroup) return;
        const rule = createHtmlCardRule("新卡片规则");
        const updatedRules = [...activeGroup.rules, rule];
        const updatedGroups = groups.map(g => g.id === activeGroup.id ? { ...g, rules: updatedRules, updatedAt: Date.now() } : g);
        persist(updatedGroups);
        setEditingRuleId(rule.id);
    };

    // 修改规则属性
    const handleUpdateRule = (ruleId: string, fields: Partial<HtmlCardRule>) => {
        if (!activeGroup) return;
        const updatedRules = activeGroup.rules.map(r => r.id === ruleId ? { ...r, ...fields } : r);
        const updatedGroups = groups.map(g => g.id === activeGroup.id ? { ...g, rules: updatedRules, updatedAt: Date.now() } : g);
        persist(updatedGroups);
    };

    // 删除卡片组
    const handleDeleteGroup = (groupId: string) => {
        const updated = groups.filter(g => g.id !== groupId);
        persist(updated);
        if (updated.length > 0) {
            setActiveBookId(updated[0].id);
        }
    };

    // 删除规则
    const handleDeleteRule = (ruleId: string) => {
        if (!activeGroup) return;
        const updatedRules = activeGroup.rules.filter(r => r.id !== ruleId);
        const updatedGroups = groups.map(g => g.id === activeGroup.id ? { ...g, rules: updatedRules, updatedAt: Date.now() } : g);
        persist(updatedGroups);
    };

    if (viewMode === "list") {
        return (
            <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                    <span className="ts-14 text-muted">HTML卡片可以通过对话关键词触发，将特定的文本渲染为交互式卡片</span>
                    <div className="flex gap-2">
                        <button onClick={handleImportClick} className="btn-secondary p-2 rounded-full" title="导入">
                            <Upload size={16} />
                        </button>
                        <button onClick={handleAddGroup} className="btn-primary p-2 rounded-full" title="新建">
                            <Plus size={16} />
                        </button>
                    </div>
                </div>
                <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />

                <div className="space-y-2">
                    {groups.map(group => (
                        <div
                            key={group.id}
                            className="p-4 bg-panel-card rounded-2xl border border-divider cursor-pointer hover:bg-panel-card-hover flex justify-between items-center"
                            onClick={() => {
                                setActiveBookId(group.id);
                                setViewMode("detail");
                            }}
                        >
                            <div>
                                <div className="ts-16 font-semibold">{group.name}</div>
                                <div className="ts-12 text-muted mt-1">{group.rules.length} 条渲染规则</div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`确定要删除卡片组 "${group.name}" 吗？`)) {
                                        handleDeleteGroup(group.id);
                                    }
                                }}
                                className="p-2 text-danger hover:bg-danger-hover rounded-full"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const editingRule = activeGroup?.rules.find(r => r.id === editingRuleId);

    return (
        <div className="p-4 space-y-4 pb-20">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <button onClick={() => setViewMode("list")} className="p-2 rounded-full hover:bg-divider">
                        <ChevronLeft size={18} />
                    </button>
                    <span className="ts-18 font-bold">{activeGroup?.name}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExport} className="btn-secondary p-2 rounded-full" title="导出">
                        <Download size={16} />
                    </button>
                    <button onClick={handleAddRule} className="btn-primary flex items-center gap-1 px-3 py-1.5 rounded-full ts-14">
                        <Plus size={16} /> 新增规则
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {activeGroup?.rules.map(rule => (
                    <div key={rule.id} className="p-4 bg-panel-card rounded-2xl border border-divider space-y-3">
                        <div className="flex justify-between items-center">
                            <input
                                type="text"
                                value={rule.name}
                                onChange={(e) => handleUpdateRule(rule.id, { name: e.target.value })}
                                className="bg-transparent border-b border-transparent hover:border-divider focus:border-primary px-1 py-0.5 font-semibold ts-16 focus:outline-none w-1/2"
                            />
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleUpdateRule(rule.id, { disabled: !rule.disabled })}
                                    className={`px-2.5 py-1 rounded-full ts-12 font-mediumTransition ${rule.disabled ? "bg-divider text-muted" : "bg-success/15 text-success"}`}
                                >
                                    {rule.disabled ? "未启用" : "已启用"}
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm(`确定要删除规则 "${rule.name}" 吗？`)) {
                                            handleDeleteRule(rule.id);
                                        }
                                    }}
                                    className="p-1.5 text-danger hover:bg-danger-hover rounded-full"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="ts-12 text-muted block mb-1">触发关键词</label>
                                <input
                                    type="text"
                                    value={rule.keyword}
                                    placeholder="例如：天气"
                                    onChange={(e) => handleUpdateRule(rule.id, { keyword: e.target.value })}
                                    className="w-full bg-card border border-divider rounded-xl px-3 py-2 ts-14 focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="ts-12 text-muted block mb-1">匹配正则表达式</label>
                                <input
                                    type="text"
                                    value={rule.findRegex}
                                    placeholder="例如：\[天气\]([\s\S]*?)\[\/天气\]"
                                    onChange={(e) => handleUpdateRule(rule.id, { findRegex: e.target.value })}
                                    className="w-full bg-card border border-divider rounded-xl px-3 py-2 ts-14 font-mono focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="ts-12 text-muted block mb-1">大模型注入提示词</label>
                            <textarea
                                value={rule.prompt}
                                placeholder="在对话中检测到关键词时，会向LLM注入这段提示词以限制输出格式。"
                                onChange={(e) => handleUpdateRule(rule.id, { prompt: e.target.value })}
                                rows={2}
                                className="w-full bg-card border border-divider rounded-xl px-3 py-2 ts-14 focus:outline-none focus:border-primary resize-y"
                            />
                        </div>

                        <div>
                            <label className="ts-12 text-muted block mb-1">HTML/CSS卡片渲染模板 ($1 代表正则捕获内容)</label>
                            <textarea
                                value={rule.replaceHtml}
                                placeholder="例如：<div style='color:blue'>$1</div>"
                                onChange={(e) => handleUpdateRule(rule.id, { replaceHtml: e.target.value })}
                                rows={4}
                                className="w-full bg-card border border-divider rounded-xl px-3 py-2 ts-14 font-mono focus:outline-none focus:border-primary resize-y"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}