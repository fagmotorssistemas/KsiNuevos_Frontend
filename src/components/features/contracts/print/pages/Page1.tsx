import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";

interface PageProps {
    data: ContratoDetalle;
}

export function Page1({ data }: PageProps) {
    // Helper para formatear moneda si el dato viene como número
    const formatCurrency = (val: number | string | undefined) => {
        if (val === undefined || val === null) return "$ 0.00";
        if (typeof val === 'string') return val.includes('$') ? val : `$ ${val}`;
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    return (
        <ContractPageLayout pageNumber={1}>
            <div className="font-sans text-[11px] leading-tight text-black max-w-full mx-auto">
                
                {/* --- ENCABEZADO --- */}
                <div className="text-center mb-4">
                    <h2 className="font-bold text-lg uppercase mb-1">K-SI NUEVOS</h2>
                    <div className="border border-black py-1 px-4 inline-block w-full">
                        <h1 className="font-bold text-base uppercase">CONTRATO DE COMPRA VENTA DE VEHÍCULOS</h1>
                    </div>
                </div>

                {/* NÚMERO DE CONTRATO */}
                <div className="mb-4">
                    <p className="font-bold text-sm">CONTRATO NRO: {data.nroContrato}</p>
                </div>

                {/* --- COMPARECIENTES --- */}
                <div className="text-justify mb-4 space-y-2">
                    <p>
                        <strong>{"FABIAN LEONARDO AGUIRRE MARQUEZ"}</strong>, 
                        en representación de el (la) Sr (a) (ta). 
                        {/* Nota: La interfaz no tiene 'propietarioAnterior', usamos el vendedor o sistemaNombre como fallback */}
                        <strong> {data.apoderado || "PROPIETARIO"} </strong> 
                        por una parte y el (la) Sr (a) (ta) 
                        <strong> {data.facturaNombre}</strong> con número de cédula de identidad 
                        <strong> {data.facturaRuc}</strong> por otra, convienen en celebrar el presente contrato del vehículo al tenor de las siguientes cláusulas:
                    </p>
                </div>

                {/* --- CLÁUSULA PRIMERA (VEHÍCULO) --- */}
                <div className="mb-4">
                    <p className="text-justify mb-2">
                        <strong>PRIMERA:</strong> El Sr(a) (ta). <strong>{data.apoderado}</strong> vende y da en perpetua enajenación a el (la) Sr (a) (ta) 
                        <strong> {data.facturaNombre}</strong> un VEHÍCULO con las siguientes características:
                    </p>

                    {/* TABLA DE CARACTERÍSTICAS */}
                    <div className="border border-black p-2 grid grid-cols-2 gap-x-8 text-xs">
                        {/* Columna Izquierda */}
                        <div className="space-y-1">
                            <div className="grid grid-cols-[80px_1fr]">
                                <span className="font-medium">Matriculado:</span>
                                {/* La interfaz no tiene campo 'matriculado', se deja en blanco o se usa ciudad */}
                                <span>{data.ciudadContrato}</span> 
                            </div>
                            <div className="grid grid-cols-[80px_1fr]">
                                <span className="font-medium">Placas:</span>
                                <span>{data.placa}</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr]">
                                <span className="font-medium">Tipo:</span>
                                <span>{data.tipoVehiculo}</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr]">
                                <span className="font-medium">Modelo:</span>
                                <span>{data.modelo}</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr]">
                                <span className="font-medium">Color:</span>
                                <span>{data.color}</span>
                            </div>
                        </div>

                        {/* Columna Derecha */}
                        <div className="space-y-1">
                            <div className="grid grid-cols-[110px_1fr]">
                                <span className="font-medium">por el año:</span>
                                <span>{data.anio}</span>
                            </div>
                            <div className="grid grid-cols-[110px_1fr]">
                                <span className="font-medium">Marca:</span>
                                <span>{data.marca}</span>
                            </div>
                            <div className="grid grid-cols-[110px_1fr]">
                                <span className="font-medium">Año de Fabricación: </span>
                                <span>{data.anio}</span>
                            </div>
                            <div className="grid grid-cols-[110px_1fr]">
                                <span className="font-medium">Motor:</span>
                                <span>{data.motor}</span>
                            </div>
                            <div className="grid grid-cols-[110px_1fr]">
                                <span className="font-medium">Chasis:</span>
                                <span>{data.chasis}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- CLÁUSULA SEGUNDA (PAGO) --- */}
                <div className="mb-4 text-justify space-y-2">
                    <p>
                        <strong>SEGUNDA:</strong> El (la) Sr(a) (ta). <strong>{data.facturaNombre}</strong> paga por el vehículo descrito en la cláusula anterior la cantidad de 
                        <strong> {data.totalFinal}</strong> ( {data.totalLetras} ). 
                        El valor del vehículo es de <strong>{formatCurrency(data.precioVehiculo)}</strong>, mientras que de los valores adicionales por gestión administrativa y/o seguro, rastreo satelital, corresponde 
                        <strong> {formatCurrency(data.gastosAdministrativos)}</strong>; que serán pagados bajo las siguientes condiciones:
                    </p>
                    
                    {/* Sección de desglose de pagos */}
                    <p>
                         {/* Usamos totalPagareLetras como 'Saldo' si no hay un campo saldo explicito */}
                        Valor pagado a la fecha: <strong>{data.totalPagareLetras || formatCurrency(0)}</strong> Saldo: {data.totalFinal}.
                    </p>

                    <p>
                        Las condiciones de crédito (cuotas y plazos) se detallan a continuación:
                    </p>
                     
                     {/* Aquí inyectamos la 'formaPago' que suele contener el texto "37 cuotas de..." */}
                    <div className="pl-4 italic">
                        {data.formaPago}
                    </div>

                    {/* DETALLE ADICIONAL / OBSERVACIONES */}
                    <div className="uppercase mt-2 border-t border-b border-gray-300 py-2 text-xs">
                        {/* Si existe texto en observaciones lo mostramos, simula la parte de "SE VENDE EN..." */}
                        {data.observaciones ? data.observaciones : (
                            <>
                                SE VENDE EN {data.totalFinal}; {data.seguroRastreo ? `INCLUYE ${data.seguroRastreo}` : ""} CREDITO DIRECTO AUT GERENCIA
                            </>
                        )}
                    </div>
                </div>

                {/* --- CLÁUSULA TERCERA (GRAVÁMENES) --- */}
                <div className="mb-4 text-justify">
                    <p>
                        <strong>TERCERA:</strong> EL VENDEDOR {data.apoderado} declara que sobre el vehículo materia del presente contrato, no pesan gravámenes ni impedimentos para su venta.
                    </p>
                </div>

                {/* --- CLÁUSULA CUARTA (ACEPTACIÓN) --- */}
                <div className="mb-8 text-justify">
                    <p>
                        <strong>CUARTA:</strong> El comprador Sr. (a) <strong>{data.facturaNombre}</strong> declara haber revisado por cuenta propia el vehículo anteriormente 
                        detallado, en un taller especializado, y lo recibe en las condiciones de uso en las que se encuentra el momento, por lo que certifica haberlo revisado 
                        completamente, renunciando asi a cualquier reclamo posterior a la firma de la presente
                    </p>
                </div>

                {/* --- CIERRE --- */}
                <div className="mb-12">
                    <p>
                        Para constancia y como muestra de acuerdo mutuo de lo anteriormete estipulado, firman las partes contratantes en un solo acto de unidad.
                    </p>
                    <p className="mt-2">
                        {/* Usamos el campo textoFechaDado que suele venir como "Dado en Cuenca, a los..." */}
                        {data.textoFechaDado || `Dado en ${data.textoFecha}`}
                    </p>
                </div>

                {/* --- FIRMAS --- */}
                <div className="grid grid-cols-2 gap-10 mt-16 text-center uppercase text-xs font-bold">
                    {/* Firma Intermediario / Vendedor */}
                    <div className="flex flex-col items-center">
                        <div className="mb-2">EL INTERMEDIARIO</div>
                        <div className="h-16 w-full"></div> {/* Espacio para firma */}
                        <div className="border-t border-black w-4/5 pt-1">
                            {"FABIAN LEONARDO AGUIRRE MARQUEZ"}<br/>
                            {/* No hay RUC vendedor en esta interfaz, dejar vacío o usar genérico */}
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

                <div className="mt-8 text-xs font-bold">
                    NOTA: Contrato NO VÁLIDO para traspasos
                </div>

            </div>
        </ContractPageLayout>
    );
}