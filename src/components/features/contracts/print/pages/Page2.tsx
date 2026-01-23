import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";

interface PageProps {
    data: ContratoDetalle;
    totalCuotas: number; // <--- 1. Agregamos esta propiedad nueva
}

export function Page2({ data, totalCuotas }: PageProps) {
    // Helpers para formateo
    const formatCurrency = (val: number | string | undefined) => {
        if (val === undefined || val === null) return "$ 0.00";
        if (typeof val === 'string') return val.includes('$') ? val : `$ ${val}`;
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const formatDateSimple = (date: Date) => {
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    // --- LÓGICA DE FECHAS Y PLAZOS ---
    
    // 1. Determinar el número real de cuotas (Prioridad: Propiedad > Regex > Default)
    // Si totalCuotas viene en 0 (ej. Contado), intentamos leer "36 meses" del texto, o asumimos 1 mes de trámite.
    const mesesPlazo = totalCuotas > 0 
        ? totalCuotas 
        : parseInt(data.formaPago?.match(/\d+/)?.[0] || "1", 10);

    // 2. Fecha de Venta base
    const fechaVentaDate = new Date(data.fechaVenta || new Date());
    
    // 3. Inicio de pagos: Mes siguiente a la venta
    const fechaInicioPago = new Date(fechaVentaDate);
    fechaInicioPago.setMonth(fechaInicioPago.getMonth() + 1); // +1 mes para la primera cuota
    
    // 4. Fin de pagos: Inicio + (plazo - 1) porque la primera ya cuenta
    // Ejemplo: 36 cuotas. Inicio Enero. Fin = Enero + 35 meses.
    const fechaFinPago = new Date(fechaInicioPago);
    fechaFinPago.setMonth(fechaFinPago.getMonth() + (mesesPlazo - 1));

    return (
        <ContractPageLayout pageNumber={2}>
            <div className="font-sans text-[11px] leading-tight text-black max-w-full mx-auto">

                {/* --- ENCABEZADO --- */}
                <div className="text-center mb-2">
                    <h2 className="font-bold text-lg uppercase mb-1">K-SI NUEVOS</h2>
                </div>

                {/* --- CAJA TITULO PAGARÉ --- */}
                <div className="border border-black mb-1">
                    <div className="text-center border-b border-black py-1">
                         <h1 className="font-bold text-base uppercase">PAGARÉ</h1>
                    </div>
                    <div className="flex justify-between px-2 py-1 text-xs font-bold">
                        <span>{data.nroContrato}</span>
                        <span>FECHA: {data.textoFecha || formatDateSimple(new Date())}</span>
                    </div>
                </div>

                {/* --- MONTO --- */}
                <div className="mb-4 mt-4">
                    <p>
                        <strong>POR: {data.totalFinal || "$ 0.00"} ( {data.totalLetras || data.totalLetras} ).</strong>
                    </p>
                </div>

                {/* --- CUERPO PAGARÉ (DEUDOR/ACREEDOR) --- */}
                <div className="text-justify mb-4 space-y-3 leading-relaxed">
                    <p>
                        <strong>{data.facturaNombre}</strong>, con C.I. <strong>{data.facturaRuc}</strong>, 
                        debo (emos) y pagaré (mos) solidaria e incondicionalmente a la orden de 
                        <strong> {"AGUIRRE MARQUEZ FABIAN LEONARDO"}</strong> en la ciudad de 
                        <strong> {data.ciudadContrato || "CUENCA"}</strong>, o en el lugar donde se me (nos) reconvenga, la cantidad de 
                        <strong> {data.totalFinal} ( {data.totalPagareLetras || data.totalLetras} )</strong> obligándome (nos) irrevocablemente a pagar en 
                        {/* AQUI SE INSERTA EL NUMERO DINÁMICO DE CUOTAS */}
                        <strong> {mesesPlazo} cuotas mensuales</strong>, que corresponden al pago de capital e interés, de acuerdo al siguiente detalle:
                    </p>

                    {/* DETALLE */}
                    <div className="uppercase my-4 border-t border-b border-gray-300 py-2 text-xs">
                        {data.observaciones ? data.observaciones : (
                             <>
                                SE VENDE EN {formatCurrency(data.precioVehiculo)}; 
                                {data.seguroRastreo ? `INCLUYE ${data.seguroRastreo}` : ""} CREDITO DIRECTO AUT GERENCIA
                            </>
                        )}
                    </div>

                    <p>
                        Dichas cuotas serán pagadas irrevocablemente, a partir del <strong>{formatDateSimple(fechaInicioPago)}</strong>, hasta el <strong>{formatDateSimple(fechaFinPago)}</strong>.
                    </p>

                    {/* --- CLÁUSULAS LEGALES --- */}
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

                {/* --- PIE DE PÁGINA (FECHA) --- */}
                <div className="mb-12 mt-6">
                     <p>
                        {data.textoFechaDado || `En Cuenca a los ${new Date().getDate()} dias del mes de ${new Date().toLocaleString('es-ES', { month: 'long' })} de ${new Date().getFullYear()}`}
                    </p>
                </div>

                {/* --- FIRMAS --- */}
                <div className="grid grid-cols-2 gap-10 mt-16 text-center uppercase text-xs font-bold">
                    {/* Firma Acreedor */}
                    <div className="flex flex-col items-center">
                        <div className="mb-2">POR EL ACREEDOR</div>
                        <div className="h-16 w-full"></div> 
                        <div className="border-t border-black w-4/5 pt-1">
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