import { useState, useEffect } from "react";
import { 
    Car, 
    Info, 
    Tag, 
    Calendar, 
    Fuel, 
    Cog, 
    MapPin, 
    User,
    Search,
    X,
    History,
    FileText,
    ArrowUpRight,
    ArrowDownLeft,
    Loader2,
    Pencil,      // <--- NUEVO
    Save         // <--- NUEVO
} from "lucide-react";
import { VehiculoInventario, MovimientoKardex } from "@/types/inventario.types";
import { inventarioService } from "@/services/inventario.service";

interface InventarioTableProps {
    vehiculos: VehiculoInventario[];
}

export function InventarioTable({ vehiculos: initialVehiculos }: InventarioTableProps) {
    // Estado local de vehículos para reflejar cambios sin recargar página
    const [vehiculos, setVehiculos] = useState(initialVehiculos); 
    
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedVehiculo, setSelectedVehiculo] = useState<VehiculoInventario | null>(null);
    
    // --- NUEVOS ESTADOS PARA EDICIÓN ---
    const [editingVehiculo, setEditingVehiculo] = useState<VehiculoInventario | null>(null);
    const [editForm, setEditForm] = useState({ price: 0, mileage: 0 });
    const [saving, setSaving] = useState(false);

    // Estados para el Modal de Detalle y el Historial
    const [activeTab, setActiveTab] = useState<'ficha' | 'historial'>('ficha');
    const [historial, setHistorial] = useState<MovimientoKardex[]>([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setVehiculos(initialVehiculos);
        setCurrentPage(1); // Resetear a página 1 cuando cambian los datos
    }, [initialVehiculos]);

    // --- LÓGICA DE EDICIÓN (SUPABASE) ---
    const handleEditClick = (v: VehiculoInventario) => {
        setEditingVehiculo(v);
        setEditForm({
            price: v.price || 0,
            mileage: v.mileage || 0
        });
    };

    const handleSaveCommercial = async () => {
        if (!editingVehiculo) return;
        setSaving(true);
        try {
            // 1. Guardar en Supabase
            await inventarioService.updateDatosComerciales(
                editingVehiculo.placa, 
                editForm.price, 
                editForm.mileage
            );
            
            // 2. Actualizar estado local visualmente
            const updatedList = vehiculos.map(v => 
                v.placa === editingVehiculo.placa 
                ? { ...v, price: editForm.price, mileage: editForm.mileage } 
                : v
            );
            setVehiculos(updatedList);
            
            alert("Datos actualizados correctamente");
            setEditingVehiculo(null);
        } catch (error) {
            console.error(error);
            alert("Error al actualizar en Supabase");
        } finally {
            setSaving(false);
        }
    };

    // --- LÓGICA DE CARGA DE HISTORIAL (DETALLE) ---
    const handleOpenModal = (vehiculo: VehiculoInventario) => {
        setSelectedVehiculo(vehiculo);
        setActiveTab('ficha'); 
        setHistorial([]); 
    };

    const handleTabChange = async (tab: 'ficha' | 'historial') => {
        setActiveTab(tab);
        if (tab === 'historial' && selectedVehiculo && historial.length === 0) {
            try {
                setLoadingHistorial(true);
                const data = await inventarioService.getDetalleVehiculo(selectedVehiculo.placa);
                setHistorial(data.historialMovimientos || []);
            } catch (error) {
                console.error("Error cargando historial", error);
            } finally {
                setLoadingHistorial(false);
            }
        }
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
                            <th className="px-4 py-3 font-semibold">Precio</th>
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
                                    
                                    {/* COLUMNA PRECIO (Corregida) */}
                                    <td className="px-4 py-3 font-medium text-emerald-600">
                                        ${v.price?.toLocaleString()}
                                    </td>

                                    {/* COLUMNA KILOMETRAJE (Corregida) */}
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
                                            {/* BOTÓN EDITAR */}
                                            <button 
                                                onClick={() => handleEditClick(v)}
                                                className="text-orange-500 hover:text-orange-700 hover:bg-orange-50 p-2 rounded-lg transition-all"
                                                title="Editar Precio/KM"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>

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
                                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
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
            {editingVehiculo && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Editar Datos Comerciales</h3>
                        <p className="text-sm text-slate-500 mb-4">{editingVehiculo.marca} {editingVehiculo.modelo} - {editingVehiculo.placa}</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Precio de Venta ($)</label>
                                <input 
                                    type="number" 
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editForm.price}
                                    onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Kilometraje Actual</label>
                                <input 
                                    type="number" 
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editForm.mileage}
                                    onChange={e => setEditForm({...editForm, mileage: Number(e.target.value)})}
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

            {/* === MODAL DE DETALLE (EL ORIGINAL) === */}
            {selectedVehiculo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        
                        {/* Header del Modal */}
                        <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-lg">
                                    <Car className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">
                                        {selectedVehiculo.marca} {selectedVehiculo.modelo}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="bg-slate-800 text-white text-xs font-mono px-2 py-0.5 rounded">
                                            {selectedVehiculo.placa}
                                        </span>
                                        <span className="text-slate-500 text-sm border-l border-slate-300 pl-2">
                                            {selectedVehiculo.anioModelo}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedVehiculo(null)}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 px-6">
                            <button
                                onClick={() => handleTabChange('ficha')}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'ficha' 
                                    ? 'border-blue-600 text-blue-600' 
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <FileText className="h-4 w-4" />
                                Ficha Técnica
                            </button>
                            <button
                                onClick={() => handleTabChange('historial')}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'historial' 
                                    ? 'border-blue-600 text-blue-600' 
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <History className="h-4 w-4" />
                                Historial de Movimientos
                            </button>
                        </div>

                        {/* Contenido Modal Scrollable */}
                        <div className="p-6 overflow-y-auto bg-white flex-1">
                            
                            {activeTab === 'ficha' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-left-4 duration-300">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-blue-600 font-medium border-b border-blue-50 pb-2">
                                            <Tag className="h-4 w-4" /> Detalles Generales
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            <ItemDetail label="Marca" value={selectedVehiculo.marca} />
                                            <ItemDetail label="Modelo" value={selectedVehiculo.modelo} />
                                            <ItemDetail label="Año" value={selectedVehiculo.anioModelo} />
                                            <ItemDetail label="Color" value={selectedVehiculo.color} />
                                            <ItemDetail label="Tipo" value={selectedVehiculo.tipo} />
                                            <ItemDetail label="Versión" value={selectedVehiculo.version} />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-blue-600 font-medium border-b border-blue-50 pb-2">
                                            <Cog className="h-4 w-4" /> Mecánica
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            <ItemDetail label="Motor" value={selectedVehiculo.motor} highlight />
                                            <ItemDetail label="Chasis" value={selectedVehiculo.chasis} highlight />
                                            <ItemDetail label="Cilindraje" value={selectedVehiculo.cilindraje} />
                                            <ItemDetail label="Combustible" value={selectedVehiculo.combustible} />
                                            <ItemDetail label="Ejes" value={selectedVehiculo.nroEjes} />
                                            <ItemDetail label="Llantas" value={selectedVehiculo.nroLlantas} />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-blue-600 font-medium border-b border-blue-50 pb-2">
                                            <MapPin className="h-4 w-4" /> Legal
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            <ItemDetail label="País Origen" value={selectedVehiculo.paisOrigen} />
                                            <ItemDetail label="Año Matrícula" value={selectedVehiculo.anioMatricula} />
                                            <ItemDetail label="Lugar Matrícula" value={selectedVehiculo.lugarMatricula} />
                                            <ItemDetail label="Proveedor" value={selectedVehiculo.proveedor} />
                                        </div>
                                    </div>

                                    <div className="md:col-span-3 mt-2">
                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                            <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción Sistema</span>
                                            <p className="text-sm text-slate-700">{selectedVehiculo.descripcion || "Sin descripción"}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'historial' && (
                                <div className="animate-in slide-in-from-right-4 duration-300 h-full">
                                    {loadingHistorial ? (
                                        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                                            <Loader2 className="h-8 w-8 animate-spin mb-2 text-blue-500" />
                                            <p className="text-sm">Cargando movimientos contables...</p>
                                        </div>
                                    ) : historial.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-48 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                            <History className="h-8 w-8 mb-2 opacity-50" />
                                            <p>No hay registros de movimientos para este vehículo.</p>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>
                                            <div className="space-y-6">
                                                {historial.map((mov, idx) => (
                                                    <div key={idx} className="relative pl-10 group">
                                                        <div className={`absolute left-[10px] top-1.5 h-3 w-3 rounded-full border-2 border-white ring-1 z-10 
                                                            ${mov.tipoTransaccion.includes('NOTA DE ENTREGA') ? 'bg-orange-500 ring-orange-200' : 
                                                              mov.esIngreso ? 'bg-emerald-500 ring-emerald-200' : 'bg-blue-500 ring-blue-200'}`} 
                                                        />
                                                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded border 
                                                                            ${mov.tipoTransaccion.includes('NOTA DE ENTREGA') 
                                                                                ? 'bg-orange-50 text-orange-700 border-orange-100' 
                                                                                : mov.esIngreso 
                                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                                                    : 'bg-blue-50 text-blue-700 border-blue-100'
                                                                        }`}>
                                                                            {mov.tipoTransaccion}
                                                                        </span>
                                                                        <span className="text-xs text-slate-400 font-mono">{mov.fecha}</span>
                                                                    </div>
                                                                    <h4 className="font-medium text-slate-800 mt-1">{mov.concepto}</h4>
                                                                    {mov.clienteProveedor && (
                                                                         <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                                                            <User className="h-3 w-3" />
                                                                            {mov.clienteProveedor}
                                                                         </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className={`text-sm font-bold flex items-center justify-end gap-1
                                                                        ${mov.esIngreso ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                                        {mov.esIngreso ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                                                        ${mov.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 mt-1 bg-slate-50 px-1.5 py-0.5 rounded inline-block">
                                                                        Doc: {mov.documento}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ItemDetail({ label, value, highlight = false }: { label: string, value: string | null | undefined, highlight?: boolean }) {
    const isEmpty = !value || value.trim() === "";
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">{label}</span>
            <div className={`text-xs p-2 rounded border ${
                isEmpty 
                    ? "bg-red-50 text-red-600 border-red-100 italic" 
                    : highlight 
                        ? "bg-blue-50 text-blue-800 border-blue-100 font-bold"
                        : "bg-white text-slate-700 border-slate-200"
            }`}>
                {isEmpty ? "No especificado" : value}
            </div>
        </div>
    );
}