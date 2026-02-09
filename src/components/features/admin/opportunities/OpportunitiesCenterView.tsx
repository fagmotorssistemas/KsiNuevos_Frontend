import { Button } from "@/components/ui/buttontable";
import { ECUADOR_CAR_DATA } from "@/data/ecuadorCars";
import { scraperService, VehicleWithSeller, WebhookResponse } from "@/services/scraper.service";
import { DatabaseZap, RefreshCw, Search, Car, RefreshCcw, XIcon, X } from "lucide-react";
import { useCallback, useState } from "react";
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

    const handleSubmitScraper = useCallback(async (searchValue: string) => {
        if (!searchValue.trim()) {
            toast.error("Por favor ingresa un término de búsqueda");
            return;
        }

        setIsWebhookLoading(true);

        const scraperPromise = scraperService
            .scrapMarketplace(searchValue)
            .then((response) => {
                if (!response) {
                    throw new Error("Respuesta vacía del scraper");
                }

                if (response.status === "error") {
                    throw new Error(response.message || "Error en el servidor");
                }

                if (response.status === "not found") {
                    throw new Error("NOT_FOUND");
                }

                return response;
            })
            .finally(() => {
                setIsWebhookLoading(false);
                setTimeout(() => {
                    onScraperComplete?.();
                }, 1000);
            });

        toast.promise<WebhookResponse>(scraperPromise, {
            loading: (
                <div className="flex flex-col gap-2 ml-2">
                    <div className="font-semibold text-blue-400 text-sm">
                        Analizando Marketplace...
                    </div>
                    <div className="text-xs text-gray-300">
                        Iniciando scraper y recopilando información
                    </div>
                </div>
            ),

            success: (data) => (
                <div className="flex flex-col gap-2 ml-2">
                    <div className="font-semibold text-green-400 text-sm">
                        ¡Scraper completado con éxito!
                    </div>

                    <div className="text-xs text-gray-300 space-y-1">
                        <div>Vehiculos ingresados: <span className="font-semibold">{data.summary.vehicles.total}</span></div>
                    </div>
                </div>
            ),

            error: (err: any) => (
                <div className="flex flex-col gap-2 ml-2">
                    <div className="font-semibold text-red-400 text-sm">
                        Error en el proceso
                    </div>
                    <div className="text-xs text-gray-300">
                        {err.message === "NOT_FOUND"
                            ? "No se encontraron resultados"
                            : err.message || "Error desconocido"}
                    </div>
                </div>
            ),

            action: {
                label: <XIcon className="h-4 w-4 text-white" />,
                onClick: () => toast.dismiss(),
            },

            actionButtonStyle: {
                backgroundColor: "transparent",
            },
            duration: Infinity,
        });
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
                            className="px-4 py-3 rounded-xl bg-black hover:bg-slate-600 text-white font-medium transition-all border border-slate-600 flex items-center gap-2 whitespace-nowrap shadow-sm hover:shadow-md"
                        >
                            <Car className="h-5 w-5" />
                            <span className="hidden sm:inline">Catálogo</span>
                        </button>

                        <button
                            disabled={isWebhookLoading}
                            onClick={() => handleSubmitScraper(scraperTerm)}
                            className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isWebhookLoading ? (
                                <>
                                    <RefreshCcw className="h-5 w-5 animate-spin" />
                                    <span>Procesando...</span>
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