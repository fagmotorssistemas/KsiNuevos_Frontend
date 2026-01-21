// src/components/features/contracts/pages/Page7.tsx
import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";
import { AmortizacionTable } from "../../AmortizacionTable";

interface PageProps {
    data: ContratoDetalle;
    hasAmortization: boolean;
}

export function Page7({ data, hasAmortization }: PageProps) {
    if (!hasAmortization) return null;

    return (
        <ContractPageLayout pageNumber={7}>
            <div className="text-center font-bold mb-8 uppercase border-b-2 border-black pb-4">
                ANEXO 1
                <br />
                TABLA DE AMORTIZACIÓN Y PAGOS
            </div>
            
            <div className="mb-6 grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded border border-gray-200">
                <div>
                    <p className="text-gray-500">CLIENTE:</p>
                    <p className="font-bold uppercase">{data.facturaNombre}</p>
                </div>
                <div>
                    <p className="text-gray-500">RUC/CI:</p>
                    <p className="font-bold">{data.facturaRuc}</p>
                </div>
                <div>
                    <p className="text-gray-500">CONTRATO:</p>
                    <p className="font-bold">{data.nroContrato}</p>
                </div>
                 <div>
                    <p className="text-gray-500">FECHA:</p>
                    <p className="font-bold">{data.fechaVenta}</p>
                </div>
            </div>

            {/* Contenedor de la tabla forzando estilos de impresión */}
            <div className="print:block mb-10">
                <div className="[&_div]:max-h-none [&_div]:overflow-visible [&_table]:text-[10pt]">
                    <AmortizacionTable contratoId={data.ccoCodigo} />
                </div>
            </div>
            
            <div className="mt-auto pt-10 text-center w-1/2 mx-auto">
                 <div className="border-t border-black pt-2">
                    <p className="font-bold text-sm">ACEPTO CONFORMIDAD DE PAGO</p>
                    <p className="text-xs uppercase mt-1">{data.facturaNombre}</p>
                    <p className="text-xs">C.C.: {data.facturaRuc}</p>
                 </div>
            </div>
        </ContractPageLayout>
    );
}