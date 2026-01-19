import React from 'react';
import PageLayout from './PageLayout';
import { ContractData } from '@/types/contracts';
import { numberToText } from '@/utils/numberToText'; 

interface Props {
  data: ContractData;
  mode: 'cash' | 'credit'; 
}

export default function ContractMainPage({ data, mode }: Props) {
  
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val);

  const formatTextAmount = (val: number) => {
    try { return numberToText(val); } catch { return '---'; }
  };

  // CORRECCIÓN DE FECHA: Zona Horaria Guayaquil
  const getLegalDateText = () => {
    const d = data.date ? new Date(data.date) : new Date();
    
    // Obtenemos las partes de la fecha forzando la zona horaria de Ecuador
    const day = d.toLocaleDateString('es-EC', { day: 'numeric', timeZone: 'America/Guayaquil' });
    const month = d.toLocaleDateString('es-EC', { month: 'long', timeZone: 'America/Guayaquil' });
    const year = d.toLocaleDateString('es-EC', { year: 'numeric', timeZone: 'America/Guayaquil' });

    return `${day} días del mes de ${month} de ${year}`;
  };

  const vehiclePrice = data.carPrice || 0;
  const additionalExpenses = (data.administrativeFee || 0) + (data.deviceCost || 0); 
  const totalTransactionValue = vehiclePrice + additionalExpenses;
  const balanceToFinance = totalTransactionValue - (data.downPayment || 0);

  return (
    <PageLayout title="CONTRATO DE COMPRA VENTA DE VEHÍCULOS">
      <div className="font-serif text-[10pt] text-justify leading-snug space-y-4">
        
        <div className="font-bold text-sm border-b border-gray-300 pb-1 mb-2">
             CONTRATO NRO: {data.contractId || 'CCV-0000'}
        </div>

        <p>
          <strong>FABIAN LEONARDO AGUIRRE MARQUEZ</strong>, en representación de <strong>K-SI NUEVOS</strong> por una parte y el (la) Sr (a) (ta) <strong>{data.clientName.toUpperCase()}</strong> con número de cédula de identidad <strong>{data.clientId}</strong> por otra, convienen en celebrar el presente contrato del vehículo al tenor de las siguientes cláusulas:
        </p>

        <div>
            <p className="mb-2">
                <strong>PRIMERA:</strong> El Sr(a) (ta). <strong>{data.clientName.toUpperCase()}</strong> vende y da en perpetua enajenación a el (la) Sr (a) (ta) <strong>{data.clientName.toUpperCase()}</strong> un VEHÍCULO con las siguientes características:
            </p>
            
            <div className="border border-black p-2 text-[9pt] font-medium">
                <div className="grid grid-cols-2 gap-x-4">
                    <div className="space-y-1">
                        <div className="flex"><span className="w-24 font-bold">Matriculado:</span> <span>{data.clientCity || 'CUENCA'}</span></div>
                        <div className="flex"><span className="w-24 font-bold">Placas:</span> <span>{data.carPlate}</span></div>
                        <div className="flex"><span className="w-24 font-bold">Tipo:</span> <span>{data.carType || 'VEHÍCULO'}</span></div>
                        <div className="flex"><span className="w-24 font-bold">Modelo:</span> <span className="uppercase">{data.carModel}</span></div>
                        <div className="flex"><span className="w-24 font-bold">Color:</span> <span className="uppercase">{data.carColor}</span></div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex"><span className="w-36 font-bold">por el año:</span> <span>{new Date().getFullYear()}</span></div>
                        <div className="flex"><span className="w-36 font-bold">Marca:</span> <span className="uppercase">{data.carMake}</span></div>
                        <div className="flex"><span className="w-36 font-bold">Año de Fabricación:</span> <span>{data.carYear}</span></div>
                        <div className="flex"><span className="w-36 font-bold">Motor:</span> <span className="uppercase">{data.carEngine}</span></div>
                        <div className="flex"><span className="w-36 font-bold">Chasis:</span> <span className="uppercase">{data.carChassis}</span></div>
                    </div>
                </div>
            </div>
        </div>

        <div>
            <p>
                <strong>SEGUNDA:</strong> El (la) Sr(a) (ta). <strong>{data.clientName.toUpperCase()}</strong> paga por el vehículo descrito en la cláusula anterior la cantidad de <strong>{formatCurrency(totalTransactionValue)}</strong> ( {formatTextAmount(totalTransactionValue)} ).
            </p>
            
            <p className="mt-2">
                El valor del vehículo es de {formatCurrency(vehiclePrice)}, mientras que de los valores adicionales por gestión administrativa y/o seguro, rastreo satelital, corresponde {formatCurrency(additionalExpenses)}; que serán pagados bajo las siguientes condiciones:
            </p>
            
            {mode === 'credit' && (
                <>
                    <p className="mt-2">
                        Valor pagado a la fecha: {formatCurrency(data.downPayment || 0)} Saldo: {formatCurrency(balanceToFinance)}.
                    </p>
                    <p>
                        El valor financiado se pagará en {data.installments} cuotas mensuales, que corresponden al pago de capital e interés, de acuerdo al siguiente detalle:
                    </p>
                </>
            )}

            <p className="mt-4 uppercase font-bold text-justify leading-normal">
                SE VENDE EN {formatCurrency(vehiclePrice)}; 
                {data.tradeInValue && data.tradeInValue > 0 ? (
                    <> DEJA COMO PARTE DE PAGO UN VEH PLACAS {data.tradeInPlate || '-----'} EN {formatCurrency(data.tradeInValue)}; </>
                ) : null}
                DISPOSITIVO {formatCurrency(data.deviceCost || 0)} DE CONTADO 
                {mode === 'credit' ? (
                     <> Y LA DIFERENCIA CON SEGURO PARA {data.installments} MESES CRÉDITO DIRECTO AUT GERENCIA</>
                ) : (
                     <> Y EL SALDO TOTAL CANCELADO DE CONTADO</>
                )}
            </p>
        </div>

        <div>
            <p>
                <strong>TERCERA:</strong> EL VENDEDOR declara que sobre el vehículo materia del presente contrato, no pesan gravámenes ni impedimentos para su venta.
            </p>
        </div>

        <div>
            <p>
                <strong>CUARTA:</strong> El comprador Sr. (a) <strong>{data.clientName.toUpperCase()}</strong> declara haber revisado por cuenta propia el vehículo anteriormente detallado, en un taller especializado, y lo recibe en las condiciones de uso en las que se encuentra el momento, por lo que certifica haberlo revisado completamente, renunciando así a cualquier reclamo posterior a la firma de la presente.
            </p>
        </div>

        <p className="mt-4">
          Para constancia y como muestra de acuerdo mutuo de lo anteriormete estipulado, firman las partes contratantes en un solo acto de unidad.
        </p>
        <p>
          Dado en Cuenca, a los {getLegalDateText()}.
        </p>

        <div className="mt-20 grid grid-cols-2 gap-10 text-center text-[9pt] font-bold uppercase">
            <div className="flex flex-col items-center">
                <p className="mb-8">EL INTERMEDIARIO</p>
                <div className="border-t border-black w-56 mb-2"></div>
                <p>AGUIRRE MARQUEZ FABIAN LEONARDO</p>
                <p className="font-normal text-[8pt]">C.C. No. 0102109808</p>
            </div>

            <div className="flex flex-col items-center">
                <p className="mb-8">POR (EL) (LOS) DEUDOR (ES)</p> 
                <div className="h-4"></div> 
                <div className="border-t border-black w-56 mb-2"></div>
                <p>{data.clientName}</p>
                <p className="font-normal text-[8pt]">C.C. No. {data.clientId}</p>
                
                <div className="mt-2 text-[7pt] font-normal normal-case leading-tight">
                    <p>Direccion: {data.clientAddress || 'CUENCA'}</p>
                    <p>Telefono: {data.clientPhone || '-----'}</p>
                </div>
            </div>
        </div>

        <div className="mt-12 font-bold text-xs">
            NOTA: Contrato NO VÁLIDO para traspasos
        </div>

      </div>
    </PageLayout>
  );
}