import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";

interface PageProps {
    data: ContratoDetalle;
}

export function Page5({ data }: PageProps) {
    // Helpers para formateo
    const formatCurrency = (val: number | string | undefined) => {
        if (val === undefined || val === null) return "$ 0.00";
        if (typeof val === 'string') return val.includes('$') ? val : `$ ${val}`;
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const formatDateSimple = (date: Date) => {
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Obtenemos la fecha actual o la de venta para el encabezado
    const fechaDoc = data.fechaVenta ? new Date(data.fechaVenta) : new Date();

    return (
        <ContractPageLayout pageNumber={5}>
            <div className="font-sans text-[11px] leading-tight text-black max-w-full mx-auto">
                
                {/* --- ENCABEZADO --- */}
                <div className="text-center mb-2">
                    <h2 className="font-bold text-lg uppercase mb-1">CARTA DE INTERMEDIACION</h2>
                </div>

                {/* --- BARRA DE DATOS (CONTRATO / FECHA) --- */}
                <div className="border border-black flex justify-between px-2 py-1 text-xs font-bold mb-6 bg-gray-100">
                    <span>CONTRATO NRO: {data.nroContrato}</span>
                    <span>FECHA: {data.textoFecha || formatDateSimple(fechaDoc)}</span>
                </div>

                {/* --- CUERPO 1: PROPIETARIO ANTERIOR --- */}
                <div className="text-justify mb-4">
                    <p>
                        K-SI NUEVOS ha procedido a la comercialización de un vehículo de propiedad del señor 
                        {/* Nota: Usamos sistemaNombre como propietario anterior, si no existe, un fallback */}
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

                {/* --- CUERPO 2: COMPRADOR Y PAGO --- */}
                <div className="text-justify mb-4 space-y-4 leading-relaxed">
                    <p>
                        Al Señor (a) <strong>{data.facturaNombre}</strong> quien en su calidad de comprador(a) paga la cantidad de 
                        <strong> {data.precioGastosLetras}</strong>.
                    </p>

                    <p>
                        Las parte aseguran estar de acuerdo con la negociación celebrada asi como el estado actual de funcionamiento del vehículo anteriormente mencionado y que recibe luego de haberlo examinado mecánicamente a su entera satisfacción, renunciando por lo tanto a cualquier reclamo posterior a partir de firmado el presente contrato. Cabe indicar que dicho vehículo se mantuvo en los patios de K-SI NUEVOS en calidad de consignación.
                    </p>
                </div>

                {/* --- FECHA Y HORA --- */}
                <div className="mb-12 mt-8">
                     <p>
                        {data.fechaVenta}
                    </p>
                    <p className="mt-4">
                        Atentamente,
                    </p>
                </div>

                {/* --- FIRMAS --- */}
                <div className="grid grid-cols-2 gap-10 mt-16 text-center text-xs font-bold uppercase">
                    {/* Firma Vendedor/Intermediario (Izquierda) */}
                    <div className="flex flex-col items-center">
                        <div className="h-16 w-full relative"></div> {/* Espacio firma */}
                        <div className="border-t border-black w-4/5 pt-1">
                            {"AGUIRRE MARQUEZ FABIAN LEONARDO"}<br/>
                            {/* RUC Vendedor genérico o de la data */}
                            C.C. No. 0102109808
                        </div>
                    </div>

                    {/* Firma Comprador (Derecha) */}
                    <div className="flex flex-col items-center">
                        <div className="h-16 w-full relative">
                             {/* SVG Firma simulada si se requiere */}
                        </div>
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