import { 
    CarFront, 
    User,
    CalendarDays,
    MapPin,
    Tag
} from "lucide-react";
import { Table, TableCard } from "@/components/ui/table";
import { VentaVehiculo } from "@/types/ventas.types";

interface VentasTableProps {
    ventas: VentaVehiculo[];
}

export function VentasTable({ ventas }: VentasTableProps) {
    
    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-EC', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (ventas.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <CarFront className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No hay registros de ventas.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <CarFront className="h-5 w-5 text-blue-600" />
                    Detalle de Entregas
                </h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 font-medium">
                    {ventas.length} Vehículos
                </span>
            </div>

            <TableCard.Root>
                <Table aria-label="Listado de Ventas">
                    <Table.Header>
                        <Table.Head id="product" label="Vehículo / Modelo" />
                        <Table.Head id="client" label="Cliente" className="hidden sm:table-cell" />
                        <Table.Head id="sales" label="Vendedor / Agencia" className="hidden sm:table-cell" />
                        <Table.Head id="date" label="Fecha" className="text-right pr-6" />
                    </Table.Header>

                    <Table.Body items={ventas}>
                        {(venta: VentaVehiculo) => (
                            <Table.Row id={venta.numeroComprobante}>
                                
                                {/* Vehículo */}
                                <Table.Cell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 border border-slate-200">
                                            <CarFront className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col max-w-[200px]">
                                            <span className="font-semibold text-slate-900 text-sm truncate" title={venta.producto}>
                                                {venta.producto}
                                            </span>
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                <Tag className="h-3 w-3" />
                                                {venta.marca} • {venta.anio} • {venta.color}
                                            </span>
                                        </div>
                                    </div>
                                </Table.Cell>

                                {/* Cliente */}
                                <Table.Cell className="hidden sm:table-cell">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                            <User className="h-3.5 w-3.5 text-slate-400" />
                                            {/* RUC/Cedula es un dato sensible, quizás solo mostrar parte o el nombre si viniera en la query (en este caso viene RUC) */}
                                            Cliente {venta.rucCedulaCliente}
                                        </div>
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {venta.direccionCliente || 'Sin dirección'}
                                        </span>
                                    </div>
                                </Table.Cell>

                                {/* Vendedor */}
                                <Table.Cell className="hidden sm:table-cell">
                                    <div className="flex flex-col gap-1 text-xs text-slate-500">
                                        <span className="font-medium text-slate-700">
                                            {venta.agenteVenta}
                                        </span>
                                        <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 w-fit">
                                            {venta.agencia}
                                        </span>
                                    </div>
                                </Table.Cell>

                                {/* Fecha */}
                                <Table.Cell className="text-right">
                                    <div className="flex flex-col items-end gap-0.5">
                                        <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                                            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                                            {formatDate(venta.fecha)}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium uppercase">
                                            {venta.mes}-{venta.periodo}
                                        </span>
                                    </div>
                                </Table.Cell>

                            </Table.Row>
                        )}
                    </Table.Body>
                </Table>
            </TableCard.Root>
        </div>
    );
}