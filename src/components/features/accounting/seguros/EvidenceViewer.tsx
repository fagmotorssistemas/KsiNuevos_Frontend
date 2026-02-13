import { X, FileText, Image as ImageIcon, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useState } from "react";

interface EvidenceViewerProps {
    isOpen: boolean;
    onClose: () => void;
    urls: string[];
    title: string;
}

export function EvidenceViewer({ isOpen, onClose, urls, title }: EvidenceViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!isOpen || urls.length === 0) return null;

    const currentUrl = urls[currentIndex];
    const isPDF = currentUrl.toLowerCase().includes('.pdf');
    const total = urls.length;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            
            {/* Botón Cerrar (Arriba Derecha) */}
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-50"
            >
                <X size={24} />
            </button>

            <div className="w-full max-w-6xl h-full max-h-[90vh] flex flex-col md:flex-row gap-6">
                
                {/* --- ÁREA PRINCIPAL (VISUALIZADOR) --- */}
                <div className="flex-1 bg-black/50 rounded-2xl border border-white/10 relative flex items-center justify-center overflow-hidden">
                    {isPDF ? (
                        <iframe 
                            src={`${currentUrl}#toolbar=0`} 
                            className="w-full h-full rounded-xl"
                            title="Visor PDF"
                        />
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                            src={currentUrl} 
                            alt="Evidencia" 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                    )}

                    {/* Botón Descargar (Flotante) */}
                    <a 
                        href={currentUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="absolute bottom-4 right-4 p-2 bg-black/60 text-white text-xs font-bold uppercase rounded-lg border border-white/20 hover:bg-white hover:text-black transition-all flex items-center gap-2"
                    >
                        <Download size={14}/> Abrir Original
                    </a>
                </div>

                {/* --- BARRA LATERAL (LISTA DE ARCHIVOS) --- */}
                <div className="w-full md:w-80 flex flex-col gap-4 shrink-0">
                    <div className="text-white">
                        <h3 className="text-lg font-black uppercase tracking-tight">{title}</h3>
                        <p className="text-xs text-white/50 font-bold uppercase">Archivo {currentIndex + 1} de {total}</p>
                    </div>

                    {/* Lista Scrolleable */}
                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                        {urls.map((url, idx) => {
                            const isTypePDF = url.toLowerCase().includes('.pdf');
                            const isActive = idx === currentIndex;
                            
                            return (
                                <button 
                                    key={idx}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 group
                                        ${isActive 
                                            ? 'bg-white text-slate-900 border-white' 
                                            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:border-white/30'
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg ${isActive ? 'bg-slate-200 text-slate-900' : 'bg-black/30 text-slate-500'}`}>
                                        {isTypePDF ? <FileText size={18}/> : <ImageIcon size={18}/>}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-wide truncate">
                                            Evidencia #{idx + 1}
                                        </p>
                                        <p className="text-[9px] font-mono opacity-60 truncate max-w-[150px]">
                                            {isTypePDF ? 'Documento PDF' : 'Imagen JPG/PNG'}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}