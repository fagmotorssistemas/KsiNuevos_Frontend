// src/components/features/contracts/pages/Page4.tsx
import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";

interface PageProps {
    data: ContratoDetalle;
}

export function Page4({ data }: PageProps) {
    return (
        <ContractPageLayout pageNumber={4}>
            <div className="space-y-6">
                
                {/* Continuación o Nueva Cláusula */}
                <div>
                    <p className="font-bold mb-2 uppercase">CLÁUSULA SEXTA.- RESPONSABILIDAD POR MULTAS Y GRAVÁMENES:</p>
                    <p>
                        <strong>LA VENDEDORA</strong> garantiza que, a la fecha de suscripción del presente contrato, el vehículo no tiene impedimentos legales. 
                        Sin embargo, <strong>EL COMPRADOR</strong> asume la responsabilidad total de cualquier multa, contravención de tránsito o gravamen 
                        que se generase a partir de la fecha y hora de entrega del vehículo: <strong>{data.textoFecha}</strong>.
                    </p>
                </div>

                <div>
                    <p className="font-bold mb-2 uppercase">CLÁUSULA SÉPTIMA.- SANEAMIENTO:</p>
                    <p>
                        <strong>LA VENDEDORA</strong> se obliga al saneamiento por evicción de conformidad con la Ley, respondiendo por la legalidad 
                        del origen del vehículo objeto del presente contrato.
                    </p>
                </div>

                 <div>
                    <p className="font-bold mb-2 uppercase">CLÁUSULA OCTAVA.- ESTADO DEL VEHÍCULO:</p>
                    <p>
                        <strong>EL COMPRADOR</strong> declara expresamente que ha revisado mecánica y físicamente el vehículo, aceptando que se trata de un bien usado, 
                        renunciando a cualquier reclamo posterior por desperfectos mecánicos propios del desgaste natural, salvo vicios ocultos dolosos debidamente comprobados.
                    </p>
                </div>

                <div>
                    <p className="font-bold mb-2 uppercase">CLÁUSULA NOVENA.- GASTOS DE TRANSFERENCIA:</p>
                    <p>
                        Todos los gastos que demanden la legalización de la transferencia de dominio, matriculación, impuestos y tasas, correrán por cuenta exclusiva de <strong>EL COMPRADOR</strong>.
                    </p>
                </div>
            </div>
        </ContractPageLayout>
    );
}