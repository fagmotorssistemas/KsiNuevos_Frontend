// src/components/features/contracts/pages/Page7.tsx
import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";

interface PageProps {
    data: ContratoDetalle;
    hasAmortization?: boolean;
}

export function Page7({ data, hasAmortization = true }: PageProps) {
    if (!hasAmortization) return null;

    // --- HELPERS ---
    const formatCurrency = (val: number | string | undefined) => {
        if (val === undefined || val === null) return "$ 0.00";
        if (typeof val === 'string') return val.includes('$') ? val : `$ ${val}`;
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val);
    };

    const parseCurrencyString = (str: string | undefined): number => {
        if (!str) return 0;
        const cleanStr = str.replace(/[^0-9.]/g, '');
        return parseFloat(cleanStr) || 0;
    };

    // CORRECCIÓN 1: Formato de fecha corto para el encabezado (12/1/2026)
    const formatDateHeader = (dateStr?: string) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatDateLong = (dateStr?: string) => {
        const d = dateStr ? new Date(dateStr) : new Date();
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        return `${months[d.getMonth()]} ${d.getDate() + 1}, ${d.getFullYear()}`;
    };

    const getPlazoSeguro = () => {
        const match = data.formaPago?.match(/\d+/);
        return match ? match[0] : "36";
    };

    // --- CÁLCULOS ---
    const totalFinalNum = parseCurrencyString(data.totalFinal);
    const abonoVehiculos = data.montoVehiculoUsado || 0; // Suma de todos los autos entregados
    const saldoPagaré = totalFinalNum - abonoVehiculos;  // Lo que realmente debe

    return (
        <ContractPageLayout pageNumber={7}>
            <div className="font-sans text-[10px] leading-tight text-black max-w-full mx-auto">

                {/* --- ENCABEZADO --- */}
                <div className="text-center mb-3">
                    <h2 className="font-bold text-lg italic tracking-wide">K-SI NUEVOS</h2>
                    <h1 className="font-normal text-sm mt-1">Tabla de Amortización Venta</h1>
                    <p className="text-[9px] text-center mt-0.5">...</p>
                </div>

                {/* --- CAJA PRINCIPAL DE DATOS --- */}
                <div className="border border-black flex items-stretch mb-0.5">
                    
                    {/* IZQUIERDA */}
                    <div className="flex-1">
                        <div className="grid grid-cols-[65px_1fr] gap-y-0.5 text-[10px]">
                            
                            {/* CORRECCIÓN 1: Usamos formatDateHeader aquí */}
                            <span className="font-serif italic text-gray-800 font-bold">F.Emision</span>
                            <span>{formatDateHeader(data.fechaVentaFull)}</span>

                            <span className="font-serif italic text-gray-800 font-bold">Vehiculo:</span>
                            <div className="flex justify-between w-full">
                                <span className="uppercase">{data.marca} {data.modelo} {data.anio} {data.color}</span>
                            </div>

                            <span className="font-serif italic text-gray-800 font-bold">Mod:</span>
                            <span className="uppercase text-[9px]">{data.modelo} {data.motor}</span>
                            
                            <span className="font-serif italic text-gray-800 font-bold">Placa: </span>
                            <span className="mr-4">{data.placa}</span>

                            <span className="font-serif italic text-gray-800 font-bold">Comprador</span>
                            <span className="uppercase">{data.facturaNombre}</span>
                        </div>
                    </div>

                    {/* DERECHA */}
                    <div className="w-60 border-l border-black flex flex-col items-center justify-center text-center p-1 bg-gray-50/20">
                        <span className="text-[9px] font-serif mb-1">Doc.Int.</span>
                        <div className="flex items-center gap-2">
                            <span className="text-md font-bold">CCV</span>
                            <span className="text-md font-mono tracking-tight">{data.nroContrato}</span>
                        </div>
                    </div>
                </div>

                {/* --- TABLA DE VALORES --- */}
                <div className="border border-black border-t-0 mb-4 text-[10px]">
                    <div className="flex justify-between border-b border-gray-400 px-1 py-0.5">
                        <span className="uppercase truncate pr-2">Vehiculo para la Venta {data.marca} {data.modelo} {data.anio}</span>
                        <span className="font-mono text-right min-w-[80px]">{formatCurrency(data.precioVehiculo)}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-400 px-1 py-0.5 bg-gray-50/50">
                        <span className="uppercase truncate pr-2">Gastos Administrativos Gestion Credito</span>
                        <span className="font-mono text-right min-w-[80px]">{formatCurrency(data.gastosAdministrativos)}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-400 px-1 py-0.5">
                        <span className="uppercase truncate pr-2">Dispositivos de Seguimiento - Tracking</span>
                        <span className="font-mono text-right min-w-[80px]">{formatCurrency(data.totalRastreador)}</span>
                    </div>
                    <div className="flex justify-between border-b border-black px-1 py-0.5 bg-gray-50/50">
                        <span className="uppercase truncate pr-2">Seguro Vehicular Clientes</span>
                        <span className="font-mono text-right min-w-[80px]">{formatCurrency(data.totalSeguro)}</span>
                    </div>

                    {/* CABECERA INTERNA */}
                    <div className="flex text-[9px] font-bold border-b border-black bg-gray-100/50 uppercase">
                        <div className="flex-1 px-1 py-0.5">Detalle Cuota</div>
                        <div className="w-20 text-center px-1 py-0.5">F.Vence</div>
                        <div className="w-20 text-center px-1 py-0.5">Capital</div>
                        <div className="w-20 text-right px-1 py-0.5">Saldo</div>
                    </div>

                    {/* TOTALES (Saldo Real) */}
                    <div className="flex items-center font-bold text-[10px] py-1">
                        <div className="flex-1 px-1">Observaciones.</div>
                        <div className="w-20 text-center">Totales.</div>
                        <div className="w-20 text-right font-mono">{formatCurrency(saldoPagaré)}</div>
                        <div className="w-20 text-right font-mono pr-1">{formatCurrency(saldoPagaré).replace('$','')}</div>
                    </div>
                </div>

                {/* --- CAJA OBSERVACIONES --- */}
                <div className="border border-black p-1 text-[9px] uppercase mb-1 leading-snug min-h-[40px] flex items-center">
                    {data.observaciones ? data.observaciones : (
                        <p>
                            SE VENDE EN {formatCurrency(data.precioVehiculo)}; 
                            DISPOSITIVO {formatCurrency(data.totalRastreador)} DE CONTADO Y LA DIFERENCIA CON SEGURO PARA {getPlazoSeguro()} MESES CREDITO DIRECTO AUT GERENCIA
                        </p>
                    )}
                </div>
                <div className="text-right text-[9px] mb-6">Aprobado por.</div>

                {/* --- SECCIÓN DE PAGARÉ --- */}
                <div className="pl-4 pr-4 mb-6">
                    <div className="flex flex-wrap items-baseline gap-1 text-[11px] leading-loose">
                        <span>Debo y pagaré en forma incondicional este PAGARÉ a la orden de</span>
                        <span className="border-b border-black w-48 inline-block h-4"></span>
                        <span>la cantidad de</span>
                        <span className="font-bold">{formatCurrency(saldoPagaré)} dólares americanos.</span>
                    </div>
                </div>

                <div className="pl-8 mb-12 text-[11px]">
                    Dado en {data.ciudadContrato || "Cuenca"} en {formatDateLong(data.fechaVenta)}
                </div>

                {/* --- FIRMAS --- */}
                <div className="flex justify-between items-end mt-8 px-8">
                    <div className="text-center pb-2 w-1/3">
                        <p className="text-sm">Acepto.</p>
                    </div>
                    <div className="flex flex-col items-center w-1/2">
                         <div className="h-10"></div>
                        <div className="border-t border-black w-full pt-1 text-center uppercase font-bold text-[10px]">
                            {data.facturaNombre}
                        </div>
                        <div className="text-[10px] text-center">
                            CI. {data.facturaRuc}
                        </div>
                    </div>
                </div>
            </div>
        </ContractPageLayout>
    );
}