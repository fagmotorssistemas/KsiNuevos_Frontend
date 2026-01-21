// src/components/features/contracts/pages/Page2.tsx
import { ContratoDetalle } from "@/types/contratos.types";
import { ContractPageLayout } from "./ContractPageLayout";

interface PageProps {
    data: ContratoDetalle;
}

export function Page2({ data }: PageProps) {
    return (
        <ContractPageLayout pageNumber={2}>
            <div className="space-y-6">
                {/* Cláusula Tercera */}
                <div>
                    <p className="font-bold mb-4 uppercase">CLÁUSULA TERCERA.- OBJETO DEL CONTRATO:</p>
                    <p className="mb-4">
                        Con los antecedentes expuestos, <strong>LA VENDEDORA</strong> da en venta real y enajenación perpetua a favor de <strong>EL COMPRADOR</strong>, 
                        el vehículo usado que se describe a continuación, con todas sus partes, piezas y accesorios:
                    </p>

                    {/* Tabla de Características */}
                    <div className="mx-auto w-11/12 border border-black mt-6 mb-6">
                        <table className="w-full text-[10pt]">
                            <tbody>
                                <tr className="border-b border-black">
                                    <td className="p-2 font-bold bg-gray-100 border-r border-black w-1/3">MARCA:</td>
                                    <td className="p-2 uppercase font-mono">{data.marca}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="p-2 font-bold bg-gray-100 border-r border-black">MODELO:</td>
                                    <td className="p-2 uppercase font-mono">{data.modelo}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="p-2 font-bold bg-gray-100 border-r border-black">TIPO:</td>
                                    <td className="p-2 uppercase font-mono">{data.tipoVehiculo}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="p-2 font-bold bg-gray-100 border-r border-black">AÑO DE FABRICACIÓN:</td>
                                    <td className="p-2 uppercase font-mono">{data.anio}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="p-2 font-bold bg-gray-100 border-r border-black">COLOR:</td>
                                    <td className="p-2 uppercase font-mono">{data.color}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="p-2 font-bold bg-gray-100 border-r border-black">PLACA:</td>
                                    <td className="p-2 uppercase font-bold font-mono text-lg">{data.placa}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="p-2 font-bold bg-gray-100 border-r border-black">CHASIS / VIN:</td>
                                    <td className="p-2 uppercase font-mono">{data.chasis}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 font-bold bg-gray-100 border-r border-black">MOTOR:</td>
                                    <td className="p-2 uppercase font-mono">{data.motor}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                     <p>
                        <strong>EL COMPRADOR</strong> declara recibir el vehículo descrito en las condiciones mecánicas y físicas en que se encuentra, 
                        habiendo realizado la revisión mecánica respectiva a su entera satisfacción, por tratarse de un vehículo usado.
                    </p>
                </div>
            </div>
        </ContractPageLayout>
    );
}