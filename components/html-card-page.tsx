"use client";

import { useState, useEffect } from "react";
import { loadHtmlCardRules, saveHtmlCardRules, type HtmlCardRule } from "@/lib/html-card-storage";
import { Plus, Trash2, Edit2, Check, X, Code, Eye, RefreshCw } from "lucide-react";

export function HtmlCardPage({ onNotice }: { onNotice?: (msg: string) => void }) {
    const [rules, setRules] = useState<HtmlCardRule[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<HtmlCardRule>>({});
    const [previewModeId, setPreviewModeId] = useState<string | null>(null);
    const [previewContent, setPreviewContent] = useState<string>("");

    useEffect(() => {
        setRules(loadHtmlCardRules());
    }, []);

    const handleSaveRules = (newRules: HtmlCardRule[]) => {
        setRules(newRules);
        saveHtmlCardRules(newRules);
    };

    const handleToggleRule = (id: string) => {
        const updated = rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
        handleSaveRules(updated);
        onNotice?.("规则状态已更新");
    };

    const handleDeleteRule = (id: string) => {
        if (!confirm("确定要删除这条 HTML 卡片规则吗？")) return;
        const updated = rules.filter(r => r.id !== id);
        handleSaveRules(updated);
        onNotice?.("规则已删除");
    };

    const handleStartEdit = (rule: HtmlCardRule) => {
        setEditingId(rule.id);
        setEditForm({ ...rule });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSaveEdit = () => {
        if (!editForm.name?.trim()) {
            alert("请输入名称");
            return;
        }
        if (!editForm.regex?.trim()) {
            alert("请输入匹配正则");
            return;
        }

        let updated: HtmlCardRule[];
        if (editingId === "new") {
            const newRule: HtmlCardRule = {
                id: `html-card-${Date.now()}`,
                name: editForm.name,
                enabled: editForm.enabled ?? true,
                regex: editForm.regex,
                keywords: editForm.keywords ?? "",
                prompt: editForm.prompt ?? "",
                template: editForm.template ?? "",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            updated = [...rules, newRule];
        } else {
            updated = rules.map(r => r.id === editingId ? {
                ...r,
                ...editForm,
                updatedAt: Date.now(),
            } as HtmlCardRule : r);
        }

        handleSaveRules(updated);
        setEditingId(null);
        setEditForm({});
        onNotice?.("保存成功");
    };

    const handleAddRule = () => {
        setEditingId("new");
        setEditForm({
            name: "",
            enabled: true,
            regex: "",
            keywords: "",
            prompt: "",
            template: "",
        });
    };

    return (
        <div className="p-4 flex flex-col gap-4 h-full overflow-y-auto pb-20 select-none">
            <div className="flex justify-between items-center">
                <div>
                    <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">HTML 卡片正则渲染</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">自定义提取消息内容正则，并通过 HTML 模板和 iframe 进行沙箱隔离渲染。</p>
                </div>
                {editingId === null && (
                    <button
                        onClick={handleAddRule}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                        <Plus size={14} />
                        <span>新建规则</span>
                    </button>
                )}
            </div>

            {editingId !== null ? (
                <div className="bg-white/50 border border-zinc-100 rounded-xl p-4 flex flex-col gap-3.5 shadow-sm">
                    <h5 className="text-xs font-bold text-zinc-600 flex items-center gap-1">
                        <Code size={14} className="text-amber-500" />
                        {editingId === "new" ? "创建新卡片规则" : "编辑规则"}
                    </h5>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-zinc-500">卡片名称</label>
                        <input
                            type="text"
                            value={editForm.name || ""}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            placeholder="例如：iOS备忘录"
                            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-amber-500"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-zinc-500">匹配正则</label>
                        <input
                            type="text"
                            value={editForm.regex || ""}
                            onChange={e => setEditForm({ ...editForm, regex: e.target.value })}
                            placeholder="例如：<iosnote>([\s\S]*?)</iosnote>"
                            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 font-mono"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-zinc-500">触发关键词 (英文逗号隔开)</label>
                        <input
                            type="text"
                            value={editForm.keywords || ""}
                            onChange={e => setEditForm({ ...editForm, keywords: e.target.value })}
                            placeholder="例如：备忘录,备忘 (命中后会注入提示词并进行正则匹配)"
                            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-amber-500"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-zinc-500">提示词注入</label>
                        <textarea
                            value={editForm.prompt || ""}
                            onChange={e => setEditForm({ ...editForm, prompt: e.target.value })}
                            placeholder="命中关键词时注入的 System 提示词..."
                            rows={4}
                            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 font-sans resize-none h-[120px]"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-zinc-500">HTML 渲染模板</label>
                        <textarea
                            value={editForm.template || ""}
                            onChange={e => setEditForm({ ...editForm, template: e.target.value })}
                            placeholder="输入卡片 HTML 模板。支持 {{$1}} 渲染第一分组，或 {{1.字段}} 解析 JSON 字段..."
                            rows={6}
                            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 font-mono resize-none h-[180px]"
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 mt-2">
                        <button
                            onClick={handleCancelEdit}
                            className="flex items-center gap-1 px-3 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-600 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                        >
                            <X size={14} />
                            <span>取消</span>
                        </button>
                        <button
                            onClick={handleSaveEdit}
                            className="flex items-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
                        >
                            <Check size={14} />
                            <span>保存</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {rules.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-zinc-100 rounded-2xl text-zinc-400 text-xs flex flex-col items-center gap-2">
                            <Code size={24} className="text-zinc-300" />
                            <span>暂无 HTML 卡片规则，快建一个吧</span>
                        </div>
                    ) : (
                        rules.map(rule => (
                            <div key={rule.id} className="bg-white border border-zinc-100 rounded-xl p-3.5 flex flex-col gap-2 shadow-sm hover:border-zinc-200 transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={rule.enabled}
                                            onChange={() => handleToggleRule(rule.id)}
                                            className="h-3.5 w-3.5 rounded border-zinc-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-zinc-700">{rule.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleStartEdit(rule)}
                                            className="p-1.5 hover:bg-zinc-50 text-zinc-400 hover:text-zinc-600 rounded-lg transition-colors cursor-pointer"
                                            title="编辑"
                                        >
                                            <Edit2 size={13.5} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteRule(rule.id)}
                                            className="p-1.5 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                                            title="删除"
                                        >
                                            <Trash2 size={13.5} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 text-[11px] text-zinc-400 border-t border-zinc-50 pt-2">
                                    <div className="flex gap-1.5">
                                        <span className="font-semibold text-zinc-500 w-[55px] shrink-0">匹配正则:</span>
                                        <span className="font-mono break-all text-zinc-600 bg-zinc-50 px-1 rounded">{rule.regex}</span>
                                    </div>
                                    <div className="flex gap-1.5 mt-0.5">
                                        <span className="font-semibold text-zinc-500 w-[55px] shrink-0">触发词:</span>
                                        <span className="text-zinc-600">{rule.keywords || "(无)"}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
