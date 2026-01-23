import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";

interface PageProps {
    data: ContratoDetalle;
}

export function Page4({ data }: PageProps) {
    // Helper para formatear moneda
    const formatCurrency = (val: number | string | undefined) => {
        if (val === undefined || val === null) return "$ 0.00";
        if (typeof val === 'string') return val.includes('$') ? val : `$ ${val}`;
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    return (
        <ContractPageLayout pageNumber={4}>
            <div className="font-sans text-[11px] leading-tight text-black max-w-full mx-auto">
                
                {/* --- ENCABEZADO --- */}
                <div className="text-center mb-6 relative">
                    <h2 className="font-bold text-lg uppercase mb-4">K-SI NUEVOS</h2>
                    
                    {/* Contenedor del Título con el Nro de Contrato flotando arriba a la izquierda */}
                    <div className="relative mt-6">
                        <span className="absolute -top-4 left-0 font-bold text-xs">
                            CONTRATO NRO: {data.nroContrato}
                        </span>
                        <div className="border border-black py-2 px-1 bg-gray-100">
                            <h1 className="font-bold text-sm uppercase text-center leading-tight">
                                FORMULARIO DE ORIGEN LÍCITO DE RECURSOS EN TRANSACCIONES IGUALES O SUPERIORES A USD 5.000,00
                            </h1>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    
                    {/* --- SECCIÓN 1: DATOS DEL CLIENTE --- */}
                    <div>
                        <h3 className="font-bold text-xs mb-1">Datos Generales del Cliente</h3>
                        <div className="space-y-1 pl-1">
                            <div className="flex">
                                <span className="w-32">Lugar y fecha:</span>
                                <span>{data.ciudadContrato || "CUENCA"}, a los {new Date().getDate()} dias del mes de {new Date().toLocaleString('es-ES', { month: 'long' })} de {new Date().getFullYear()}</span>
                            </div>
                            <div className="flex">
                                <span className="w-32">Nombre del Cliente:</span>
                                <span className="uppercase">{data.facturaNombre}</span>
                            </div>
                            <div className="flex">
                                <span className="w-32">C.C./ RUC/ Pas/ No:</span>
                                <span>{data.facturaRuc}</span>
                            </div>
                            <div className="flex">
                                <span className="w-32">Dirección:</span>
                                <span className="uppercase">{data.facturaDireccion}</span>
                            </div>
                            <div className="flex">
                                <span className="w-32">Teléfono:</span>
                                <span>{data.facturaTelefono}</span>
                            </div>
                            <div className="flex items-end">
                                <span className="w-32">Actividad Económica:</span>
                                {/* Línea para rellenar manual */}
                                <span className="border-b border-black w-64 inline-block h-4"></span>
                            </div>
                        </div>
                    </div>

                    {/* --- SECCIÓN 2: DATOS DE QUIEN EFECTÚA LA TRANSACCIÓN --- */}
                    <div className="bg-gray-50 p-1">
                        <h3 className="font-bold text-xs mb-1">Datos de la persona que efectúa la transacción:</h3>
                        <div className="space-y-1 pl-1">
                            <div className="flex">
                                <span className="w-32">Nombres y apellidos:</span>
                                <span className="uppercase">{data.facturaNombre}</span>
                            </div>
                            <div className="flex">
                                <span className="w-32">CI/RUC/Pas/:</span>
                                <span>{data.facturaRuc}</span>
                            </div>
                            <div className="flex items-end">
                                <span className="w-32">Actividad Económica:</span>
                                {/* Línea para rellenar manual */}
                                <span className="border-b border-black w-64 inline-block h-4"></span>
                            </div>
                        </div>
                    </div>

                    {/* --- SECCIÓN 3: TIPO DE TRANSACCIÓN --- */}
                    <div>
                        <h3 className="font-bold text-xs mb-2">Tipo de Transacción:</h3>
                        <div className="pl-32 space-y-1">
                            <div className="flex items-center gap-2">
                                <span>Compra de Vehículo</span>
                                <span className="font-bold">X</span>
                            </div>
                            <div>Factura de Talleres</div>
                            <div>Factura de Repuestos</div>
                        </div>
                    </div>

                    {/* --- SECCIÓN 4: VALOR --- */}
                    <div>
                        <div className="font-bold mb-2">
                            VALOR USD$: {data.totalFinal}
                        </div>
                        <div className="flex items-end">
                            <span className="mr-2">Estos fondos provienen de:</span>
                            {/* Línea larga para rellenar manual (ej: Minería) */}
                            <span className="border-b border-black flex-grow h-4"></span>
                        </div>
                    </div>

                    {/* --- DECLARACIÓN JURADA --- */}
                    <div className="text-justify text-[10px] leading-relaxed space-y-2 mt-4">
                        <p>
                            Los fondos de esta transacción son propios pagados de la siguiente manera:
                            <span className="uppercase italic ml-1">
                                {data.observaciones}
                            </span>
                        </p>
                        <p>
                            Así mismo que los valores entregados a la empresa tienen origen y destino lícito y permitido por las Leyes de Ecuador, y no provienen ni se destinarán a ninguna actividad ilícita. Eximo a K-SI NUEVOS de toda responsabilidad, inclusive respecto de terceros, si esta declaración fuese falsa o errónea. Autorizo a K-SI NUEVOS a proceder con la comprobación de esta declaración; para el efecto podrá efectuar todas las indagaciones que considere necesarias, por los medios que considere convenientes; así como, de informar a las autoridades competentes en caso de llegar a detectar alguna transacción inusual e injustificada.
                        </p>
                    </div>

                    {/* --- FIRMAS --- */}
                    <div className="grid grid-cols-2 gap-10 mt-16 text-center text-xs">
                        {/* Firma Cliente */}
                        <div className="flex flex-col items-center">
                             <div className="h-12 w-full"></div> {/* Espacio firma */}
                            <div className="border-t border-black w-4/5 pt-1 uppercase font-bold">
                                Firma del Cliente<br/>
                                <span className="font-normal">{data.facturaNombre}</span>
                            </div>
                        </div>

                        {/* Firma Asesor */}
                        <div className="flex flex-col items-center">
                            <div className="h-12 w-full relative"></div>
                            <div className="border-t border-black w-4/5 pt-1">
                                <span className="font-bold">Revisado por Asesor de Ventas:</span><br/>
                                <span className="uppercase">{data.vendedor}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </ContractPageLayout>
    );
}