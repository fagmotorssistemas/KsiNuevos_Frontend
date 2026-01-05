import { useState, useEffect } from "react";
import { Search, Loader2, User, X, Smartphone } from "lucide-react";
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
        }, 400); 

        return () => clearTimeout(timer);
    }, [query]);

    return (
        <div className="relative w-full max-w-lg">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {loading ? (
                        <Loader2 className="h-4 w-4 text-red-600 animate-spin" />
                    ) : (
                        <Search className="h-4 w-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                    )}
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 sm:text-sm transition-all shadow-sm"
                    placeholder="Buscar por Nombre, RUC, Cédula..."
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

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 mt-2 w-full bg-white shadow-2xl rounded-xl border border-slate-100 py-2 max-h-[280px] overflow-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 border-b border-slate-50 mb-1">
                        Resultados coincidentes
                    </div>
                    {results.map((client) => (
                        <button
                            key={client.clienteId}
                            onClick={() => {
                                onSelectClient(client.clienteId);
                                setIsOpen(false);
                                setQuery("");
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-0 group"
                        >
                            <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                                <User className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                                        {client.nombre}
                                    </p>
                                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono self-start">
                                        {client.clienteId}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <p className="text-xs text-slate-500 font-mono">
                                        ID: {client.identificacion} 
                                    </p>
                                    {client.telefono && (
                                        <div className="flex items-center gap-1 text-xs text-emerald-600">
                                            <Smartphone className="h-3 w-3" />
                                            {client.telefono}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            
            {isOpen && results.length === 0 && query.length >= 3 && !loading && (
                <div className="absolute z-50 mt-2 w-full bg-white shadow-lg rounded-xl py-6 text-center border border-slate-100">
                    <p className="text-sm text-slate-500">No encontramos coincidencias para "{query}"</p>
                </div>
            )}
        </div>
    );
}