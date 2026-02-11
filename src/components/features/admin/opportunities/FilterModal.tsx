import { X, Search } from "lucide-react";
import { useState, useMemo, useCallback } from "react";

// Definimos el tipo: puede ser un string simple o un objeto { value, label }
export type FilterOptionType = string | { value: string; label: string };

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    icon: React.ReactNode;
    options: FilterOptionType[];
    selectedValue: string;
    onSelect: (value: string) => void;
    searchPlaceholder?: string;
    allLabel?: string;
    showAllOption?: boolean;
}

export function FilterModal({
    isOpen,
    onClose,
    title,
    description,
    icon,
    options,
    selectedValue,
    onSelect,
    searchPlaceholder = "Buscar...",
    allLabel = "Todas las opciones",
    showAllOption = true,
}: FilterModalProps) {
    const [search, setSearch] = useState("");

    // --- HELPERS ---

    const getOptionValue = useCallback((option: FilterOptionType) => {
        if (typeof option === 'string') return option;
        return option.value;
    }, []);

    const getOptionLabel = useCallback((option: FilterOptionType) => {
        if (typeof option === 'string') return option;
        return option.label;
    }, []);

    // --- CORRECCIÓN DE CAPITALIZACIÓN ---
    const formatText = useCallback((text: string) => {
        if (!text) return "";

        // 1. Reemplazar guiones bajos y medios por espacios
        const cleanText = text.replace(/[-_]/g, " ");

        // 2. Dividir por espacios y capitalizar manualmente cada palabra
        // Esto evita el error con las tildes (ReciéN -> Recién)
        return cleanText
            .split(" ")
            .map(word => {
                if (word.length === 0) return "";
                // Primera letra mayúscula + resto minúscula
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(" ");
    }, []);

    // --- LÓGICA DE FILTRADO ---

    const filteredOptions = useMemo(() => {
        return options.filter(option => {
            const rawLabel = getOptionLabel(option);
            // Buscamos sobre el texto ya formateado para que coincida con lo que ve el usuario
            const formattedLabel = formatText(rawLabel);
            return formattedLabel.toLowerCase().includes(search.toLowerCase());
        });
    }, [options, search, getOptionLabel, formatText]);

    const handleSelect = (val: string) => {
        onSelect(val);
        onClose();
        setSearch("");
    };

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
            setSearch("");
        }
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">

                {/* HEADER */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-200">
                            {icon}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900">{title}</h3>
                            <p className="text-sm text-slate-500">{description}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            onClose();
                            setSearch("");
                        }}
                        className="p-3 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="h-6 w-6 text-slate-400" />
                    </button>
                </div>

                {/* BARRA DE BÚSQUEDA */}
                <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all text-slate-800 font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* CONTENIDO SCROLLABLE */}
                <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">

                        {/* Botón "Todos" / Default */}
                        {showAllOption && !search && (
                            <button
                                onClick={() => handleSelect("all")}
                                className={`p-6 rounded-2xl text-sm font-black transition-all flex items-center justify-center shadow-lg ${
                                    // Ajusta aquí la condición si tu valor por defecto no es "all"
                                    selectedValue === "all" || selectedValue === "created_at_desc"
                                        ? "bg-red-600 border border-red-500 text-white shadow-red-100"
                                        : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-white hover:border-red-500 hover:text-red-600 hover:shadow-xl hover:shadow-red-100"
                                    }`}
                            >
                                {allLabel}
                            </button>
                        )}

                        {/* Opciones */}
                        {filteredOptions.map((option, index) => {
                            const value = getOptionValue(option);
                            const rawLabel = getOptionLabel(option);
                            const displayLabel = formatText(rawLabel);
                            const isSelected = selectedValue === value;

                            return (
                                <button
                                    key={`${value}-${index}`}
                                    onClick={() => handleSelect(value)}
                                    className={`p-6 rounded-2xl text-sm font-bold transition-all hover:shadow-md ${isSelected
                                        ? "bg-red-50 border-2 border-red-500 text-red-600"
                                        : "bg-white border border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900"
                                        }`}
                                >
                                    {displayLabel}
                                </button>
                            );
                        })}
                    </div>

                    {/* Mensaje vacío */}
                    {filteredOptions.length === 0 && (
                        <div className="py-12 text-center text-slate-400">
                            <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>No se encontraron resultados para "{search}"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}