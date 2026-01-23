import { useState } from "react";
import { 
    Car, 
    Info, 
    Tag, 
    Calendar, 
    Hash, 
    Fuel, 
    Cog, 
    MapPin, 
    User,
    Search,
    X
} from "lucide-react";
import { VehiculoInventario } from "@/types/inventario.types";

interface InventarioTableProps {
    vehiculos: VehiculoInventario[];
}

export function InventarioTable({ vehiculos }: InventarioTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedVehiculo, setSelectedVehiculo] = useState<VehiculoInventario | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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

    // Helper para mostrar datos faltantes de forma visual
    const renderValue = (val: string | null | undefined) => {
        if (!val || val.trim() === "") {
            return <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] italic font-medium">No especificado</span>;
        }
        return <span className="text-slate-700 font-medium">{val}</span>;
    };

    return (
        <div className="space-y-4">
            {/* Buscador */}
            <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 w-full md:w-1/3">
                <Search className="h-4 w-4 text-slate-400 ml-2" />
                <input 
                    type="text"
                    placeholder="Buscar por marca, modelo, placa o chasis..."
                    className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-400"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
            </div>

            {/* Tabla Principal */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Vehículo</th>
                                <th className="px-4 py-3">Identificación</th>
                                <th className="px-4 py-3 text-center">Estado Stock</th>
                                <th className="px-4 py-3">Color / Tipo</th>
                                <th className="px-4 py-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentVehiculos.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                                        No se encontraron vehículos.
                                    </td>
                                </tr>
                            ) : (
                                currentVehiculos.map((v, idx) => (
                                    <tr key={`${v.proCodigo}-${idx}`} className="hover:bg-slate-50">
                                        {/* Vehículo */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
                                                    <Car className="h-5 w-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800">{v.marca} {v.modelo}</span>
                                                    <span className="text-xs text-slate-500">Año: {renderValue(v.anioModelo)}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Identificación */}
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1 text-xs">
                                                <span className="flex items-center gap-1">
                                                    <Hash className="h-3 w-3 text-slate-400" /> 
                                                    Placa: <span className="font-mono bg-slate-100 px-1 rounded">{v.placa || 'S/P'}</span>
                                                </span>
                                                <span className="flex items-center gap-1 text-slate-500" title={v.chasis}>
                                                    <Cog className="h-3 w-3" /> 
                                                    Chasis: {v.chasis ? v.chasis.substring(0, 10) + '...' : 'N/A'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Estado Stock */}
                                        <td className="px-4 py-3 text-center">
                                            {v.stock > 0 ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    Disponible ({v.stock})
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                    Dado de Baja
                                                </span>
                                            )}
                                        </td>

                                        {/* Detalle */}
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col text-xs text-slate-600">
                                                <span>{v.color || 'Sin color'}</span>
                                                <span className="text-slate-400">{v.tipo}</span>
                                            </div>
                                        </td>

                                        {/* Botón Ver */}
                                        <td className="px-4 py-3 text-center">
                                            <button 
                                                onClick={() => setSelectedVehiculo(v)}
                                                className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors text-xs font-medium flex items-center justify-center gap-1 mx-auto"
                                            >
                                                <Info className="h-4 w-4" />
                                                Ficha
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Paginador */}
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                    <span>Página {currentPage} de {totalPages}</span>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL DE FICHA TÉCNICA COMPLETA */}
            {selectedVehiculo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        
                        {/* Header Modal */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Car className="h-5 w-5 text-blue-600" />
                                    Ficha Técnica de Inventario
                                </h2>
                                <p className="text-xs text-slate-500">
                                    {selectedVehiculo.marca} {selectedVehiculo.modelo} ({selectedVehiculo.anioModelo})
                                </p>
                            </div>
                            <button onClick={() => setSelectedVehiculo(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Body Scrollable */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            
                            {/* Sección 1: Datos Técnicos del Vehículo */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2 border-b border-blue-100 pb-2">
                                    <Cog className="h-4 w-4" /> Especificaciones Técnicas
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <ItemDetail label="Motor" value={selectedVehiculo.motor} />
                                    <ItemDetail label="Chasis" value={selectedVehiculo.chasis} />
                                    <ItemDetail label="Cilindraje" value={selectedVehiculo.cilindraje} />
                                    <ItemDetail label="Combustible" value={selectedVehiculo.combustible} />
                                    <ItemDetail label="Tonelaje" value={selectedVehiculo.tonelaje} />
                                    <ItemDetail label="Capacidad" value={selectedVehiculo.capacidad} />
                                    <ItemDetail label="Nro. Llantas" value={selectedVehiculo.nroLlantas} />
                                    <ItemDetail label="Nro. Ejes" value={selectedVehiculo.nroEjes} />
                                    <ItemDetail label="RAM" value={selectedVehiculo.ram} />
                                    <ItemDetail label="Versión" value={selectedVehiculo.version} />
                                    <ItemDetail label="Subclase" value={selectedVehiculo.subclase} />
                                    <ItemDetail label="País Origen" value={selectedVehiculo.paisOrigen} />
                                </div>
                            </div>

                            {/* Sección 2: Identificación y Matriculación */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-2 border-b border-purple-100 pb-2">
                                    <Tag className="h-4 w-4" /> Identificación y Matrícula
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <ItemDetail label="Placa" value={selectedVehiculo.placa} highlight />
                                    <ItemDetail label="Placa Característica" value={selectedVehiculo.placaCaracteristica} />
                                    <ItemDetail label="Marca Característica" value={selectedVehiculo.marcaCaracteristica} />
                                    <ItemDetail label="Año Matrícula" value={selectedVehiculo.anioMatricula} />
                                    <ItemDetail label="Nombre Matrícula" value={selectedVehiculo.nombreMatricula} />
                                    <ItemDetail label="Lugar Matrícula" value={selectedVehiculo.lugarMatricula} />
                                </div>
                            </div>

                            {/* Sección 3: Adquisición */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2 border-b border-emerald-100 pb-2">
                                    <User className="h-4 w-4" /> Datos de Adquisición
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
                                    <ItemDetail label="Proveedor" value={selectedVehiculo.proveedor} />
                                    <ItemDetail label="Fecha Compra" value={selectedVehiculo.fechaCompra} />
                                    <ItemDetail label="Forma de Pago" value={selectedVehiculo.formaPago} />
                                </div>
                            </div>

                            {/* Descripción Adicional */}
                            {selectedVehiculo.descripcion && (
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                                    <span className="font-bold text-slate-700">Descripción Sistema: </span>
                                    <span className="text-slate-600">{selectedVehiculo.descripcion}</span>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Subcomponente para items del modal
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