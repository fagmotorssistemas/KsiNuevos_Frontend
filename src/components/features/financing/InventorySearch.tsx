import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, ChevronDown, Car, Loader2 } from "lucide-react";
import { InputGroup, formatCurrency, InventoryCarRow } from "./FinancingUtils";
import { carMatchesInventorySearch } from "@/lib/inventario/inventorySearch";
import { slugifyVehicleText } from "@/lib/inventario/vehicle-public-slug";

interface InventorySearchProps {
    inventory: InventoryCarRow[];
    selectedVehicle: InventoryCarRow | null;
    onSelect: (car: InventoryCarRow) => void;
    onClear: () => void;
    isLoading: boolean;
    compact?: boolean;
    onBrowseBrand?: (brand: string) => void;
}

function displayCaps(value?: string | null) {
    const text = value?.trim();
    return text ? text.toUpperCase() : "";
}

function uniqueBrands(inventory: InventoryCarRow[]) {
    const seen = new Map<string, string>();
    for (const car of inventory) {
        const label = car.brand?.trim();
        if (!label) continue;
        const slug = slugifyVehicleText(label);
        if (slug && !seen.has(slug)) seen.set(slug, label);
    }
    return [...seen.values()];
}

function matchBrandFromQuery(inventory: InventoryCarRow[], query: string) {
    const qSlug = slugifyVehicleText(query);
    if (!qSlug) return null;
    const brands = uniqueBrands(inventory);
    const exact = brands.filter((brand) => slugifyVehicleText(brand) === qSlug);
    if (exact.length === 1) return exact[0];
    const prefix = brands.filter((brand) => slugifyVehicleText(brand).startsWith(qSlug));
    if (prefix.length === 1) return prefix[0];
    return null;
}

export const InventorySearch = ({ inventory, selectedVehicle, onSelect, onClear, isLoading, compact = false, onBrowseBrand }: InventorySearchProps) => {
    const [searchTerm, setSearchTerm] = useState(selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : "");
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filtered = useMemo(() => {
        const safeInventory = inventory || [];
        const q = searchTerm.trim();
        if (!q) return safeInventory;
        return safeInventory.filter((car) => carMatchesInventorySearch(car, q));
    }, [searchTerm, inventory]);

    const matchedBrand = useMemo(
        () => (compact && onBrowseBrand ? matchBrandFromQuery(inventory || [], searchTerm) : null),
        [compact, onBrowseBrand, inventory, searchTerm]
    );

    const goToBrand = (brand: string) => {
        onBrowseBrand?.(brand);
        setIsOpen(false);
    };

    const handleCompactKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (matchedBrand) {
            goToBrand(matchedBrand);
        }
    };

    useEffect(() => {
        if(selectedVehicle) {
            setSearchTerm(`${selectedVehicle.brand} ${selectedVehicle.model}`);
        } else {
            setSearchTerm("");
        }
    }, [selectedVehicle]);

    useEffect(() => {
        const checkClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", checkClick);
        return () => document.removeEventListener("mousedown", checkClick);
    }, []);

    return (
        <div ref={dropdownRef} className={`relative ${compact ? 'z-50' : 'z-30'}`}>
            {compact ? (
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </div>
                    <input
                        type="text"
                        className="w-full h-10 pl-9 pr-10 bg-neutral-50 border border-neutral-200 rounded-full outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm text-neutral-900"
                        placeholder={isLoading ? "Cargando..." : "Buscar auto..."}
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
                        onFocus={() => setIsOpen(true)}
                        onKeyDown={handleCompactKeyDown}
                        disabled={isLoading}
                        aria-label="Buscar vehículo"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {searchTerm ? (
                            <X className="h-4 w-4 text-neutral-400 cursor-pointer hover:text-red-500" onClick={() => { setSearchTerm(""); onClear(); }} />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-neutral-400" />
                        )}
                    </div>
                </div>
            ) : (
            <InputGroup label="Vehículo del Inventario" icon={Car}>
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </div>
                    <input
                        type="text"
                        className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                        placeholder={isLoading ? "Cargando inventario..." : "Buscar por placa, marca o modelo..."}
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
                        onFocus={() => setIsOpen(true)}
                        disabled={isLoading}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {searchTerm ? (
                            <X className="h-4 w-4 text-slate-400 cursor-pointer hover:text-red-500" onClick={() => { setSearchTerm(""); onClear(); }} />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                    </div>
                </div>
            </InputGroup>
            )}

            {isOpen && !isLoading && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto z-[60]">
                    <ul className="py-2">
                        {!compact && (
                        <li className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-slate-400 text-xs border-b border-slate-50" onClick={() => { onClear(); setSearchTerm(""); setIsOpen(false); }}>
                            -- No asignar vehículo específico --
                        </li>
                        )}
                        {matchedBrand ? (
                            <li
                                onClick={() => goToBrand(matchedBrand)}
                                className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-slate-50"
                            >
                                <div className="text-sm font-bold uppercase tracking-tight text-red-700">
                                    Ver todos los {displayCaps(matchedBrand)}
                                </div>
                                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                                    Ir al inventario de la marca
                                </div>
                            </li>
                        ) : null}
                        {filtered.length > 0 ? (
                            filtered.map(car => (
                                <li key={car.id} onClick={() => { onSelect(car); setIsOpen(false); }} className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center group border-b border-slate-50 last:border-0">
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                                            {displayCaps(car.brand)} {displayCaps(car.model)}
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase flex gap-2">
                                            <span className="bg-slate-100 px-1 rounded">Año {car.year}</span>
                                            <span>{displayCaps(car.color) || "N/A"}</span>
                                            <span className=" text-slate-600">{displayCaps(car.plate) || "S/PLACA"}</span>
                                        </div>
                                    </div>
                                    {!compact ? (
                                        <div className="text-xs font-bold bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100">
                                            {formatCurrency(car.price || 0)}
                                        </div>
                                    ) : null}
                                </li>
                            ))
                        ) : matchedBrand ? null : (
                            <li className="px-4 py-3 text-sm text-slate-400 text-center">No se encontraron vehículos</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};