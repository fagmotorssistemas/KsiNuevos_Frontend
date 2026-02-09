"use client";

import { Check, X } from "lucide-react";

interface ChecklistGroupProps {
    title: string;
    items: { key: string; label: string }[];
    values: Record<string, boolean>;
    onChange: (key: string, value: boolean) => void;
}

export function ChecklistGroup({ title, items, values, onChange }: ChecklistGroupProps) {
    return (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-700 uppercase mb-3 border-b border-slate-200 pb-2">
                {title}
            </h4>
            <div className="grid grid-cols-1 gap-3">
                {items.map((item) => {
                    const isChecked = values[item.key] || false;
                    return (
                        <div 
                            key={item.key}
                            onClick={() => onChange(item.key, !isChecked)}
                            className={`
                                cursor-pointer flex items-center justify-between p-2 rounded-lg border text-sm transition-all
                                ${isChecked 
                                    ? 'bg-white border-blue-500 shadow-sm text-slate-800 font-medium' 
                                    : 'bg-transparent border-transparent hover:bg-slate-200/50 text-slate-500'
                                }
                            `}
                        >
                            <span>{item.label}</span>
                            <div className={`
                                w-5 h-5 rounded flex items-center justify-center border transition-colors
                                ${isChecked ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'}
                            `}>
                                {isChecked && <Check className="h-3.5 w-3.5 text-white" />}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}