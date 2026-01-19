import React from 'react';
import PageLayout from './PageLayout';
import { ContractData } from '@/types/contracts';

interface Props {
  data: ContractData;
}

export default function LawfulFundsPage({ data }: Props) {
  
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  // CORRECCIÓN DE FECHAS: America/Guayaquil
  const getLegalDateText = () => {
    const d = data.date ? new Date(data.date) : new Date();
    const day = d.toLocaleDateString('es-EC', { day: 'numeric', timeZone: 'America/Guayaquil' });
    const month = d.toLocaleDateString('es-EC', { month: 'long', timeZone: 'America/Guayaquil' });
    const year = d.toLocaleDateString('es-EC', { year: 'numeric', timeZone: 'America/Guayaquil' });
    return `${day} días del mes de ${month} de ${year}`;
  };

  const totalTransactionValue = (data.carPrice || 0) + (data.administrativeFee || 0);

  return (
    <PageLayout title="FORMULARIO UAFE">
      <div className="font-serif text-[9pt] leading-tight text-justify space-y-4">

        <div className="text-center font-bold uppercase border-b-2 border-black pb-2 mb-4">
          <h1 className="text-lg leading-none">FORMULARIO DE ORIGEN LÍCITO DE RECURSOS EN TRANSACCIONES IGUALES O SUPERIORES A USD 5.000,00</h1>
        </div>

        <div className="bg-gray-50/50 p-2 rounded-sm">
          <h3 className="font-bold border-b border-black mb-2 text-[9pt]">Datos Generales del Cliente</h3>
          <div className="space-y-1.5 text-[9pt]">
             <div className="flex">
                <span className="font-bold w-48">Lugar y fecha:</span>
                <span className="uppercase">CUENCA, a {getLegalDateText()}</span>
             </div>
             <div className="flex">
                <span className="font-bold w-48">Nombre del Cliente:</span>
                <span className="uppercase font-bold">{data.clientName}</span>
             </div>
             <div className="flex">
                <span className="font-bold w-48">B.C./ RUC/ Pas/ No:</span>
                <span>{data.clientId}</span>
             </div>
             <div className="flex">
                <span className="font-bold w-48">Dirección:</span>
                <span className="uppercase">{data.clientAddress || 'CUENCA'}</span>
             </div>
             <div className="flex">
                <span className="font-bold w-48">Teléfono :</span>
                <span>{data.clientPhone || '-----'}</span>
             </div>
             <div className="flex items-end">
                <span className="font-bold w-48">Actividad Económica:</span>
                <span className="border-b border-black flex-grow uppercase pl-2 font-handwriting text-blue-900">
                    {data.clientActivity || 'EMPLEADO / INDEPENDIENTE'}
                </span>
             </div>
          </div>
        </div>

        <div className="mt-4 bg-gray-50/50 p-2 rounded-sm">
          <h3 className="font-bold border-b border-black mb-2 text-[9pt]">Datos de la persona que efectúa la transacción:</h3>
          <div className="space-y-1.5 text-[9pt]">
             <div className="flex">
                <span className="font-bold w-48">Nombres y apellidos:</span>
                <span className="uppercase font-bold">{data.clientName}</span> 
             </div>
             <div className="flex">
                <span className="font-bold w-48">CI/RUC/Pas/:</span>
                <span>{data.clientId}</span>
             </div>
             <div className="flex items-end">
                <span className="font-bold w-48">Actividad Económica:</span>
                <span className="border-b border-black flex-grow uppercase pl-2 font-handwriting text-blue-900">
                    {data.clientActivity || 'EMPLEADO / INDEPENDIENTE'}
                </span>
             </div>
          </div>
        </div>

        <div className="mt-4 p-2">
          <h3 className="font-bold mb-2 text-[9pt]">Tipo de Transacción:</h3>
          <div className="grid grid-cols-2 gap-8 text-[9pt]">
            <div className="space-y-1">
                <div className="flex items-center">
                    <span className="font-bold mr-2 w-32">Compra de Vehículo</span> 
                    <span className="font-bold text-lg">X</span>
                </div>
                <div className="flex items-center">
                    <span className="w-32">Factura de Talleres</span>
                </div>
                <div className="flex items-center">
                    <span className="w-32">Factura de Repuestos</span>
                </div>
            </div>
            
            <div className="space-y-2">
                <div className="flex items-baseline font-bold">
                    <span className="w-28">VALOR USD$:</span>
                    <span className="text-lg">{formatCurrency(totalTransactionValue)}</span>
                </div>
                <div className="flex items-end mt-2">
                    <span className="font-medium mr-2">Estos fondos provienen de</span>
                    <span className="border-b border-black flex-grow uppercase pl-2 font-handwriting text-blue-900">
                        {data.fundsOrigin || 'AHORROS / TRABAJO'}
                    </span>
                </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-justify text-[9pt]">
            <p className="mb-2">
                Los fondos de esta transacción son propios pagados de la siguiente manera:
            </p>
            
            <div className="my-3 font-style-italic uppercase leading-snug">
                 <span className="italic">
                     SE VENDE EN {formatCurrency(data.carPrice || 0)}; 
                     {data.tradeInValue && data.tradeInValue > 0 ? (
                        <> DEJA COMO PARTE DE PAGO UN VEH PLACAS {data.tradeInPlate || '-----'} EN {formatCurrency(data.tradeInValue)}; </>
                     ) : null}
                     DISPOSITIVO {formatCurrency(data.deviceCost || 0)} DE CONTADO 
                     {data.installments && data.installments > 0 ? (
                         <> Y LA DIFERENCIA CON SEGURO PARA {data.installments} MESES CREDITO DIRECTO AUT GERENCIA.</>
                     ) : (
                         <> Y EL SALDO TOTAL DE CONTADO.</>
                     )}
                 </span>
            </div>

            <p className="mb-2 leading-normal">
                Así mismo que los valores entregados a la empresa tienen origen y destino lícito y permitido por las Leyes de Ecuador, y no provienen ni se destinarán a ninguna actividad ilícita. Eximo a <strong>K-SI NUEVOS</strong> de toda responsabilidad, inclusive respecto de terceros, si esta declaración fuese falsa o errónea. Autorizo a <strong>K-SI NUEVOS</strong> a proceder con la comprobación de esta declaración; para el efecto podrá efectuar todas las indagaciones que considere necesarias, por los medios que considere convenientes; así como, de informar a las autoridades competentes en caso de llegar a detectar alguna transacción inusual e injustificada.
            </p>
        </div>

        <div className="mt-20 flex justify-between px-8 text-center text-[9pt] font-medium">
            <div className="flex flex-col items-center w-64">
                <div className="border-t border-black w-full mb-2"></div>
                <p className="font-bold">Firma del Cliente</p>
                <p className="mt-1 uppercase font-bold">{data.clientName}</p>
            </div>

            <div className="flex flex-col items-center w-64">
                <div className="border-t border-black w-full mb-2"></div>
                <p>Revisado por Asesor de Ventas:</p>
                <p className="mt-1 italic">{data.salesAdvisorName || 'Reyes Moreno Vanessa Carolina'}</p> 
            </div>
        </div>

      </div>
    </PageLayout>
  );
}