interface ProcessingStatusProps {
    isProcessing: boolean;
    progreso: number;
}

export function ProcessingStatus({ isProcessing, progreso }: ProcessingStatusProps) {
    if (!isProcessing) return null;

    return (
        <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-blue-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(37,99,235,0.3)]" 
                    style={{ width: `${progreso}%` }} 
                />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                    Estado
                </span>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                    {progreso === 100 ? 'Completado' : `${progreso}% Procesado`}
                </span>
            </div>
        </div>
    );
}