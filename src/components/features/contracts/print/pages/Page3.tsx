// src/components/features/contracts/pages/Page3.tsx
import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";

interface PageProps {
    data: ContratoDetalle;
}

export function Page3({ data }: PageProps) {
    return (
        <ContractPageLayout pageNumber={3}>
            <div className="space-y-6">
                {/* Cláusula Cuarta */}
                <div>
                    <p className="font-bold mb-4 uppercase">CLÁUSULA CUARTA.- PRECIO Y FORMA DE PAGO:</p>
                    <p>
                        El precio justo y total pactado por las partes contratantes por el vehículo materia de este contrato es de:
                    </p>
                    
                    <div className="my-6 text-center bg-gray-50 border border-gray-200 p-6 rounded-lg">
                        <p className="text-2xl font-bold font-mono mb-2">USD $ {data.totalFinal}</p>
                        <p className="italic text-sm text-gray-600 uppercase">({data.totalLetras} DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA)</p>
                    </div>

                    <p className="mb-4">
                        El precio acordado será cancelado por <strong>EL COMPRADOR</strong> de la siguiente manera:
                    </p>

                    <div className="pl-6 mb-6">
                        <ul className="list-disc space-y-2">
                             <li>
                                <strong>Forma de Pago:</strong> {data.formaPago}
                            </li>
                             <li>
                                <strong>Gastos Administrativos / Legales:</strong> USD {data.gastosAdministrativos} (Incluidos o adicionales según aplique).
                            </li>
                        </ul>
                    </div>

                    {data.observaciones && (
                        <div className="mt-4">
                            <p className="font-bold underline mb-2">Observaciones Adicionales al Pago:</p>
                            <p className="italic bg-yellow-50 p-4 border border-yellow-100 text-sm">
                                "{data.observaciones}"
                            </p>
                        </div>
                    )}
                </div>

                {/* Inicio Cláusula Quinta */}
                <div>
                    <p className="font-bold mb-2 uppercase">CLÁUSULA QUINTA.- TRANSFERENCIA DE DOMINIO:</p>
                    <p>
                        La transferencia de dominio del vehículo se perfeccionará una vez que <strong>EL COMPRADOR</strong> haya cancelado 
                        la totalidad del precio pactado.
                    </p>
                </div>
            </div>
        </ContractPageLayout>
    );
}