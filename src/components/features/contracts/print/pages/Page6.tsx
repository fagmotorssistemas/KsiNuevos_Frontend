// src/components/features/contracts/pages/Page6.tsx
import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";
import { AmortizacionTable } from "../../AmortizacionTable";

interface PageProps {
    data: ContratoDetalle;
    hasAmortization: boolean;
    fechaImpresion?: string; // NUEVA PROP: Recibe el timestamp de impresión
}

export function Page6({ data, hasAmortization, fechaImpresion }: PageProps) {
    // --- LÓGICA DE VISIBILIDAD ---
    const tieneAdicionales = data.listaCuotasAdicionales && data.listaCuotasAdicionales.length > 0;
    const debeMostrarPagina = hasAmortization || tieneAdicionales;

    if (!debeMostrarPagina) return null;

    const formatMoney = (val: number | undefined | string) => {
        if (typeof val === 'string') return val;
        return val ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';
    };

    // --- HELPER DE FECHAS (Fallback) ---
    const formatDateHeader = (fechaFull: string | undefined) => {
        if (!fechaFull) return "";
        
        const dateObj = new Date(fechaFull);
        if (isNaN(dateObj.getTime())) return fechaFull; 

        const dia = dateObj.getDate();
        const mes = dateObj.getMonth() + 1;
        const anio = dateObj.getFullYear();
        
        const hora = dateObj.getHours();
        const min = dateObj.getMinutes();
        const seg = dateObj.getSeconds();

        if (hora === 0 && min === 0 && seg === 0) {
            return `${dia}/${mes}/${anio}`;
        }

        const horaStr = hora.toString().padStart(2, '0');
        const minStr = min.toString().padStart(2, '0');
        const segStr = seg.toString().padStart(2, '0');

        return `${dia}/${mes}/${anio} ${horaStr}:${minStr}:${segStr}`;
    };

    // --- PREPARACIÓN DE DATOS PARA LA TABLA ---
    const cuotasParaTabla = data.listaCuotasAdicionales?.map(cuota => ({
        monto: cuota.monto,
        fecha: formatDateHeader(data.fechaVenta) 
    })) || [];

    return (
        <ContractPageLayout pageNumber={6}>
            <div className="font-sans text-black text-[10px] leading-tight h-full">
                
                {/* --- HEADER --- */}
                <div className="text-center mb-4 grid grid-cols-2">
                    <div className="h-[30px] w-auto mb-3 flex items-center justify-center">
                            <img 
                                src="/logol.png" 
                                alt="Logo K-SI NUEVOS" 
                                className="h-full w-auto object-contain"
                            />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold">Tabla de Amortización Venta</h3>
                        <p className="text-[9px] mt-1">SISTEMA DE PAGOS Y CRÉDITO DIRECTO</p>
                    </div>
                </div>

                {/* --- DATOS GENERALES --- */}
                <div className="border border-black p-1 mb-1 flex justify-between items-start">
                    <div className="w-2/3">
                        <div className="grid grid-cols-[60px_1fr] gap-1">
                            <span className="font-bold">F.Emision</span>
                            <p className="text-[10px] text-gray-800 font-medium mb-0.5">
                                {/* PRIORIDAD: Usamos la fecha de impresión si está disponible */}
                                {fechaImpresion || formatDateHeader(data.fechaVentaFull)}
                            </p>

                            <span className="font-bold">Vehículo:</span>
                            <span>{data.marca} {data.modelo} {data.anio} {data.color}</span>
                            
                            <span className="font-bold">Mod:</span>
                            <span>{data.modelo}</span>
                            
                            <span className="font-bold">Comprador:</span>
                            <span className="uppercase">{data.facturaNombre}</span>

                            <span className="font-bold">Placa:</span>
                            <span className=" ml-1">{data.placa}</span>
                        </div>
                    </div>
                    
                    <div className="border-l border-black pl-2 flex flex-col justify-center items-center">
                        <div className="text-center">
                            <span className="block font-bold">Doc.Int.</span>
                            <div className="flex gap-2 text-lg font-mono font-bold">
                                <span>CCV</span>
                                <span>{data.nroContrato}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- RESUMEN VALORES --- */}
                <div className="border border-black mb-4">
                    <div className="flex justify-between border-b border-gray-400 px-1 py-0.5">
                        <span>Vehículo para la Venta</span>
                        <span className="uppercase text-[9px]">{data.marca} {data.modelo} {data.anio}</span>
                        <span className="font-mono">{formatMoney(data.precioVehiculo)}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-400 px-1 py-0.5 bg-gray-50/50">
                        <span>Gastos Administrativos Gestion Credito</span>
                        <span className="uppercase text-[9px]">{data.marca} {data.modelo} {data.anio}</span>
                        <span className="font-mono">{formatMoney(data.gastosAdministrativos)}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-400 px-1 py-0.5">
                        <span>Dispositivos de Seguimiento - Tracking</span>
                        <span className="uppercase text-[9px]">{data.marca} {data.modelo} {data.anio}</span>
                        <span className="font-mono">{data.totalRastreador || '$0.00'}</span>
                    </div>
                    <div className="flex justify-between px-1 py-0.5 bg-gray-50/50">
                        <span>Seguro Vehicular Clientes</span>
                        <span className="uppercase text-[9px]">{data.marca} {data.modelo} {data.anio}</span>
                        <span className="font-mono">{data.totalSeguro || '$0.00'}</span>
                    </div>
                </div>

                {/* --- TABLA DE AMORTIZACIÓN --- */}
                <div className="mb-8 print:mb-0">
                    <AmortizacionTable 
                        contratoId={data.ccoCodigo} 
                        printMode={true} 
                        totalCuotas={36}
                        cuotasAdicionales={cuotasParaTabla} 
                    />
                </div>
                
            </div>
        </ContractPageLayout>
    );
}