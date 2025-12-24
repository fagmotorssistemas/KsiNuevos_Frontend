import { useState } from "react";
import { 
    Check, 
    X, 
    AlertCircle, 
    Clock, 
    Car,
    MapPin,
    Hash,
    ImageIcon
} from "lucide-react";

import { PaginationPageMinimalCenter } from "@/components/ui/pagination"; 
import { Table, TableCard } from "@/components/ui/table";
import { BadgeWithIcon } from "@/components/ui/badges";
import { Button } from "@/components/ui/buttontable";
import { ImageViewerModal } from "@/components/features/inventory/ImageViewerModal";

import type { InventoryCar } from "@/hooks/useInventory";

interface InventoryTableProps {
    cars: InventoryCar[];
    onEdit?: (car: InventoryCar) => void;
    // Props de Paginación
    page: number;
    totalCount: number;
    rowsPerPage: number;
    onPageChange: (newPage: number) => void;
    // Rol del usuario
    currentUserRole?: string | null;
}

export function InventoryTable({ 
    cars, 
    onEdit, 
    page, 
    totalCount, 
    rowsPerPage,
    onPageChange,
    currentUserRole 
}: InventoryTableProps) {

    // --- ESTADO LOCAL ---
    // Guardamos el vehículo que se está visualizando en el carrusel (null si está cerrado)
    const [viewingCar, setViewingCar] = useState<InventoryCar | null>(null);

    // --- LÓGICA DE PERMISOS ---
    const role = currentUserRole?.toLowerCase() || '';
    const canEdit = role === 'admin' || role === 'marketing';

    // Helpers de Formato
    const formatPrice = (price: number) => 
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);

    const formatKm = (km: number | null) => 
        km ? `${km.toLocaleString()} km` : '0 km';

    const getStatusConfig = (status: string | null) => {
        switch (status) {
            case 'disponible':
                return { color: 'success' as const, icon: Check, label: 'Disponible' };
            case 'vendido':
                return { color: 'error' as const, icon: X, label: 'Vendido' };
            case 'reservado':
                return { color: 'warning' as const, icon: Clock, label: 'Reservado' };
            case 'mantenimiento':
                return { color: 'gray' as const, icon: AlertCircle, label: 'Taller' };
            case 'devuelto':
                return { color: 'brand' as const, icon: AlertCircle, label: 'Devuelto' };
            case 'conwilsonhernan':
                return { color: 'brand' as const, icon: AlertCircle, label: 'Con Wilson Hernan' };
            case 'consignacion':
                return { color: 'brand' as const, icon: Car, label: 'En consignación' };
            default:
                return { color: 'gray' as const, icon: AlertCircle, label: status || 'Desconocido' };
        }
    };

    if (cars.length === 0 && totalCount === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                <Car className="h-10 w-10 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No se encontraron vehículos</h3>
                <p className="text-slate-500 max-w-sm mt-2">
                    Ajusta los filtros para ver resultados.
                </p>
            </div>
        );
    }

    return (
        <>
            <TableCard.Root>
                <Table aria-label="Tabla de Inventario">
                    <Table.Header>
                        <Table.Head id="plate" label="Placa" />
                        <Table.Head id="vehicle" label="Vehículo (Ver Fotos)" />
                        <Table.Head id="year" label="Año" />
                        <Table.Head id="price" label="Precio" />
                        <Table.Head id="km" label="Kilometraje" className="hidden md:table-cell" />
                        <Table.Head id="status" label="Estado" />
                        <Table.Head id="location" label="Ubicación" className="hidden lg:table-cell" />
                        {canEdit && <Table.Head id="actions" label="" />}
                    </Table.Header>

                    <Table.Body items={cars}>
                        {(car: InventoryCar) => {
                            const statusInfo = getStatusConfig(car.status);
                            const hasImages = !!car.img_main_url || (car.img_gallery_urls && car.img_gallery_urls.length > 0);

                            return (
                                <Table.Row id={car.id}>
                                    <Table.Cell>
                                        <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit">
                                            <Hash className="h-3 w-3 text-slate-400" />
                                            {car.plate || car.plate_short || 'S/P'}
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell>
                                        {/* NOMBRE CLICABLE PARA ABRIR CARRUSEL */}
                                        <div 
                                            onClick={() => setViewingCar(car)}
                                            className="group flex flex-col cursor-pointer transition-all"
                                            title="Click para ver fotos"
                                        >
                                            <span className="font-bold text-slate-800 capitalize group-hover:text-brand-600 flex items-center gap-2">
                                                {car.brand} {car.model}
                                                {hasImages && (
                                                    <ImageIcon className="w-3 h-3 text-slate-400 group-hover:text-brand-500" />
                                                )}
                                            </span>
                                            <span className="text-xs text-slate-500 capitalize group-hover:text-brand-400/80">
                                                {car.type_body || 'Vehículo'} • {car.color}
                                            </span>
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell className="text-slate-600 font-medium">
                                        {car.year}
                                    </Table.Cell>

                                    <Table.Cell>
                                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                            {formatPrice(car.price)}
                                        </span>
                                    </Table.Cell>

                                    <Table.Cell className="hidden md:table-cell text-slate-500 text-sm">
                                        {formatKm(car.mileage)}
                                    </Table.Cell>

                                    <Table.Cell>
                                        <BadgeWithIcon
                                            color={statusInfo.color}
                                            iconLeading={statusInfo.icon}
                                            className="capitalize"
                                        >
                                            {statusInfo.label}
                                        </BadgeWithIcon>
                                    </Table.Cell>

                                    <Table.Cell className="hidden lg:table-cell">
                                        <div className="flex items-center gap-1 text-slate-500 text-xs capitalize">
                                            <MapPin className="h-3 w-3" />
                                            {car.location || 'Patio'}
                                        </div>
                                    </Table.Cell>

                                    {canEdit && (
                                        <Table.Cell>
                                            <div className="flex justify-end">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => onEdit && onEdit(car)}
                                                >
                                                    Gestionar
                                                </Button>
                                            </div>
                                        </Table.Cell>
                                    )}
                                </Table.Row>
                            );
                        }}
                    </Table.Body>
                </Table>
                
                <PaginationPageMinimalCenter 
                    page={page} 
                    total={totalCount} 
                    limit={rowsPerPage}
                    className="px-6 py-4" 
                    onChange={onPageChange} 
                />
            </TableCard.Root>

            {/* CARRUSEL MODAL (Renderizado condicional) */}
            {viewingCar && (
                <ImageViewerModal 
                    car={viewingCar} 
                    onClose={() => setViewingCar(null)} 
                />
            )}
        </>
    );
}