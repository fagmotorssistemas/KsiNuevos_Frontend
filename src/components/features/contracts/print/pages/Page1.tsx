import React from "react";
import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";
import { useFinanciamiento } from "@/hooks/useFinanciamiento"; // <--- IMPORTANTE: Asegúrate de tener este hook creado

interface PageProps {
    data: ContratoDetalle;
}

export function Page1({ data }: PageProps) {
    
    // --- LÓGICA AUTOMÁTICA (CEREBRO DEL CONTRATO) ---
    // Consultamos si existen cuotas reales en la base de datos para este contrato
    const { obtenerTextoLegal, loading } = useFinanciamiento(data.ccoCodigo);

    // Función auxiliar para mostrar dinero
    const formatCurrency = (val: number | string | undefined) => {
        if (val === undefined || val === null) return "$ 0.00";
        if (typeof val === 'string' && val.includes('$')) return val;
        const numberVal = Number(val);
        return isNaN(numberVal) ? "$ 0.00" : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numberVal);
    };

    const INTERMEDIARIO_NOMBRE = "FABIAN LEONARDO AGUIRRE MARQUEZ";
    const INTERMEDIARIO_RUC = "0102109808";
    const VENDEDOR_NOMBRE = data.apoderado && data.apoderado !== 'N/A' ? data.apoderado : "EL PROPIETARIO";

    return (
        <ContractPageLayout pageNumber={1}>
            <div className="font-sans text-black max-w-full mx-auto leading-tight" style={{ fontSize: '11px' }}>
                
                {/* --- ENCABEZADO --- */}
                <div className="text-center mb-2">
                    <div className="h-[30px] w-auto mb-3 flex items-center justify-center">
                        <img 
                            src="/logol.png" 
                            alt="Logo K-SI NUEVOS" 
                            className="h-full w-auto object-contain"
                        />
                    </div>
                    <div className="border border-black py-1 px-4 inline-block w-[98%]">
                        <h1 className="font-bold text-sm uppercase">CONTRATO DE COMPRA VENTA DE VEHÍCULOS</h1>
                    </div>
                </div>

                {/* NÚMERO DE CONTRATO */}
                {/* CORRECCIÓN: Quitamos el texto "CONTRATO NRO:" duro porque ya viene en la data */}
                <div className="mb-3 font-bold text-xs pl-1">
                    {data.nroContrato}
                </div>

                {/* --- COMPARECIENTES --- */}
                <div className="text-justify mb-3 space-y-1 px-1">
                    <p>
                        <strong>{INTERMEDIARIO_NOMBRE}</strong>, en representación de el (la) Sr (a) (ta). 
                        <strong> {VENDEDOR_NOMBRE}</strong> por una parte y el (la) Sr (a) (ta) 
                        <strong> {data.facturaNombre}</strong> con número de cédula de identidad 
                        <strong> {data.facturaRuc}</strong> por otra, convienen en celebrar el presente contrato del vehículo al tenor 
                        de las siguientes cláusulas:
                    </p>
                </div>

                {/* --- CLÁUSULA PRIMERA (TABLA) --- */}
                <div className="mb-3 px-1">
                    <p className="text-justify mb-1">
                        <strong>PRIMERA:</strong> El Sr(a) (ta). <strong>{VENDEDOR_NOMBRE}</strong> vende y da en perpetua enajenación a el (la) Sr (a) (ta) 
                        <strong> {data.facturaNombre}</strong> un VEHÍCULO con las siguientes características:
                    </p>

                    <div className="border border-black p-2 grid grid-cols-2 gap-x-10 text-[10px]">
                        {/* Columna Izquierda */}
                        <div className="space-y-0.5">
                            <div className="grid grid-cols-[70px_1fr]">
                                <span className="font-medium">Matriculado:</span>
                                <span>{data.ciudadContrato}</span>
                            </div>
                            <div className="grid grid-cols-[70px_1fr]">
                                <span className="font-medium">Placas:</span>
                                <span>{data.placa}</span>
                            </div>
                            <div className="grid grid-cols-[70px_1fr]">
                                <span className="font-medium">Tipo:</span>
                                <span>{data.tipoVehiculo}</span>
                            </div>
                            <div className="grid grid-cols-[70px_1fr]">
                                <span className="font-medium">Modelo:</span>
                                <span>{data.modelo}</span>
                            </div>
                            <div className="grid grid-cols-[70px_1fr]">
                                <span className="font-medium">Color:</span>
                                <span>{data.color}</span>
                            </div>
                        </div>

                        {/* Columna Derecha */}
                        <div className="space-y-0.5">
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="font-medium">por el año:</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="font-medium">Marca:</span>
                                <span>{data.marca}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="font-medium">Año de Fabricación:</span>
                                <span>{data.anio}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="font-medium">Motor:</span>
                                <span>{data.motor}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="font-medium">Chasis:</span>
                                <span>{data.chasis}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- CLÁUSULA SEGUNDA (PRECIOS Y FORMA DE PAGO) --- */}
                <div className="mb-3 text-justify px-1 space-y-2">
                    <p>
                        <strong>SEGUNDA:</strong> El (la) Sr(a) (ta). <strong>{data.facturaNombre}</strong> paga por el vehículo descrito en la cláusula anterior la cantidad de 
                        <strong> {data.precioGastosLetras || data.totalLetras}</strong>. 
                        El valor del vehículo es de <strong>{formatCurrency(data.precioVehiculo)}</strong>, mientras que de los valores adicionales por gestión administrativa y/o 
                        seguro, rastreo satelital, corresponde <strong>{data.seguroRastreo}</strong>; que serán pagados bajo las siguientes condiciones:
                    </p>
                    
                    <p>
                        Valor pagado a la fecha: 0.00 Saldo: {formatCurrency(data.precioGastos)}.
                    </p>

                    {/* --- AQUÍ IMPLEMENTAMOS LA LÓGICA SEGURA --- */}
                    <p className="min-h-[20px]">
                        {loading 
                            ? <span className="text-gray-500 italic">Verificando condiciones de pago...</span> 
                            : obtenerTextoLegal()
                        }
                    </p>
                    {/* ------------------------------------------- */}

                    <div className="uppercase mt-2 bg-gray-50 p-1 font-medium">
                       {data.observaciones}
                    </div>
                </div>

                {/* --- CLÁUSULA TERCERA --- */}
                <div className="mb-3 text-justify px-1">
                    <p>
                        <strong>TERCERA:</strong> EL VENDEDOR {VENDEDOR_NOMBRE} declara que sobre el vehículo materia del 
                        presente contrato, no pesan gravámenes ni impedimentos para su venta.
                    </p>
                </div>

                {/* --- CLÁUSULA CUARTA --- */}
                <div className="mb-6 text-justify px-1">
                    <p>
                        <strong>CUARTA:</strong> El comprador Sr. (a) <strong>{data.facturaNombre}</strong> declara haber revisado por cuenta 
                        propia el vehículo anteriormente detallado, en un taller especializado, y lo recibe en las condiciones de uso en las que se 
                        encuentra el momento, por lo que certifica haberlo revisado completamente, renunciando asi a cualquier reclamo 
                        posterior a la firma de la presente
                    </p>
                </div>

                {/* --- CIERRE (FECHA) --- */}
                <div className="mb-10 px-1">
                    <p className="mb-2">
                        Para constancia y como muestra de acuerdo mutuo de lo anteriormete estipulado, firman las partes contratantes en un 
                        solo acto de unidad.
                    </p>
                    <p>
                        {data.textoFechaDado}
                    </p>
                </div>

                {/* --- FIRMAS --- */}
                <div className="grid grid-cols-2 gap-10 mt-16 text-center uppercase text-xs font-bold">
                    {/* Firma Intermediario / Vendedor */}
                    <div className="flex flex-col items-center">
                        <div className="mb-2">EL INTERMEDIARIO</div>
                        <div className="h-16 w-full"></div> {/* Espacio para firma */}
                        <div className="border-t border-black w-5/5 pt-1">
                            {"AGUIRRE MARQUEZ FABIAN LEONARDO"}<br/>
                            C.C. No. 0102109808 
                        </div>
                    </div>

                    {/* Firma Comprador */}
                    <div className="flex flex-col items-center">
                        <div className="mb-2">POR (EL) (LOS) DEUDOR (ES)</div>
                        <div className="h-16 w-full relative"></div>
                        <div className="border-t border-black w-4/5 pt-1">
                            {data.facturaNombre}<br/>
                            C.C. No. {data.facturaRuc}<br/>
                            <div className="font-normal normal-case mt-1 text-[10px]">
                                Direccion: {data.facturaDireccion}<br/>
                                Telefono: {data.facturaTelefono}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-[10px] font-bold px-1">
                    NOTA: Contrato NO VÁLIDO para traspasos
                </div>

            </div>
        </ContractPageLayout>
    );
}