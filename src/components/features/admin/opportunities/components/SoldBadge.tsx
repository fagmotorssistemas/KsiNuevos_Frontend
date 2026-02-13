import { X, Sparkles } from "lucide-react";

export function SoldBadge({ isSold }: { isSold: boolean }) {
    if (isSold) {
        return (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold uppercase tracking-wide">
                <X className="h-2.5 w-2.5" />
                Vendido
            </div>
        );
    }

    return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">
            <Sparkles className="h-2.5 w-2.5" />
            Disponible
        </div>
    );
}