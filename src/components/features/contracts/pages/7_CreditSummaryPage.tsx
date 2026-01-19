import React from 'react';
import PageLayout from './PageLayout';
import { ContractData } from '@/types/contracts';
import { numberToText } from '@/utils/numberToText';

interface Props {
  data: ContractData;
}

export default function CreditSummaryPage({ data }: Props) {
  
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val);

  // CORRECCIÓN DE FECHAS: America/Guayaquil
  const formatDate = (dateString?: string) => {
    if (!dateString) return '___/___/____';
    return new Date(dateString).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Guayaquil' });
  };
  
  const formatDateShort = (dateString?: string) => {
    if (!dateString) return '--/--/--';
    return new Date(dateString).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Guayaquil' });
  };

  const totalBalance = data.totalReceivable || 0; 
  const vehiclePrice = data.carPrice || 0;
  const entryAmount = data.downPayment || 0;

  return (
    <PageLayout title="RESUMEN DE CRÉDITO">
      <div className="font-serif text-[8pt] leading-tight relative h-full">

        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gray-100 border-r border-black hidden print:block">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap font-bold text-xs tracking-widest w-96 text-center text-gray-400">
                 K-SI NUEVOS - Resumen de Operación
             </div>
        </div>

        <div className="pl-10 space-y-4">

            <div className="border-2 border-black flex">
                
                <div className="w-24 border-r border-black p-2 flex flex-col justify-center items-center text-center font-bold bg-gray-50">
                    <div className="text-xs">Doc. Int.</div>
                    <div className="text-lg">CCV</div>
                    <div className="text-lg">{data.contractId?.split('-')[1] || '0000'}</div>
                </div>

                <div className="flex-grow p-2 space-y-1">
                    <div className="flex justify-between font-bold border-b border-gray-300 pb-1">
                        <span>F. Emisión: {formatDateShort(data.date)}</span>
                        <span>Placa: {data.carPlate}</span>
                    </div>
                    <div>
                        <strong>{data.carMake} {data.carModel} {data.carYear} {data.carColor}</strong><br/>
                        <span className="text-[7pt] uppercase">{data.carType} {data.carEngine}</span>
                    </div>
                    <div className="font-bold border-t border-gray-300 pt-1 mt-1 uppercase">
                        {data.clientName}
                    </div>
                </div>

                <div className="w-32 border-l border-black text-right text-[7pt]">
                    <div className="border-b border-black p-1 flex justify-between">
                        <span>P. Venta:</span>
                        <span>{formatCurrency(vehiclePrice)}</span>
                    </div>
                    <div className="border-b border-black p-1 flex justify-between text-gray-500">
                        <span>Admin:</span>
                        <span>{formatCurrency(data.administrativeFee || 0)}</span>
                    </div>
                    <div className="border-b border-black p-1 flex justify-between text-gray-500">
                        <span>GPS:</span>
                        <span>{formatCurrency(data.deviceCost || 0)}</span>
                    </div>
                    <div className="p-1 font-bold flex justify-between bg-gray-100">
                        <span>Entrada:</span>
                        <span>{formatCurrency(entryAmount)}</span>
                    </div>
                </div>
            </div>

            <div className="border border-black mt-4">
                <table className="w-full text-center text-[8pt]">
                    <thead className="bg-gray-100 font-bold border-b border-black">
                        <tr>
                            <th className="p-1 border-r border-black text-left pl-2">Concepto</th>
                            <th className="p-1 border-r border-black">Plazo</th>
                            <th className="p-1 border-r border-black">Deuda Total</th>
                            <th className="p-1 border-r border-black">Cuota Mensual</th>
                            <th className="p-1">Saldo Actual</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="font-bold">
                            <td className="p-2 border-r border-black text-left pl-2">FINANCIAMIENTO VEHÍCULO</td>
                            <td className="p-2 border-r border-black">{data.months} Meses</td>
                            <td className="p-2 border-r border-black">{formatCurrency(totalBalance)}</td>
                            <td className="p-2 border-r border-black">{formatCurrency(data.monthlyInstallment || 0)}</td>
                            <td className="p-2">{formatCurrency(totalBalance)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="border border-black mt-4">
                <div className="bg-gray-100 border-b border-black p-1 font-bold text-[7pt] uppercase px-2">
                    Detalle de la Operación:
                </div>
                <div className="p-3 text-[8pt] font-mono text-justify uppercase leading-snug">
                     SE VENDE EN {formatCurrency(vehiclePrice)};
                     {data.tradeInValue && data.tradeInValue > 0 ? (
                        <> DEJA COMO PARTE DE PAGO UN VEH PLACAS {data.tradeInPlate || '-----'} EN {formatCurrency(data.tradeInValue)}; </>
                     ) : null}
                     <br/>
                     ENTRADA EFECTIVA: {formatCurrency(entryAmount)}.
                     <br/>
                     SALDO DIFERIDO A {data.months} MESES CRÉDITO DIRECTO (INCLUYE SEGURO, DISPOSITIVO SATELITAL Y GASTOS ADMINISTRATIVOS).
                </div>
            </div>

            <div className="mt-12 text-justify text-[9pt] px-4">
                <p>
                    Yo, <strong>{data.clientName}</strong>, declaro haber recibido el vehículo a mi entera satisfacción y acepto la deuda detallada anteriormente. 
                    Me obligo incondicionalmente a pagar a la orden de <strong>K-SI NUEVOS</strong> la cantidad total de <strong>{formatCurrency(totalBalance)} ({numberToText(totalBalance)} DÓLARES AMERICANOS)</strong>.
                </p>
                <p className="mt-4">
                    Dado en Cuenca en {formatDate(data.date)}.
                </p>
            </div>

            <div className="mt-24 flex justify-between px-16 text-center text-[9pt] font-bold uppercase">
                
                <div className="flex flex-col items-center justify-end w-32">
                    <p className="mb-2 text-xs text-gray-500">Firma de Aceptación</p>
                    <p className="mb-2 italic font-serif text-lg">Acepto.</p>
                </div>

                <div className="flex flex-col items-center w-64">
                    <div className="border-t border-black w-full mb-2"></div>
                    <p>{data.clientName}</p>
                    <p className="font-normal normal-case">C.I. {data.clientId}</p>
                </div>
            </div>

        </div>
      </div>
    </PageLayout>
  );
}