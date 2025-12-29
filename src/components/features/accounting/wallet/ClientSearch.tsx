import { useState, useEffect } from "react";
import { Search, Loader2, User, X } from "lucide-react";
import { ClienteBusqueda } from "@/types/wallet.types";
import { walletService } from "@/services/wallet.service";

interface ClientSearchProps {
    onSelectClient: (clienteId: number) => void;
}

export function ClientSearch({ onSelectClient }: ClientSearchProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<ClienteBusqueda[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // Debounce manual simple
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 3) {
                setLoading(true);
                try {
                    const data = await walletService.searchClients(query);
                    setResults(data);
                    setIsOpen(true);
                } catch (error) {
                    console.error("Error buscando:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 500); // Espera 500ms después de que dejes de escribir

        return () => clearTimeout(timer);
    }, [query]);

    return (
        <div className="relative w-full max-w-md">
            {/* Input Field */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {loading ? (
                        <Loader2 className="h-4 w-4 text-red-500 animate-spin" />
                    ) : (
                        <Search className="h-4 w-4 text-slate-400" />
                    )}
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm transition-all shadow-sm"
                    placeholder="Buscar cliente por nombre o cédula..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 3 && setIsOpen(true)}
                />
                {query.length > 0 && (
                    <button
                        onClick={() => {
                            setQuery("");
                            setIsOpen(false);
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                        <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                    </button>
                )}
            </div>

            {/* Dropdown de Resultados */}
            {isOpen && results.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-xl rounded-lg border border-slate-100 py-1 max-h-60 overflow-auto">
                    <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                        Resultados encontrados
                    </div>
                    {results.map((client) => (
                        <button
                            key={client.clienteId}
                            onClick={() => {
                                onSelectClient(client.clienteId);
                                setIsOpen(false);
                                setQuery(""); // Opcional: limpiar al seleccionar
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 border-b border-slate-50 last:border-0"
                        >
                            <div className="h-8 w-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                                <User className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900 line-clamp-1">
                                    {client.nombre}
                                </p>
                                <p className="text-xs text-slate-500">
                                    ID: {client.identificacion} 
                                    {client.telefono && ` • 📞 ${client.telefono}`}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            
            {isOpen && results.length === 0 && query.length >= 3 && !loading && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md py-4 text-center border border-slate-100">
                    <p className="text-sm text-slate-500">No se encontraron clientes.</p>
                </div>
            )}
        </div>
    );
}