// src/components/features/contracts/pages/Page6.tsx
import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";
import { AmortizacionTable } from "../../AmortizacionTable";

interface PageProps {
    data: ContratoDetalle;
    hasAmortization: boolean;
}

export function Page6({ data, hasAmortization }: PageProps) {
    if (!hasAmortization) return null;

    const formatMoney = (val: number | undefined) => 
        val ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';

    const currentDateTime = new Date().toLocaleString('es-EC');

    return (
        <ContractPageLayout pageNumber={6}>
            <div className="font-sans text-black text-[10px] leading-tight h-full">
                
                {/* --- HEADER --- */}
                <div className="text-center mb-4">
                    <h2 className="font-bold text-lg italic">K-SI NUEVOS</h2>
                    <h3 className="text-sm font-semibold">Tabla de Amortización Venta</h3>
                    <p className="text-[9px] mt-1">...</p>
                </div>

                {/* --- DATOS GENERALES --- */}
                <div className="border border-black p-1 mb-1 flex justify-between items-start">
                    <div className="w-2/3">
                        <div className="grid grid-cols-[60px_1fr] gap-1">
                            <span className="font-bold">F.Emision</span>
                            <p className="text-[8px] text-gray-500 mb-0.5">{data.fechaVenta}</p>
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
                {/* IMPORTANTE: Quitamos el margin-bottom en impresión para ganar espacio 
                    y evitar que empuje contenido fuera de la página */}
                <div className="mb-8 print:mb-0">
                    <AmortizacionTable contratoId={data.ccoCodigo} printMode={true} totalCuotas={36} />
                </div>
                
            </div>
        </ContractPageLayout>
    );
}