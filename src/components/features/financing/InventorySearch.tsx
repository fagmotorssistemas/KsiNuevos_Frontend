import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, ChevronDown, Car, Loader2 } from "lucide-react";
import { InputGroup, formatCurrency, InventoryCarRow } from "./FinancingUtils";

interface InventorySearchProps {
    inventory: InventoryCarRow[];
    selectedVehicle: InventoryCarRow | null;
    onSelect: (car: InventoryCarRow) => void;
    onClear: () => void;
    isLoading: boolean;
}

export const InventorySearch = ({ inventory, selectedVehicle, onSelect, onClear, isLoading }: InventorySearchProps) => {
    const [searchTerm, setSearchTerm] = useState(selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : "");
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filtered = useMemo(() => {
        const safeInventory = inventory || [];
        
        if (!searchTerm) return safeInventory;
        
        const q = searchTerm.toLowerCase();
        return safeInventory.filter(c =>
            c.brand?.toLowerCase().includes(q) ||
            c.model?.toLowerCase().includes(q) ||
            c.plate?.toLowerCase().includes(q) || 
            c.year?.toString().includes(q)
        );
    }, [searchTerm, inventory]);

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
        <div ref={dropdownRef} className="relative z-30">
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

            {isOpen && !isLoading && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto z-50">
                    <ul className="py-2">
                        <li className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-slate-400 text-xs border-b border-slate-50" onClick={() => { onClear(); setSearchTerm(""); setIsOpen(false); }}>
                            -- No asignar vehículo específico --
                        </li>
                        {filtered.length > 0 ? (
                            filtered.map(car => (
                                <li key={car.id} onClick={() => { onSelect(car); setIsOpen(false); }} className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center group border-b border-slate-50 last:border-0">
                                    <div>
                                        <div className="text-sm font-bold text-slate-800">{car.brand} {car.model}</div>
                                        <div className="text-[10px] text-slate-500 uppercase flex gap-2">
                                            <span className="bg-slate-100 px-1 rounded">Año {car.year}</span>
                                            <span>{car.color || 'N/A'}</span> 
                                            <span className=" text-slate-600">{car.plate || 'S/PLACA'}</span>
                                        </div>
                                    </div>
                                    <div className="text-xs font-bold text-slate-900 bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100">
                                        {formatCurrency(car.price)}
                                    </div>
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-3 text-sm text-slate-400 text-center">No se encontraron vehículos</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};