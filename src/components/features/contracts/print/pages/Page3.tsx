import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";

interface PageProps {
    data: ContratoDetalle;
}

export function Page3({ data }: PageProps) {
    // Helpers para fechas
    const fechaVentaDate = new Date(data.fechaVenta || new Date());
    
    // Formato dd/mm/yyyy para la cláusula quinta
    const formatDateShort = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return (
        <ContractPageLayout pageNumber={3}>
            <div className="font-sans text-[11px] leading-tight text-black max-w-full mx-auto">
                
                {/* --- ENCABEZADO CORREGIDO --- */}
                <div className="text-center mb-4">
                <div className="h-[30px] w-auto mb-3 flex items-center justify-center">
                        <img 
                            src="/logol.png" 
                            alt="Logo K-SI NUEVOS" 
                            className="h-full w-auto object-contain"
                        />
                </div>                    {/* Usamos flex-col para asegurar que los elementos queden uno debajo del otro */}
                    <div className="border border-black p-2 flex flex-col">
                        {/* Fila 2: Título centrado */}
                        <h1 className="font-bold text-base uppercase text-center">
                            CARTA DE RESCILIACIÓN
                        </h1>
                        {/* Fila 1: Número de contrato alineado a la izquierda */}
                        <div className="text-left font-bold text-xs mb-1">
                            CONTRATO NRO: {data.nroContrato}
                        </div>
                    </div>
                </div>

                {/* --- INTRODUCCIÓN --- */}
                <div className="text-justify mb-4 space-y-2">
                    <p>
                        {data.textoFecha}, 
                        comparecen libre y voluntariamente y sin ningún tipo de coacción física o moral, por una parte el (la) Sr (a) (ta) 
                        <strong> {data.facturaNombre}</strong> con número de cédula de identidad 
                        <strong> {data.facturaRuc}</strong>, y por otra parte el señor 
                        <strong> FABIAN LEONARDO AGUIRRE MARQUEZ</strong> en calidad de Gerente y Representante Legal de K-SI NUEVOS, quienes presentes realizan la siguiente acta de resciliación al tenor de las siguientes cláusulas:
                    </p>
                </div>

                {/* --- CLÁUSULA PRIMERA: ANTECEDENTES --- */}
                <div className="mb-4">
                    <p className="text-justify mb-2">
                        <strong>PRIMERA: ANTECEDENTES.-</strong> {data.textoFechaCr || "XX de XX del 20XX"}, el primer interviniente adquiere mediante venta con reserva de dominio a K-SI NUEVOS, un vehiculo de las siguientes características:
                    </p>

                    {/* TABLA DE CARACTERÍSTICAS */}
                    <div className="border border-black p-2 grid grid-cols-2 gap-x-8 text-xs">
                        {/* Columna Izquierda */}
                        <div className="space-y-1">
                            <div className="grid grid-cols-[80px_1fr]">
                                <span className="font-medium">Matriculado:</span>
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
                            </div>
                            <div className="grid grid-cols-[110px_1fr]">
                                <span className="font-medium">Marca:</span>
                                <span>{data.marca}</span>
                            </div>
                            <div className="grid grid-cols-[110px_1fr]">
                                <span className="font-medium">Año de Fabricación:</span>
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

                {/* --- CLÁUSULAS LEGALES --- */}
                <div className="text-justify mb-4 space-y-4">
                    <p>
                        <strong>SEGUNDA: SOLICITUD DE RESCILIACION.-</strong> El día de hoy el (la) Sr (a) 
                        <strong> {data.facturaNombre}</strong> ante la imposibilidad de continuar cancelando el crédito que se encuentra vencido solicita a K-SI NUEVOS, se proceda a resciliar el contrato de compra venta con reserva de dominio mencionado en la cláusula primera.
                    </p>

                    <p>
                        <strong>TERCERA: ACEPTACION DE RESCILIACION.-</strong> La solicitud de resciliación es aceptada por el señor 
                        <strong> FABIAN LEONARDO AGUIRRE MARQUEZ</strong> en calidad de Gerente y Representante Legal de K-SI NUEVOS, por lo que a partir de la presente fecha el vehículo vuelve a la propiedad de K-SI NUEVOS y puede disponer libremente del mismo con todas las atribuciones que le otorga la Ley en calidad de propietario del mismo, por lo que los señores, nada tendrán que reclamar por este concepto.
                    </p>

                    <p>
                        <strong>CUARTA: LETRAS DE CAMBIO.-</strong> Las letras que no han sido canceladas por la negociación referida en cláusula primera son anuladas y entregadas al deudor, previa liquidación de los gastos realizados.
                    </p>

                    <p>
                        <strong>QUINTA: RESPONSABILIDAD CIVIL.-</strong> El (la) Sr (a) (ta) 
                        <strong> {data.facturaNombre}</strong> asume total responsabilidad respecto a las multas infracciones o accidentes de tránsito o cualquier acto o acontecimiento que pudo llegar a suscitarse durante el tiempo que el vehículo estuvo en poder del mencionado señor, es decir desde el 
                        <strong> {formatDateShort(fechaVentaDate)} 0:00:00</strong>, hasta la presente fecha y deslindan de toda responsabilidad a K-SI NUEVOS, el vehiculo lo devuelve libre de todo gravamen, en caso de existir gravamen alguno que se haya generado durante el tiempo que el deudor tenía el vehículo en su poder, el señor (a) 
                        <strong> {data.facturaNombre}</strong> , se compromete a sanearlo.
                    </p>

                    <p>
                        Las partes renuncian a cualquier reclamo judicial o extrajudicial respecto del presente acuerdo, y asumen total responsabilidad por el mismo declarando que lo realizan libre y voluntariamente por ser ese su deseo, deslindando de toda responsabilidad al señor 
                        <strong> FABIAN LEONARDO AGUIRRE MARQUEZ</strong> gerente y Representante Legal de K-SI NUEVOS.
                    </p>

                    <p className="mt-6">
                        Para constancia firman el presente documento en la fecha y lugar inicialemte señalados, renunciando las partes a cualquier reclamo posterior.
                    </p>
                </div>

                {/* --- FIRMAS --- */}
                <div className="mt-8 mb-4">
                    <p className="mb-8 uppercase font-bold">ATENTAMENTE,</p>
                    
                    <div className="grid grid-cols-2 gap-10 text-center text-xs font-bold">
                        {/* Firma Cliente */}
                        <div className="flex flex-col items-center">
                            <div className="h-16 w-full relative"></div>
                            <div className="border-t border-black w-4/5 pt-1 uppercase">
                                {data.facturaNombre}<br/>
                                C.C. No. {data.facturaRuc}
                            </div>
                        </div>

                        {/* Firma Gerente */}
                        <div className="flex flex-col items-center">
                             {/* Espacio para firma o rúbrica */}
                            <div className="h-16 w-full relative flex justify-center items-end pb-2">
                                {/* SVG o imagen de rúbrica simulada si se requiere, sino vacío */}
                            </div>
                            <div className="border-t border-black w-5/5 pt-1">
                                Aceptación<br/>
                                {"AGUIRRE MARQUEZ FABIAN LEONARDO"}<br/>
                                C.C. No. 0102109808 
                        </div>
                        </div>
                    </div>
                </div>

            </div>
        </ContractPageLayout>
    );
}