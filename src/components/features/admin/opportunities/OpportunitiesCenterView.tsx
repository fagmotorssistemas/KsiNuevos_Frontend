import { Button } from "@/components/ui/buttontable";
import { ECUADOR_CAR_DATA } from "@/data/ecuadorCars";
import { scraperService, VehicleWithSeller, WebhookResponse } from "@/services/scraper.service";
import { DatabaseZap, RefreshCw, Search, Car, RefreshCcw, XIcon, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface OpportunitiesCenterViewProps {
    onScraperComplete?: () => void;
    isLoading?: boolean;
    topOpportunities: VehicleWithSeller[]
    vehicles: VehicleWithSeller[]
}

export const OpportunitiesCenterView = ({ onScraperComplete, isLoading, topOpportunities, vehicles }: OpportunitiesCenterViewProps) => {
    const [isWebhookLoading, setIsWebhookLoading] = useState(false);
    const [scraperTerm, setScraperTerm] = useState("");
    const [showCarPicker, setShowCarPicker] = useState(false);
    const [pickerBrand, setPickerBrand] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [currentToastId, setCurrentToastId] = useState<string | number | null>(null);

    // Actualizar el toast cuando cambia el progreso
    useEffect(() => {
        if (currentToastId && isWebhookLoading) {
            toast.loading(
                <div className="flex flex-col gap-3 ml-2 w-full pr-4">
                    <div className="flex justify-between items-center">
                        <div className="font-semibold text-red-400 text-sm">Analizando Marketplace...</div>
                        <span className="text-[10px] font-mono text-red-300">{Math.round(progress)}%</span>
                    </div>
                    {/* Barra de progreso visual */}
                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-red-500 h-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="text-[10px] text-gray-400 italic">
                        {progress < 30 && "Iniciando motores de búsqueda..."}
                        {progress >= 30 && progress < 70 && "Recopilando datos de vendedores..."}
                        {progress >= 70 && progress < 100 && "Analizando mejores precios en la región..."}
                        {progress === 100 && "Finalizando proceso..."}
                    </div>
                </div>,
                { id: currentToastId }
            );
        }
    }, [progress, currentToastId, isWebhookLoading]);

    const handleSubmitScraper = useCallback(async (searchValue: string) => {
        if (!searchValue.trim()) {
            toast.error("Por favor ingresa un término de búsqueda");
            return;
        }

        setIsWebhookLoading(true);
        setProgress(0);

        // Crear el toast inicial y guardar su ID
        const toastId = toast.loading(
            <div className="flex flex-col gap-3 ml-2 w-full pr-4">
                <div className="flex justify-between items-center">
                    <div className="font-semibold text-red-400 text-sm">Analizando Marketplace...</div>
                    <span className="text-[10px] font-mono text-red-300">0%</span>
                </div>
                <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                    <div
                        className="bg-red-500 h-full transition-all duration-500 ease-out"
                        style={{ width: '0%' }}
                    />
                </div>
                <div className="text-[10px] text-gray-400 italic">
                    Iniciando motores de búsqueda...
                </div>
            </div>
        );

        setCurrentToastId(toastId);

        // Lógica del Falso Loading (Simula 60 segundos)
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) return prev; // Se queda en 95% hasta que el server responda
                const increment = prev < 70 ? 2 : 0.5; // Va más rápido al inicio, luego lento
                return prev + increment;
            });
        }, 1000); // Actualiza cada segundo

        try {
            const response = await scraperService.scrapMarketplace(searchValue);
            
            if (!response) throw new Error("Respuesta vacía");
            if (response.status === "error") throw new Error(response.message);
            if (response.status === "not found") throw new Error("NOT_FOUND");

            // Completar al 100%
            clearInterval(progressInterval);
            setProgress(100);
            
            // Esperar 1 segundo antes de mostrar el success
            setTimeout(() => {
                toast.success(
                    <div className="flex flex-col gap-1 ml-2">
                        <div className="font-semibold text-green-400 text-sm">¡Extracción completa!</div>
                        <div className="text-xs text-gray-300">
                            Se han procesado <span className="font-bold text-white">{response.summary.vehicles.total}</span> vehículos.
                        </div>
                    </div>,
                    { id: toastId, duration: 4000 }
                );
                
                setIsWebhookLoading(false);
                setCurrentToastId(null);
                
                // Llamar al callback después del success
                setTimeout(() => {
                    onScraperComplete?.();
                    setProgress(0);
                }, 500);
            }, 1000);
            
        } catch (err: any) {
            clearInterval(progressInterval);
            
            toast.error(
                <div className="flex flex-col gap-1 ml-2">
                    <div className="font-semibold text-red-400 text-sm">Error en el proceso</div>
                    <div className="text-xs text-gray-400">{err.message === "NOT_FOUND" ? "Sin resultados" : "Reintenta en un momento"}</div>
                </div>,
                { id: toastId, duration: 4000 }
            );
            
            setIsWebhookLoading(false);
            setCurrentToastId(null);
            setProgress(0);
        }
    }, [onScraperComplete]);

    const handlePickAndScrap = useCallback((brand: string, model?: string) => {
        const term = model ? `${brand} ${model}` : brand;

        setScraperTerm(term);
        setShowCarPicker(false);

        handleSubmitScraper(term);
    }, [handleSubmitScraper]);

    return (
        <div className="bg-white text-black rounded-2xl p-6 shadow-xl">

            {/* Decoración de fondo */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>

            <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <DatabaseZap className="h-6 w-6 text-red-400" />
                            Centro de Oportunidades
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Escanea Marketplace en tiempo real o gestiona el inventario existente.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="link-gray"
                            size="sm"
                            onClick={onScraperComplete}
                            disabled={isLoading}
                            className="bg-black rounded-2xl shadow-xl text-white hover:bg-gray-500 hover:text-white relative"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </Button>
                    </div>
                </div>

                {/* Barra de Búsqueda Principal (Scraper) */}
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-4xl">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-red-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Ej: Toyota Fortuner 2020..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-black rounded-xl focus:ring-2 focus:ring-black-500 focus:border-transparent outline-none text-black placeholder-slate-500 transition-all shadow-inner"
                            value={scraperTerm}
                            onChange={(e) => setScraperTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isWebhookLoading) {
                                    handleSubmitScraper(scraperTerm);
                                }
                            }}
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowCarPicker(!showCarPicker)}
                            disabled={isWebhookLoading}
                            className="px-4 py-3 rounded-xl bg-black hover:bg-slate-600 text-white font-medium transition-all border border-slate-600 flex items-center disabled:opacity-50 disabled:cursor-not-allowed gap-2 whitespace-nowrap shadow-sm hover:shadow-md"
                        >
                            <Car className="h-5 w-5" />
                            <span className="hidden sm:inline">Catálogo</span>
                        </button>

                        <button
                            disabled={isWebhookLoading}
                            onClick={() => handleSubmitScraper(scraperTerm)}
                            className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-lg shadow-red-900/20 disabled:opacity-80 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isWebhookLoading ? (
                                <>
                                    <div className="relative flex items-center justify-center">
                                        <RefreshCcw className="h-5 w-5 animate-spin" />
                                        <span className="absolute text-[8px] font-bold">{Math.round(progress)}</span>
                                    </div>
                                    <span>Escaneando {Math.round(progress)}%</span>
                                </>
                            ) : (
                                <>
                                    <DatabaseZap className="h-5 w-5" />
                                    <span>Escanear</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            {showCarPicker && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setShowCarPicker(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white w-[95%] max-w-4xl rounded-2xl shadow-2xl border border-slate-200 p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col max-h-[85vh]"
                    >
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">
                                    Catálogo de Vehículos
                                </h3>
                                <p className="text-sm text-slate-500">Selecciona una marca y modelo para escanear.</p>
                            </div>
                            <button
                                onClick={() => setShowCarPicker(false)}
                                className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                            {!pickerBrand ? (
                                <>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                                        Marcas Disponibles
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {Object.keys(ECUADOR_CAR_DATA).map((brand) => (
                                            <button
                                                key={brand}
                                                onClick={() => setPickerBrand(brand)}
                                                className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all text-slate-700 shadow-sm"
                                            >
                                                {brand}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10 py-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">{pickerBrand}</span>
                                            <span className="text-xs text-slate-400">Selecciona el modelo</span>
                                        </div>
                                        <button
                                            onClick={() => setPickerBrand(null)}
                                            className="text-xs text-red-600 hover:text-red-800 font-medium hover:underline"
                                        >
                                            ← Volver a marcas
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        <button
                                            onClick={() => handlePickAndScrap(pickerBrand)}
                                            className="px-4 py-3 border-2 border-dashed border-red-300 bg-red-50 text-red-700 rounded-xl text-sm font-bold hover:bg-red-100 transition-all"
                                        >
                                            Todos los {pickerBrand}
                                        </button>

                                        {ECUADOR_CAR_DATA[pickerBrand].map((model) => (
                                            <button
                                                key={model}
                                                onClick={() => handlePickAndScrap(pickerBrand, model)}
                                                className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-600 shadow-sm"
                                            >
                                                {model}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}