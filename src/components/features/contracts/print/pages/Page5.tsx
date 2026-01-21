// src/components/features/contracts/pages/Page5.tsx
import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";

interface PageProps {
    data: ContratoDetalle;
}

export function Page5({ data }: PageProps) {
    return (
        <ContractPageLayout pageNumber={5}>
            <div className="space-y-6">
                
                <div>
                    <p className="font-bold mb-2 uppercase">CLÁUSULA DÉCIMA.- RESERVA DE DOMINIO (En caso de venta a crédito):</p>
                    <p>
                        Si la venta se realizare a crédito, <strong>LA VENDEDORA</strong> se reserva el dominio del vehículo hasta la completa cancelación del precio pactado. 
                        <strong>EL COMPRADOR</strong> no podrá enajenar, gravar ni disponer del vehículo mientras no haya pagado la totalidad de la deuda.
                    </p>
                </div>

                <div>
                    <p className="font-bold mb-2 uppercase">CLÁUSULA DÉCIMA PRIMERA.- INCUMPLIMIENTO Y MORA:</p>
                    <p>
                        En caso de incumplimiento en el pago de una o más cuotas (si aplicare), <strong>LA VENDEDORA</strong> podrá declarar de plazo vencido la totalidad de la obligación 
                        y exigir el pago inmediato del saldo adeudado, o proceder a la recuperación del vehículo, sin perjuicio de las acciones legales pertinentes. 
                        La mora generará el interés máximo convencional permitido por la ley.
                    </p>
                </div>

                <div>
                    <p className="font-bold mb-2 uppercase">CLÁUSULA DÉCIMA SEGUNDA.- JURISDICCIÓN Y COMPETENCIA:</p>
                    <p>
                        Para todo lo relacionado con la interpretación, cumplimiento y ejecución del presente contrato, las partes renuncian fuero y domicilio, 
                        y se someten a los Jueces competentes de la ciudad de <strong>{data.ubicacion}</strong>, y al trámite verbal sumario o ejecutivo a elección del demandante.
                    </p>
                </div>

                <div>
                    <p className="font-bold mb-2 uppercase">CLÁUSULA DÉCIMA TERCERA.- ACEPTACIÓN:</p>
                    <p>
                        Las partes aceptan el contenido íntegro del presente contrato por estar hecho en seguridad y beneficio de sus recíprocos intereses.
                    </p>
                </div>
            </div>
        </ContractPageLayout>
    );
}