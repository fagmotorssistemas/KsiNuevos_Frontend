interface ProcessingStatusProps {
    isProcessing: boolean;
    progreso: number;
}

export function ProcessingStatus({ isProcessing, progreso }: ProcessingStatusProps) {
    if (!isProcessing) return null;

    return (
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border shadow-sm">
            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-blue-500 transition-all duration-500" 
                    style={{ width: `${progreso}%` }} 
                />
            </div>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tighter">
                {progreso}% Procesado
            </span>
        </div>
    );
}