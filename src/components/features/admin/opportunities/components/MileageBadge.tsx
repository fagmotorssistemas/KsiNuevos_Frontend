import { TrendingDown, TrendingUp } from "lucide-react";

export function MileageBadge({ type }: { type: 'min' | 'max' | null }) {
    if (!type) return null;

    if (type === 'min') {
        return (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">
                <TrendingDown className="h-2.5 w-2.5" />
                Menor kilometraje
            </div>
        );
    }

    return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-bold uppercase tracking-wide">
            <TrendingUp className="h-2.5 w-2.5" />
            Mayor kilometraje
        </div>
    );
}