// src/components/features/contracts/pages/Page6.tsx
import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";

interface PageProps {
    data: ContratoDetalle;
}

export function Page6({ data }: PageProps) {
    return (
        <ContractPageLayout pageNumber={6}>
            <div className="flex flex-col h-full justify-between">
                <div>
                    <p className="mb-8">
                        Para constancia y fe de lo actuado, las partes suscriben el presente contrato en tres ejemplares de igual tenor y valor legal.
                    </p>
                    <p className="text-right">
                        Suscrito en la ciudad de <strong>{data.ubicacion}</strong>, a los <strong>{data.textoFecha}</strong>.
                    </p>
                </div>

                {/* Sección de Firmas al final de la hoja para que se vea formal */}
                <div className="mb-20">
                    <div className="grid grid-cols-2 gap-16">
                        
                        {/* Firma Vendedor */}
                        <div className="flex flex-col items-center">
                            <div className="w-4/5 border-t border-black mb-2"></div>
                            <p className="font-bold text-sm">POR: LA VENDEDORA</p>
                            <p className="text-xs mt-1">Gerente General</p>
                            <p className="text-xs">RUC: 0190000000001</p>
                        </div>

                        {/* Firma Comprador */}
                        <div className="flex flex-col items-center">
                            <div className="w-4/5 border-t border-black mb-2"></div>
                            <p className="font-bold text-sm">POR: EL COMPRADOR</p>
                            <p className="text-xs font-bold mt-1 uppercase">{data.facturaNombre}</p>
                            <p className="text-xs">C.C./RUC: {data.facturaRuc}</p>
                        </div>

                    </div>
                    
                    {/* Firma Cónyuge (Opcional, visualmente presente por si acaso) */}
                    <div className="mt-20 flex justify-center">
                         <div className="flex flex-col items-center w-1/2">
                            <div className="w-3/5 border-t border-black mb-2"></div>
                            <p className="font-bold text-sm">CÓNYUGE (Si aplica)</p>
                            <p className="text-xs">C.C.: _________________</p>
                        </div>
                    </div>
                </div>
            </div>
        </ContractPageLayout>
    );
}