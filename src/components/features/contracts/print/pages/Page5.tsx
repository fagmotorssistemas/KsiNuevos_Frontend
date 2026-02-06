// src/components/features/contracts/pages/Page5.tsx
import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";

interface PageProps {
    data: ContratoDetalle;
    fechaImpresion?: string; // Prop añadida para recibir la estampa de tiempo
}

export function Page5({ data, fechaImpresion }: PageProps) {
    // Helpers para formateo de moneda
    const formatCurrency = (val: number | string | undefined) => {
        if (val === undefined || val === null) return "$ 0.00";
        if (typeof val === 'string') return val.includes('$') ? val : `$ ${val}`;
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const formatDateSimple = (date: Date) => {
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    /**
     * HELPER MAESTRO DE FECHA
     * Prioriza la fecha de impresión (con segundos) generada al hacer clic.
     */
    const formatFechaFirma = (fechaFull: string | undefined, ciudad: string = "Cuenca") => {
        // 1. Si existe fecha de impresión manual, la usamos directamente
        if (fechaImpresion) return `${ciudad}, ${fechaImpresion}`;

        // Fallback si no hay fecha de ningún tipo
        if (!fechaFull) return `Dado en ${ciudad}`; 
        
        const dateObj = new Date(fechaFull);
        if (isNaN(dateObj.getTime())) return `${ciudad} ${fechaFull}`; 

        const dia = dateObj.getDate();
        const mes = dateObj.getMonth() + 1;
        const anio = dateObj.getFullYear();
        
        const hora = dateObj.getHours();
        const min = dateObj.getMinutes();
        const seg = dateObj.getSeconds();

        // Si es medianoche exacta, devolvemos solo fecha corta
        if (hora === 0 && min === 0 && seg === 0) {
            return `${ciudad} ${dia}/${mes}/${anio}`;
        }

        const horaStr = hora.toString().padStart(2, '0');
        const minStr = min.toString().padStart(2, '0');
        const segStr = seg.toString().padStart(2, '0');

        return `${ciudad} ${dia}/${mes}/${anio} ${horaStr}:${minStr}:${segStr}`;
    };

    const fechaDoc = data.fechaVenta ? new Date(data.fechaVenta) : new Date();

    return (
        <ContractPageLayout pageNumber={5}>
            <div className="font-sans text-[11px] leading-tight text-black max-w-full mx-auto ">
                
                {/* --- ENCABEZADO --- */}
                <div className="grid grid-cols-2">
                    <div className="h-[30px] w-auto mb-3 flex items-center justify-center">
                            <img 
                                src="/logol.png" 
                                alt="Logo K-SI NUEVOS" 
                                className="h-full w-auto object-contain"
                            />
                    </div>
                    <div className="text-center mb-2">
                        <h2 className="font-bold text-lg uppercase mb-1">CARTA DE INTERMEDIACION</h2>
                    </div>
                </div>

                {/* --- BARRA DE DATOS --- */}
                <div className="border border-black flex justify-between px-2 py-1 text-xs font-bold mb-6 bg-gray-100">
                    <span>CONTRATO NRO: {data.nroContrato}</span>
                    <span>FECHA: {data.textoFecha || formatDateSimple(fechaDoc)}</span>
                </div>

                {/* --- CUERPO 1 --- */}
                <div className="text-justify mb-4">
                    <p>
                        K-SI NUEVOS ha procedido a la comercialización de un vehículo de propiedad del señor 
                        <strong> {data.apoderado || "PROPIETARIO ANTERIOR"}</strong> con las siguientes características:
                    </p>
                </div>

                {/* --- TABLA DE CARACTERÍSTICAS --- */}
                <div className="border border-black p-3 text-xs mb-6">
                    <div className="grid grid-cols-1 gap-y-1">
                        <div className="grid grid-cols-[150px_1fr]">
                            <span className="font-medium">Marca:</span>
                            <span className="uppercase">{data.marca}</span>
                        </div>
                        <div className="grid grid-cols-[150px_1fr]">
                            <span className="font-medium">Modelo:</span>
                            <span className="uppercase">{data.modelo}</span>
                        </div>
                        <div className="grid grid-cols-[150px_1fr]">
                            <span className="font-medium">Placas:</span>
                            <span className="uppercase">{data.placa}</span>
                        </div>
                        <div className="grid grid-cols-[150px_1fr]">
                            <span className="font-medium">Motor:</span>
                            <span className="uppercase">{data.motor}</span>
                        </div>
                        <div className="grid grid-cols-[150px_1fr]">
                            <span className="font-medium">Año de Fabricación:</span>
                            <span>{data.anio}</span>
                        </div>
                        <div className="grid grid-cols-[150px_1fr]">
                            <span className="font-medium">Color:</span>
                            <span className="uppercase">{data.color}</span>
                        </div>
                        <div className="grid grid-cols-[150px_1fr]">
                            <span className="font-medium">Chasis:</span>
                            <span className="uppercase">{data.chasis}</span>
                        </div>
                        <div className="grid grid-cols-[150px_1fr]">
                            <span className="font-medium">Forma de pago:</span>
                            <span className="uppercase">CREDITO</span>
                        </div>
                    </div>
                </div>

                {/* --- CUERPO 2 --- */}
                <div className="text-justify mb-4 space-y-4 leading-relaxed">
                    <p>
                        Al Señor (a) <strong>{data.facturaNombre}</strong> quien en su calidad de comprador(a) paga la cantidad de 
                        <strong> {data.precioGastosLetras}</strong>.
                    </p>

                    <p>
                        Las parte aseguran estar de acuerdo con la negociación celebrada asi como el estado actual de funcionamiento del vehículo anteriormente mencionado y que recibe luego de haberlo examinado mecánicamente a su entera satisfacción, renunciando por lo tanto a cualquier reclamo posterior a partir de firmado el presente contrato. Cabe indicar que dicho vehículo se mantuvo en los patios de K-SI NUEVOS en calidad de consignación.
                    </p>
                </div>

                {/* --- FECHA Y HORA DE IMPRESIÓN --- */}
                <div className="mb-12 mt-8 text-sm">
                     <p>
                        {formatFechaFirma(data.fechaVentaFull, data.ciudadContrato || "Cuenca")}
                    </p>
                    <p className="mt-4">
                        Atentamente,
                    </p>
                </div>

                {/* --- FIRMAS --- */}
                <div className="grid grid-cols-2 gap-10 mt-16 text-center text-xs font-bold uppercase">
                    <div className="flex flex-col items-center">
                        <div className="h-16 w-full relative"></div>
                        <div className="border-t border-black w-5/5 pt-1">
                            {"AGUIRRE MARQUEZ FABIAN LEONARDO"}<br/>
                            C.C. No. 0102109808
                        </div>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="h-16 w-full relative"></div>
                        <div className="border-t border-black w-4/5 pt-1">
                            {data.facturaNombre}<br/>
                            C.C. No. {data.facturaRuc}
                        </div>
                    </div>
                </div>

            </div>
        </ContractPageLayout>
    );
}