import React from "react";
import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";
import { useFinanciamiento } from "@/hooks/useFinanciamiento"; // Usamos el mismo cerebro que en la hoja 1

interface PageProps {
    data: ContratoDetalle;
}

export function Page2({ data }: PageProps) {
    
    // 1. OBTENER DATOS REALES DE FINANCIAMIENTO
    // Esto asegura que si son 36, 48 o 12 cuotas, el pagaré se adapte solo.
    const { numeroCuotas, loading } = useFinanciamiento(data.ccoCodigo);

    // 2. HELPERS DE FORMATO
    const formatCurrency = (val: number | string | undefined) => {
        if (val === undefined || val === null) return "$ 0.00";
        if (typeof val === 'string' && val.includes('$')) return val;
        const numberVal = Number(val);
        return isNaN(numberVal) ? "$ 0.00" : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numberVal);
    };

    // Formateador de fechas estilo: "12-enero-2026"
    const formatDateEs = (dateString: string | Date) => {
        if (!dateString) return ".............";
        const date = new Date(dateString);
        // Ajuste de zona horaria simple para evitar que reste un día
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
        
        const day = adjustedDate.getDate();
        const year = adjustedDate.getFullYear();
        const month = adjustedDate.toLocaleString('es-ES', { month: 'long' });
        
        return `${day}-${month}-${year}`;
    };

    // 3. CÁLCULO DE FECHAS (LÓGICA AUTOMÁTICA)
    const calcularFechasPagare = () => {
        // Fecha base: Fecha de venta o fecha actual
        const fechaBase = data.fechaVenta ? new Date(data.fechaVenta) : new Date();
        
        // Inicio de pagos: Generalmente 1 mes después de la venta
        // OJO: Si tu JSON trae una fecha específica de primer pago, úsala aquí. 
        // Por defecto sumamos 1 mes.
        const fechaInicio = new Date(fechaBase);
        fechaInicio.setMonth(fechaInicio.getMonth());

        // Fin de pagos: Fecha Inicio + Numero de Cuotas
        const fechaFin = new Date(fechaInicio);
        // Si no hay cuotas cargadas (contado), asumimos 1 mes por defecto para que no rompa
        const mesesASumar = numeroCuotas > 0 ? numeroCuotas : 1; 
        fechaFin.setMonth(fechaFin.getMonth() + mesesASumar);

        return {
            inicio: formatDateEs(fechaInicio),
            fin: formatDateEs(fechaFin)
        };
    };

    const fechas = calcularFechasPagare();
    const ACERREDOR_NOMBRE = "AGUIRRE MARQUEZ FABIAN LEONARDO";

    return (
        <ContractPageLayout pageNumber={2}>
            <div className="font-sans text-black max-w-full mx-auto leading-tight" style={{ fontSize: '11px' }}>

                {/* --- ENCABEZADO --- */}
                <div className="text-center mb-2">
                    <h2 className="font-bold text-base uppercase mb-1">K-SI NUEVOS</h2>
                </div>

                {/* --- CAJA TÍTULO PAGARÉ (Estilo idéntico a la foto) --- */}
                <div className="border border-black mb-4">
                    <div className="text-center border-b border-black py-1 bg-gray-50">
                         <h1 className="font-bold text-sm uppercase tracking-wider">PAGARÉ</h1>
                    </div>
                    <div className="flex justify-between px-2 py-1 text-[10px] font-bold uppercase">
                        <span>{data.nroContrato}</span>
                        <span>FECHA: {data.fechaCorta || formatDateEs(data.fechaVenta)}</span>
                    </div>
                </div>

                {/* --- MONTO --- */}
                <div className="mb-4 mt-2 px-1">
                    <p className="uppercase">
                        <strong>POR: {data.totalPagareLetras}.</strong>
                    </p>
                </div>

                {/* --- CUERPO PAGARÉ --- */}
                <div className="text-justify mb-4 space-y-3 px-1 leading-relaxed">
                    <p>
                        <strong>{data.facturaNombre}</strong>, con C.I. <strong>{data.facturaRuc}</strong>, 
                        debo (emos) y pagaré (mos) solidaria e incondicionalmente a la orden de 
                        <strong> {ACERREDOR_NOMBRE}</strong> en la ciudad de 
                        <strong> {data.ciudadContrato || "CUENCA"}</strong>, o en el lugar donde se me (nos) reconvenga, la cantidad de 
                        <strong> {data.totalPagareLetras}</strong> obligándome (nos) irrevocablemente a pagar en 
                        
                        {/* INSERCIÓN DINÁMICA DE CUOTAS */}
                        <strong> {loading ? "..." : numeroCuotas} cuotas mensuales</strong>, 
                        
                        que corresponden al pago de capital e interés, de acuerdo al siguiente detalle:
                    </p>

                    {/* --- OBSERVACIONES (SE VENDE EN...) --- */}
                    <div className="uppercase my-2 border-t border-b border-gray-300 py-2 text-[10px] bg-gray-50 font-medium">
                        {data.observaciones}
                    </div>

                    {/* --- FECHAS DE PAGO --- */}
                    <p>
                        Dichas cuotas serán pagadas irrevocablemente, a partir del <strong>{fechas.inicio}</strong>, hasta el <strong>{fechas.fin}</strong>.
                    </p>

                    {/* --- CLÁUSULAS LEGALES (Texto denso) --- */}
                    <div className="space-y-3">
                        <p>
                            Declaro (amos) que la falta de pago oportuno de una cualesquiera de las cuotas mensuales, antes detallada o de parte de alguna de ellas, permitirá al Acreedor anticipar y declarar de plazo vencido las cuotas posteriores y exigir al (los) Deudores y/o Avales el pago total de la obligación contenida en este pagaré, mas los gastos y costos a que hubiera lugar.
                        </p>

                        <p>
                            En caso de mora, pagaré (mos) desde su vencimiento hasta su total cancelación, sobre los valores no pagados, la tasa máxima de interes de mora que para el efecto haya dispuesto la Autoridad Monetaria correspondiente, vigente a la respectiva fecha de vencimiento. Además, pagaré(mos) las comisiones y todos los gastos extrajudiciales, costos judiciales, y honorarios profesionales que ocasiones el cobro, bastando para determinar el monto de tales gastos, la sola aseveración del acreedor.
                        </p>

                        <p>
                            Renuncio(amos) fuero y domicilio y quedo(amos) expresamente sometido (s) a los jueces competentes de la ciudad de <strong>{data.ciudadContrato || "CUENCA"}</strong> o del lugar en que se me (nos) reconvenga, y al trámite ejecutivo a elección del demandante; obligándome (nos) irrevocablemente al fiel cumplimiento de lo aqui estipulado con todos mis (nuestros) bienes presentes y futuros. El pago no podrá hacerse por partes ni aún por mis (nuestros) herederos.
                        </p>

                        <p>
                            Sin protesto. Eximase al acreedor de este pagaré a Orden de su presentación para el pago al (los) suscriptor (es) del mismo, asi como realizar los avisos por falta de pago.
                        </p>
                    </div>
                </div>

                {/* --- PIE DE PÁGINA (FECHA CIUDAD) --- */}
                <div className="mb-10 mt-6 px-1">
                     <p>
                        {data.textoFecha || `En ${data.ciudadContrato}, a los ...`}
                    </p>
                </div>

                {/* --- FIRMAS --- */}
                <div className="grid grid-cols-2 gap-10 mt-16 text-center uppercase text-xs font-bold">
                    {/* Firma Acreedor */}
                    <div className="flex flex-col items-center">
                        <div className="mb-2">POR EL ACREEDOR</div>
                        <div className="h-16 w-full"></div> 
                        <div className="border-t border-black w-5/5 pt-1">
                            {"AGUIRRE MARQUEZ FABIAN LEONARDO"}<br/>
                            C.C. No. 0102109808 
                        </div>
                    </div>

                    {/* Firma Deudor */}
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

            </div>
        </ContractPageLayout>
    );
}