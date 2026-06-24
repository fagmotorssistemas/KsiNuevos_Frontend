import { useState, useEffect, useMemo } from "react";
import { 
    Car, 
    Info, 
    Search,
    Loader2,
    Pencil,
    Save,
    Lock,
    DollarSign,
    X,
    Gauge,
} from "lucide-react";
import { VehiculoInventario, MovimientoKardex } from "@/types/inventario.types";
import { inventarioService } from "@/services/inventario.service";
import { useAuth } from "@/hooks/useAuth";
import { VehicleDetailModal } from "./VehicleDetailModal";
import { InventorySellerPicker } from "@/components/features/inventory/InventorySellerPicker";
import { formatRevertCountdown, formatInventoryPrice, isPromoPublicPriceActive, buildPromoReasonFromSeller, isVehicleAvailableForPriceRules } from "@/lib/inventario/inventory-pricing";

function PricingFormField({
    label,
    hint,
    required = false,
    children,
    className = "",
}: {
    label: string;
    hint?: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <div className="min-h-[2.75rem] flex flex-col justify-end">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide leading-snug">
                    {label}
                    {required && <span className="text-red-500 normal-case"> *</span>}
                </span>
                {hint ? (
                    <span className="text-[10px] text-slate-400 normal-case font-normal mt-0.5 leading-snug">
                        {hint}
                    </span>
                ) : (
                    <span className="text-[10px] text-transparent mt-0.5 leading-snug select-none" aria-hidden>
                        &nbsp;
                    </span>
                )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden transition-all focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
                {children}
            </div>
        </div>
    );
}

const PricingInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        className={`w-full h-10 px-3 bg-white focus:bg-blue-50/20 outline-none transition-all text-sm text-slate-800 placeholder:text-slate-400 border-0 ${className}`}
        {...props}
    />
);

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
    const [isCancellingPromo, setIsCancellingPromo] = useState(false);

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
            internalFixedPrice: v.internalFixedPrice != null ? String(v.internalFixedPrice) : '',
            publicPrice:
                v.internalFixedPrice != null
                    ? String(v.price ?? v.internalFixedPrice ?? '')
                    : '',
            publicPriceRequestedBySellerId: v.publicPriceRequestedBy ?? '',
            mileage: v.mileage ? String(v.mileage) : '',
        });
    };

    const pricingAvailable = editingVehiculo
        ? isVehicleAvailableForPriceRules({ stock: editingVehiculo.stock })
        : false;
    const hasInternalFixedPrice = editingVehiculo?.internalFixedPrice != null;
    const internalReferencePrice =
        editForm.internalFixedPrice.trim() !== ''
            ? Number(editForm.internalFixedPrice)
            : editingVehiculo?.internalFixedPrice ?? null;
    const hasInternalReference =
        internalReferencePrice != null &&
        Number.isFinite(internalReferencePrice) &&
        internalReferencePrice > 0;
    const promoActive =
        !!editingVehiculo &&
        isPromoPublicPriceActive({
            price: editingVehiculo.price ?? null,
            internal_fixed_price: editingVehiculo.internalFixedPrice ?? null,
            internal_fixed_price_set_at: editingVehiculo.internalFixedPriceSetAt ?? null,
            public_price_changed_at: editingVehiculo.publicPriceChangedAt ?? null,
            public_price_change_reason: editingVehiculo.publicPriceChangeReason ?? null,
            public_price_reverts_at: editingVehiculo.publicPriceRevertsAt ?? null,
        });
    const publicDiffersFromInternal =
        hasInternalReference &&
        Number(editForm.publicPrice).toFixed(2) !== Number(internalReferencePrice).toFixed(2);
    const publicChangedInForm =
        !!editingVehiculo &&
        Number(editForm.publicPrice).toFixed(2) !== Number(editingVehiculo.price ?? 0).toFixed(2);
    const showSellerPicker = publicDiffersFromInternal && publicChangedInForm;
    const promoRequestedByName = useMemo(() => {
        if (!editingVehiculo?.publicPriceRequestedBy) return null;
        const seller = activeSellers.find((s) => s.id === editingVehiculo.publicPriceRequestedBy);
        return seller?.full_name?.trim() || null;
    }, [editingVehiculo?.publicPriceRequestedBy, activeSellers]);

    const handleCancelPromo = async () => {
        if (!isAdmin || !editingVehiculo || !pricingAvailable || !promoActive) return;
        if (
            !window.confirm(
                '¿Cancelar la promo y volver el precio público al interno fijo? Quedará registrado en el historial.'
            )
        ) {
            return;
        }

        setIsCancellingPromo(true);
        try {
            const result = await inventarioService.cancelPublicPromo(editingVehiculo.placa);
            const updated: VehiculoInventario = {
                ...editingVehiculo,
                price: result.price,
                publicPriceChangedAt: null,
                publicPriceChangeReason: null,
                publicPriceRevertsAt: null,
                publicPriceRequestedBy: null,
            };
            setVehiculos((prev) =>
                prev.map((v) => (v.placa === editingVehiculo.placa ? updated : v))
            );
            setEditingVehiculo(updated);
            setEditForm((prev) => ({
                ...prev,
                publicPrice: String(result.price),
                publicPriceRequestedBySellerId: '',
            }));
            alert('Promo cancelada. Precio público alineado al interno fijo.');
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : 'No se pudo cancelar la promo');
        } finally {
            setIsCancellingPromo(false);
        }
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
                const publicPrice = editForm.publicPrice ? Number(editForm.publicPrice) : NaN;
                const currentPublic = Number((editingVehiculo.price ?? 0).toFixed(2));
                const publicChangedInForm =
                    Number.isFinite(publicPrice) &&
                    Number(publicPrice.toFixed(2)) !== currentPublic;
                const internalChanged =
                    editingVehiculo.internalFixedPrice != null &&
                    internalPrice > 0 &&
                    Number(internalPrice.toFixed(2)) !==
                        Number(editingVehiculo.internalFixedPrice.toFixed(2));
                const settingInternalForFirstTime =
                    editingVehiculo.internalFixedPrice == null && internalPrice > 0;
                const hasPriceChanges =
                    settingInternalForFirstTime || internalChanged || publicChangedInForm;

                if (hasPriceChanges) {
                    if (editingVehiculo.internalFixedPrice == null && internalPrice <= 0) {
                        throw new Error('Registra el precio interno fijo antes de cambiar precios');
                    }

                    let currentFixed = Number(editingVehiculo.internalFixedPrice ?? 0);

                    if (settingInternalForFirstTime) {
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

                        await inventarioService.updateMileage(editingVehiculo.placa, mileage);

                        setVehiculos((prev) =>
                            prev.map((v) => (v.placa === editingVehiculo.placa ? nextVehicle : v))
                        );
                        setEditingVehiculo(nextVehicle);
                        setEditForm((prev) => ({
                            ...prev,
                            internalFixedPrice: String(result.internalFixedPrice),
                            publicPrice: String(result.price),
                            publicPriceRequestedBySellerId: '',
                        }));
                        alert(
                            'Precio interno fijo registrado. Ya puedes ajustar el precio público si lo necesitas.'
                        );
                        return;
                    }

                    if (internalChanged) {
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

                    if (publicChangedInForm) {
                        if (!Number.isFinite(publicPrice) || publicPrice <= 0) {
                            throw new Error('Ingresa el precio público');
                        }

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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between gap-3 pb-4 mb-5 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                                    Editar Datos Comerciales
                                </h3>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    {editingVehiculo.marca} {editingVehiculo.modelo}
                                </p>
                            </div>
                            <span className="shrink-0 font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                                {editingVehiculo.placa}
                            </span>
                        </div>

                        {!pricingAvailable && (
                            <p className="text-xs text-slate-600 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5 mb-5">
                                Vehículo no disponible: solo puedes actualizar el kilometraje. Las reglas de precio no aplican.
                            </p>
                        )}
                        
                        <div className="space-y-5">
                            {pricingAvailable && (
                                <section className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50/90 to-white p-5 space-y-5">
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                            Precios del vehículo
                                        </p>
                                        <p className="text-xs text-slate-500 leading-relaxed rounded-lg bg-white/80 border border-slate-100 px-3 py-2.5">
                                            {hasInternalFixedPrice ? (
                                                <>
                                                    El <strong className="text-slate-700">precio interno fijo</strong> es la referencia de ventas.
                                                    El <strong className="text-slate-700">precio público</strong> lo ve el cliente en la web.
                                                    Si difieren, indica el vendedor; en 5 días vuelve al interno fijo.
                                                </>
                                            ) : (
                                                <>
                                                    Primero registra el <strong className="text-slate-700">precio interno fijo</strong>.
                                                    Al guardar se habilitará el precio público.
                                                </>
                                            )}
                                        </p>
                                    </div>

                                    <div
                                        className={
                                            hasInternalFixedPrice
                                                ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 items-end'
                                                : 'max-w-sm'
                                        }
                                    >
                                        <PricingFormField label="Interno fijo" hint="Referencia ventas">
                                            <div className="relative flex items-center">
                                                <DollarSign className="absolute left-3 text-slate-400 h-4 w-4 pointer-events-none" />
                                                <PricingInput
                                                    type="number"
                                                    className="pl-9 font-mono font-semibold text-slate-800 tabular-nums"
                                                    value={editForm.internalFixedPrice}
                                                    onChange={(e) => {
                                                        const nextInternal = e.target.value;
                                                        if (!hasInternalFixedPrice) {
                                                            setEditForm({
                                                                ...editForm,
                                                                internalFixedPrice: nextInternal,
                                                            });
                                                            return;
                                                        }
                                                        const baselineInternal =
                                                            editForm.internalFixedPrice ||
                                                            String(editingVehiculo.internalFixedPrice ?? '');
                                                        const wasAligned =
                                                            Number(editForm.publicPrice).toFixed(2) ===
                                                            Number(baselineInternal).toFixed(2);
                                                        setEditForm({
                                                            ...editForm,
                                                            internalFixedPrice: nextInternal,
                                                            publicPrice:
                                                                wasAligned && nextInternal
                                                                    ? nextInternal
                                                                    : editForm.publicPrice,
                                                        });
                                                    }}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </PricingFormField>

                                        {hasInternalFixedPrice && (
                                            <PricingFormField label="Precio público" hint="Cliente / web">
                                                <div className="relative flex items-center">
                                                    <DollarSign className="absolute left-3 text-emerald-500/70 h-4 w-4 pointer-events-none" />
                                                    <PricingInput
                                                        type="number"
                                                        className="pl-9 font-mono font-semibold text-emerald-700 tabular-nums"
                                                        value={editForm.publicPrice}
                                                        onChange={(e) =>
                                                            setEditForm({
                                                                ...editForm,
                                                                publicPrice: e.target.value,
                                                            })
                                                        }
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </PricingFormField>
                                        )}
                                    </div>

                                    {promoActive && (
                                        <div className="relative rounded-xl border border-violet-200/80 bg-violet-50 px-3.5 py-3 pr-11 text-xs text-violet-900">
                                            <span className="font-semibold">Promo activa</span>
                                            {editingVehiculo.publicPriceRevertsAt && (
                                                <span className="block text-violet-600 mt-1">
                                                    {formatRevertCountdown(editingVehiculo.publicPriceRevertsAt)}
                                                    {editingVehiculo.publicPriceChangedAt && (
                                                        <>
                                                            {' · '}
                                                            Cambió el{' '}
                                                            {new Date(
                                                                editingVehiculo.publicPriceChangedAt
                                                            ).toLocaleDateString('es-EC')}
                                                        </>
                                                    )}
                                                </span>
                                            )}
                                            {promoRequestedByName && (
                                                <span className="block text-violet-600 mt-0.5">
                                                    Solicitado por: {promoRequestedByName}
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={handleCancelPromo}
                                                disabled={isCancellingPromo || saving}
                                                className="absolute top-2.5 right-2.5 p-1 rounded-md text-violet-500 hover:text-violet-900 hover:bg-violet-100/80 transition-colors disabled:opacity-50"
                                                title="Cancelar promo y volver al precio interno fijo"
                                                aria-label="Cancelar promo"
                                            >
                                                {isCancellingPromo ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <X className="h-3.5 w-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {hasInternalReference && showSellerPicker && (
                                        <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">
                                                    Vendedor que solicitó la promo
                                                    <span className="text-red-500 normal-case"> *</span>
                                                </span>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    Requerido cuando el precio público difiere del interno fijo.
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-white overflow-visible shadow-sm">
                                                <InventorySellerPicker
                                                    sellers={activeSellers}
                                                    value={editForm.publicPriceRequestedBySellerId}
                                                    onChange={(id) =>
                                                        setEditForm({
                                                            ...editForm,
                                                            publicPriceRequestedBySellerId: id,
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                    )}
                                </section>
                            )}

                            <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                                <PricingFormField label="Kilometraje" hint="Odómetro actual">
                                    <div className="relative flex items-center">
                                        <Gauge className="absolute left-3 text-slate-400 h-4 w-4 pointer-events-none" />
                                        <PricingInput
                                            type="number"
                                            className="pl-9 pr-12 font-mono font-semibold text-slate-800 tabular-nums"
                                            value={editForm.mileage}
                                            onChange={(e) => setEditForm({ ...editForm, mileage: e.target.value })}
                                            placeholder="0"
                                        />
                                        <span className="absolute right-3 text-[10px] font-bold uppercase tracking-wide text-slate-400 pointer-events-none">
                                            km
                                        </span>
                                    </div>
                                </PricingFormField>
                            </section>
                        </div>

                        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                            <button 
                                type="button"
                                onClick={() => setEditingVehiculo(null)}
                                className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button"
                                onClick={handleSaveCommercial}
                                disabled={saving || isCancellingPromo}
                                className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
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