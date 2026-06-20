import { useState, useEffect } from "react";
import { 
    Car, 
    Info, 
    Search,
    Loader2,
    Pencil,
    Save,
    Lock
} from "lucide-react";
import { VehiculoInventario, MovimientoKardex } from "@/types/inventario.types";
import { inventarioService } from "@/services/inventario.service";
import { useAuth } from "@/hooks/useAuth";
import { VehicleDetailModal } from "./VehicleDetailModal";
import { formatRevertCountdown, formatInventoryPrice, isPromoPublicPriceActive, buildPromoReasonFromSeller } from "@/lib/inventario/inventory-pricing";

/** Del historial kardex obtiene el precio al que se vendió (NOTA DE ENTREGA o último egreso). Mismo dato que el $ en el modal. */
function getPrecioVentaFromHistorial(historial: MovimientoKardex[]): number | null {
    if (!historial?.length) return null;
    const notaEntrega = historial.find(m => m.tipoTransaccion?.toUpperCase().includes("NOTA DE ENTREGA"));
    if (notaEntrega != null) return notaEntrega.total;
    const egresos = historial.filter(m => !m.esIngreso);
    return egresos.length ? egresos[egresos.length - 1].total : null;
}

interface InventarioTableProps {
    vehiculos: VehiculoInventario[];
}

export function InventarioTable({ vehiculos: initialVehiculos }: InventarioTableProps) {
    const { role } = useAuth();
    const isAdmin = role === "admin";

    // Estado local de vehículos para reflejar cambios sin recargar página
    const [vehiculos, setVehiculos] = useState(initialVehiculos); 
    
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedVehiculo, setSelectedVehiculo] = useState<VehiculoInventario | null>(null);
    
    // --- NUEVOS ESTADOS PARA EDICIÓN ---
    const [editingVehiculo, setEditingVehiculo] = useState<VehiculoInventario | null>(null);
    const [editForm, setEditForm] = useState({
        internalFixedPrice: '',
        publicPrice: '',
        publicPriceRequestedBySellerId: '',
        mileage: '',
    });
    const [activeSellers, setActiveSellers] = useState<{ id: string; full_name: string | null }[]>([]);
    const [saving, setSaving] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setVehiculos(initialVehiculos);
        setCurrentPage(1); // Resetear a página 1 cuando cambian los datos
    }, [initialVehiculos]);

    useEffect(() => {
        if (!isAdmin) return;
        inventarioService
            .listActiveSellers()
            .then(setActiveSellers)
            .catch(() => setActiveSellers([]));
    }, [isAdmin]);

    // --- Cargar "Vendido en" desde la misma API que el modal (getDetalleVehiculo → historial)
    useEffect(() => {
        const vendidos = initialVehiculos.filter(v => v.stock === 0);
        if (vendidos.length === 0) return;
        const CONCURRENCY = 5;
        (async () => {
            const byPlaca: Record<string, number> = {};
            for (let i = 0; i < vendidos.length; i += CONCURRENCY) {
                const batch = vendidos.slice(i, i + CONCURRENCY);
                const results = await Promise.all(
                    batch.map(async (v) => {
                        try {
                            const data = await inventarioService.getDetalleVehiculo(v.placa);
                            const precio = getPrecioVentaFromHistorial(data.historialMovimientos || []);
                            return { placa: v.placa, precio };
                        } catch {
                            return { placa: v.placa, precio: null };
                        }
                    })
                );
                results.forEach(({ placa, precio }) => { if (precio != null) byPlaca[placa] = precio; });
            }
            if (Object.keys(byPlaca).length > 0) {
                setVehiculos(prev => prev.map(v => ({ ...v, precioVenta: v.precioVenta ?? byPlaca[v.placa] ?? null })));
            }
        })();
    }, [initialVehiculos]);

    // --- LÓGICA DE EDICIÓN (SUPABASE) ---
    const handleEditClick = (v: VehiculoInventario) => {
        if (!isAdmin) return;
        setEditingVehiculo(v);
        setEditForm({
            internalFixedPrice: v.internalFixedPrice ? String(v.internalFixedPrice) : '',
            publicPrice: v.price ? String(v.price) : '',
            publicPriceRequestedBySellerId: v.publicPriceRequestedBy ?? '',
            mileage: v.mileage ? String(v.mileage) : '',
        });
    };

    const handleSaveCommercial = async () => {
        if (!isAdmin || !editingVehiculo) return;
        setSaving(true);
        try {
            const mileage = editForm.mileage ? Number(editForm.mileage) : 0;
            const isAvailable = editingVehiculo.stock > 0;
            let nextVehicle: VehiculoInventario = { ...editingVehiculo, mileage };

            if (isAvailable) {
                const internalPrice = editForm.internalFixedPrice ? Number(editForm.internalFixedPrice) : 0;
                if (!internalPrice) {
                    throw new Error('Registra el precio interno fijo antes de continuar');
                }

                let currentFixed = Number(editingVehiculo.internalFixedPrice ?? 0);
                const internalChanged =
                    editingVehiculo.internalFixedPrice != null
                        ? Number(internalPrice.toFixed(2)) !==
                          Number(editingVehiculo.internalFixedPrice.toFixed(2))
                        : true;

                if (editingVehiculo.internalFixedPrice == null) {
                    const result = await inventarioService.setInternalFixedPrice(
                        editingVehiculo.placa,
                        internalPrice
                    );
                    nextVehicle = {
                        ...nextVehicle,
                        internalFixedPrice: result.internalFixedPrice,
                        internalFixedPriceSetAt: result.internalFixedPriceSetAt,
                        price: result.price,
                        publicPriceChangedAt: null,
                        publicPriceChangeReason: null,
                        publicPriceRevertsAt: null,
                        publicPriceRequestedBy: null,
                    };
                    currentFixed = result.internalFixedPrice;
                } else if (internalChanged) {
                    const result = await inventarioService.setInternalFixedPrice(
                        editingVehiculo.placa,
                        internalPrice
                    );
                    nextVehicle = {
                        ...nextVehicle,
                        internalFixedPrice: result.internalFixedPrice,
                        price: result.price,
                        ...(result.syncedPublic
                            ? {
                                  publicPriceChangedAt: null,
                                  publicPriceChangeReason: null,
                                  publicPriceRevertsAt: null,
                                  publicPriceRequestedBy: null,
                              }
                            : {}),
                    };
                    currentFixed = result.internalFixedPrice;
                }

                const publicPrice = editForm.publicPrice ? Number(editForm.publicPrice) : 0;
                if (!publicPrice) {
                    throw new Error('Ingresa el precio público');
                }

                const currentPublic = Number((editingVehiculo.price ?? 0).toFixed(2));
                const publicChangedInForm =
                    Number(publicPrice.toFixed(2)) !== currentPublic;

                if (publicChangedInForm) {
                    const changingPublic =
                        Number(publicPrice.toFixed(2)) !== Number(currentFixed.toFixed(2));
                    if (changingPublic && !editForm.publicPriceRequestedBySellerId.trim()) {
                        throw new Error('Selecciona el vendedor que solicitó el precio promocional');
                    }
                    const sellerName = activeSellers.find(
                        (s) => s.id === editForm.publicPriceRequestedBySellerId
                    )?.full_name;
                    const result = await inventarioService.updatePublicPrice(
                        editingVehiculo.placa,
                        publicPrice,
                        changingPublic
                            ? buildPromoReasonFromSeller(sellerName)
                            : 'Alineado al precio interno fijo',
                        changingPublic ? editForm.publicPriceRequestedBySellerId : null
                    );
                    nextVehicle = {
                        ...nextVehicle,
                        price: result.price,
                        publicPriceChangedAt: result.publicPriceChangedAt,
                        publicPriceChangeReason: result.publicPriceChangeReason,
                        publicPriceRevertsAt: result.publicPriceRevertsAt,
                        publicPriceRequestedBy: result.publicPriceRequestedBy,
                    };
                }
            }

            await inventarioService.updateMileage(editingVehiculo.placa, mileage);

            setVehiculos(prev =>
                prev.map(v => (v.placa === editingVehiculo.placa ? nextVehicle : v))
            );

            alert("Datos actualizados correctamente");
            setEditingVehiculo(null);
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Error al actualizar en Supabase");
        } finally {
            setSaving(false);
        }
    };

    // --- LÓGICA DE CARGA DE HISTORIAL (DETALLE) ---
    const handleOpenModal = (vehiculo: VehiculoInventario) => {
        setSelectedVehiculo(vehiculo);
    };

    // Filtrado
    const filteredVehiculos = vehiculos.filter(v => 
        (v.marca?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (v.modelo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (v.placa?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (v.chasis?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    // Paginación
    const totalPages = Math.ceil(filteredVehiculos.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentVehiculos = filteredVehiculos.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div>
            {/* Barra de Búsqueda */}
            <div className="flex items-center gap-3 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <Search className="h-5 w-5 text-slate-400" />
                <input 
                    type="text"
                    placeholder="Buscar por placa, marca, modelo o chasis..."
                    className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                    }}
                />
            </div>

            {/* Tabla Principal */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Vehículo</th>
                            <th className="px-4 py-3 font-semibold">Placa / ID</th>
                            <th className="px-4 py-3 font-semibold">Año / Color</th>
                            <th className="px-4 py-3 font-semibold">Precio interno</th>
                            <th className="px-4 py-3 font-semibold">Precio público</th>
                            <th className="px-4 py-3 font-semibold">Vendido en</th>
                            <th className="px-4 py-3 font-semibold">Kilometraje</th>
                            <th className="px-4 py-3 font-semibold text-center">Estado</th>
                            <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentVehiculos.length > 0 ? (
                            currentVehiculos.map((v) => (
                                <tr key={v.proId} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                <Car className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">{v.marca} {v.modelo}</div>
                                                <div className="text-xs text-slate-500">{v.tipo}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded w-fit">
                                            {v.placa}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        <div>{v.anioModelo || '-'}</div>
                                        <div className="text-xs text-slate-400 capitalize">{v.color?.toLowerCase()}</div>
                                    </td>
                                    
                                    <td className="px-4 py-3 font-medium text-slate-800">
                                        {v.internalFixedPrice != null ? (
                                            <div className="flex items-center gap-1">
                                                <Lock className="h-3 w-3 text-slate-400" />
                                                <span>{formatInventoryPrice(v.internalFixedPrice)}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                                                Sin fijar
                                            </span>
                                        )}
                                    </td>

                                    <td className="px-4 py-3 font-medium text-emerald-600">
                                        <div>{formatInventoryPrice(v.price ?? null)}</div>
                                        {isPromoPublicPriceActive({
                                            price: v.price ?? null,
                                            internal_fixed_price: v.internalFixedPrice ?? null,
                                            internal_fixed_price_set_at: v.internalFixedPriceSetAt ?? null,
                                            public_price_changed_at: v.publicPriceChangedAt ?? null,
                                            public_price_change_reason: v.publicPriceChangeReason ?? null,
                                            public_price_reverts_at: v.publicPriceRevertsAt ?? null,
                                        }) && (
                                            <div className="text-[10px] text-violet-600 font-normal mt-0.5 max-w-[140px]">
                                                {v.publicPriceRevertsAt && (
                                                    <span className="block text-slate-400">
                                                        {formatRevertCountdown(v.publicPriceRevertsAt)}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    {/* COLUMNA VENDIDO EN (precio al que se vendió, desde kardex) */}
                                    <td className="px-4 py-3 font-medium text-slate-700">
                                        ${v.precioVenta != null
                                            ? `${v.precioVenta.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                            : ''}
                                    </td>

                                    {/* COLUMNA KILOMETRAJE */}
                                    <td className="px-4 py-3 text-slate-600">
                                        {v.mileage?.toLocaleString()} km
                                    </td>

                                    <td className="px-4 py-3 text-center">
                                        {v.stock > 0 ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                En Stock
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                                Baja/Vendido
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {isAdmin && (
                                                <button 
                                                    onClick={() => handleEditClick(v)}
                                                    className="text-orange-500 hover:text-orange-700 hover:bg-orange-50 p-2 rounded-lg transition-all"
                                                    title="Editar Precio/KM"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                            )}

                                            {/* BOTÓN DETALLE */}
                                            <button 
                                                onClick={() => handleOpenModal(v)}
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-all"
                                                title="Ver Detalle"
                                            >
                                                <Info className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                                    No se encontraron vehículos.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 border-t border-slate-100 pt-4">
                     <span className="text-xs text-slate-500">
                        Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredVehiculos.length)} de {filteredVehiculos.length}
                    </span>
                    <div className="flex gap-2">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="px-3 py-1 text-xs border rounded hover:bg-slate-50 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="px-3 py-1 text-xs border rounded hover:bg-slate-50 disabled:opacity-50"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}

            {/* === MODAL DE EDICIÓN DE PRECIO/KM === */}
            {isAdmin && editingVehiculo && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Editar Datos Comerciales</h3>
                        <p className="text-sm text-slate-500 mb-4">{editingVehiculo.marca} {editingVehiculo.modelo} - {editingVehiculo.placa}</p>

                        {editingVehiculo.stock <= 0 && (
                            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-4">
                                Vehículo vendido: solo puedes actualizar el kilometraje. Las reglas de precio no aplican.
                            </p>
                        )}
                        
                        <div className="space-y-4">
                            {editingVehiculo.stock > 0 && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Precio interno fijo ($)
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editForm.internalFixedPrice}
                                            onChange={(e) => {
                                                const nextInternal = e.target.value;
                                                const wasAligned =
                                                    editingVehiculo.internalFixedPrice == null ||
                                                    Number(editForm.publicPrice).toFixed(2) ===
                                                        Number(editingVehiculo.internalFixedPrice).toFixed(2);
                                                setEditForm({
                                                    ...editForm,
                                                    internalFixedPrice: nextInternal,
                                                    publicPrice:
                                                        wasAligned && nextInternal
                                                            ? nextInternal
                                                            : editForm.publicPrice,
                                                });
                                            }}
                                            placeholder="Precio de referencia para ventas"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Precio público ($)</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editForm.publicPrice}
                                            onChange={e => setEditForm({...editForm, publicPrice: e.target.value})}
                                            placeholder="Precio visible al cliente"
                                        />
                                    </div>
                                    {editForm.publicPrice &&
                                        editForm.internalFixedPrice &&
                                        Number(editForm.publicPrice).toFixed(2) !==
                                            Number(editForm.internalFixedPrice).toFixed(2) &&
                                        Number(editForm.publicPrice).toFixed(2) !==
                                            Number(editingVehiculo.price ?? 0).toFixed(2) && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Vendedor que solicitó la promo
                                            </label>
                                            <select
                                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                value={editForm.publicPriceRequestedBySellerId}
                                                onChange={e => setEditForm({...editForm, publicPriceRequestedBySellerId: e.target.value})}
                                            >
                                                <option value="">Seleccionar vendedor…</option>
                                                {activeSellers.map((seller) => (
                                                    <option key={seller.id} value={seller.id}>
                                                        {seller.full_name?.trim() || 'Sin nombre'}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-[11px] text-slate-400 mt-1">
                                                En 5 días el precio público vuelve automáticamente al interno fijo.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Kilometraje Actual</label>
                                <input 
                                    type="number" 
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editForm.mileage}
                                    onChange={e => setEditForm({...editForm, mileage: e.target.value})}
                                    placeholder="Ingrese el kilometraje"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={() => setEditingVehiculo(null)}
                                className="flex-1 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveCommercial}
                                disabled={saving}
                                className="flex-1 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedVehiculo && (
                <VehicleDetailModal
                    vehiculo={selectedVehiculo}
                    onClose={() => setSelectedVehiculo(null)}
                    onPrecioVenta={(placa, precioVenta) => {
                        setVehiculos((prev) => prev.map((v) => (v.placa === placa ? { ...v, precioVenta } : v)))
                    }}
                />
            )}
        </div>
    );
}