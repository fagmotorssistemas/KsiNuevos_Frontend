// src/components/features/contracts/pages/Page1.tsx
import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";

interface PageProps {
    data: ContratoDetalle;
}

export function Page1({ data }: PageProps) {
    return (
        <ContractPageLayout pageNumber={1}>
            {/* Título */}
            <div className="text-center font-bold mb-10 uppercase tracking-wide border-b-2 border-black pb-2 mx-10">
                CONTRATO DE COMPRAVENTA DE VEHÍCULO USADO
                <br />
                <span className="text-sm font-normal normal-case">No. {data.nroContrato}</span>
            </div>

            <div className="space-y-6">
                {/* Cláusula Primera */}
                <div>
                    <p className="font-bold mb-2 uppercase">CLÁUSULA PRIMERA.- COMPARECIENTES:</p>
                    <p>
                        Intervienen en la celebración y suscripción del presente Contrato de Compraventa, por una parte, 
                        la empresa comercial <strong>IMPORTADORA AUTOMOTRIZ (Nombre legal de tu empresa)</strong> con RUC número <strong>0190000000001</strong>, 
                        debidamente representada por su Gerente General, a quien en adelante y para efectos de este contrato se le denominará simplemente como <strong>"LA VENDEDORA"</strong>; y, por otra parte:
                    </p>
                </div>

                {/* Datos del Comprador Resaltados */}
                <div className="pl-4 border-l-4 border-gray-200 my-4">
                    <p>
                        El(La) señor(a) <strong>{data.facturaNombre}</strong>, portador(a) de la cédula de ciudadanía / RUC número <strong>{data.facturaRuc}</strong>, 
                        con domicilio en la dirección: <strong>{data.facturaDireccion}</strong>, y número de teléfono <strong>{data.facturaTelefono}</strong>;
                        a quien en adelante se le denominará <strong>"EL COMPRADOR"</strong>.
                    </p>
                </div>

                <p>
                    Los comparecientes son ecuatorianos (o extranjeros residentes), mayores de edad, hábiles y capaces para contratar y obligarse, 
                    quienes libre y voluntariamente convienen en celebrar el presente contrato al tenor de las siguientes cláusulas:
                </p>

                {/* Cláusula Segunda */}
                <div>
                    <p className="font-bold mb-2 uppercase">CLÁUSULA SEGUNDA.- ANTECEDENTES:</p>
                    <p>
                        <strong>LA VENDEDORA</strong> es legítima propietaria del vehículo usado, cuyos documentos de propiedad y matriculación 
                        se encuentran en regla y libre de gravámenes, prohibiciones de enajenar o cualquier otro impedimento legal que limite su dominio o libre disposición.
                    </p>
                </div>
            </div>
        </ContractPageLayout>
    );
}