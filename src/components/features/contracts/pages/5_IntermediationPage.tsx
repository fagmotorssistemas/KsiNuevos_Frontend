import React from 'react';
import PageLayout from './PageLayout';
import { ContractData } from '@/types/contracts';
import { numberToText } from '@/utils/numberToText';

interface Props {
  data: ContractData;
}

export default function IntermediationPage({ data }: Props) {
  
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatTextAmount = (val: number) => {
    try { 
      return numberToText(val); 
    } catch { 
      return '---'; 
    }
  };

  // CORRECCIÓN DE FECHAS: America/Guayaquil
  const formatDate = (dateString?: string) => {
    const d = dateString ? new Date(dateString) : new Date();
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Guayaquil' });
  };

  const totalValue = (data.carPrice || 0) + (data.administrativeFee || 0);

  return (
    <PageLayout title="">
      <div className="font-serif text-[10pt] text-justify leading-relaxed relative -mt-4">

        <div className="mb-4">
            <h2 className="text-center font-bold uppercase mb-1 border-b-0">CARTA DE INTERMEDIACION</h2>
            <div className="flex justify-between items-center border border-black border-x-0 py-1 font-bold text-xs px-2 bg-gray-50/50">
                <div>CONTRATO NRO: {data.contractId || 'CCV-0000'}</div>
                <div>FECHA: &nbsp; {formatDate(data.date)}</div>
            </div>
        </div>

        <div className="space-y-6">
            <p>
                <strong>K-SI NUEVOS</strong> ha procedido a la comercialización de un vehículo de propiedad del señor 
                <strong> {data.previousOwnerName || 'MORA ROSSI LUCRECIA ENEIDA'}</strong> con las siguientes características:
            </p>

            <div className="border border-black p-3 text-[9pt] font-medium">
                <div className="grid grid-cols-1 gap-y-0.5">
                    <div className="flex"><span className="w-40 font-bold">Marca:</span> <span className="uppercase">{data.carMake}</span></div>
                    <div className="flex"><span className="w-40 font-bold">Modelo:</span> <span className="uppercase">{data.carModel}</span></div>
                    <div className="flex"><span className="w-40 font-bold">Placas:</span> <span className="uppercase">{data.carPlate}</span></div>
                    <div className="flex"><span className="w-40 font-bold">Motor:</span> <span className="uppercase">{data.carEngine}</span></div>
                    <div className="flex"><span className="w-40 font-bold">Año de Fabricación:</span> <span>{data.carYear}</span></div>
                    <div className="flex"><span className="w-40 font-bold">Color:</span> <span className="uppercase">{data.carColor}</span></div>
                    <div className="flex"><span className="w-40 font-bold">Chasis:</span> <span className="uppercase">{data.carChassis}</span></div>
                    <div className="flex"><span className="w-40 font-bold">Forma de pago:</span> <span className="uppercase">{data.installments ? 'CREDITO' : 'CONTADO'}</span></div>
                </div>
            </div>

            <p>
                Al Señor (a) <strong>{data.clientName.toUpperCase()}</strong> quien en su calidad de comprador(a) paga la cantidad de <strong>{formatCurrency(totalValue)} ( {formatTextAmount(totalValue)} )</strong>.
            </p>

            <p>
                Las partes aseguran estar de acuerdo con la negociación celebrada asi como el estado actual de funcionamiento del vehículo anteriormente mencionado y que recibe luego de haberlo examinado mecánicamente a su entera satisfacción, renunciando por lo tanto a cualquier reclamo posterior a partir de firmado el presente contrato. Cabe indicar que dicho vehículo se mantuvo en los patios de <strong>K-SI NUEVOS</strong> en calidad de consignación.
            </p>

            <div className="mt-8">
                <p>Cuenca {formatDate(data.date)} 13:13:14</p>
                <p className="mt-4">Atentamente,</p>
            </div>

            <div className="mt-20 grid grid-cols-2 gap-16 text-center text-[9pt] font-bold uppercase">
                
                <div className="flex flex-col items-center">
                    <div className="border-t border-black w-64 mb-1"></div>
                    <p>AGUIRRE MARQUEZ FABIAN LEONARDO</p>
                    <p className="font-normal normal-case text-[8pt]">C.C. No. 0102109808</p>
                </div>

                <div className="flex flex-col items-center">
                    <div className="border-t border-black w-64 mb-1"></div>
                    <p>{data.clientName}</p> 
                    <p className="font-normal normal-case text-[8pt]">C.C. No. {data.clientId}</p>
                </div>

            </div>
        </div>

      </div>
    </PageLayout>
  );
}