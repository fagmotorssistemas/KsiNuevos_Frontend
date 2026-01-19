import React from 'react';
import PageLayout from './PageLayout';
import { ContractData } from '@/types/contracts';
import { numberToText } from '@/utils/numberToText';

interface Props {
  data: ContractData;
}

export default function PromissoryNotePage({ data }: Props) {
  
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val);

  const formatTextAmount = (val: number) => {
    try { return numberToText(val); } catch { return '---'; }
  };

  // CORRECCIÓN DE FECHAS: America/Guayaquil
  const formatDateHeader = (dateString?: string) => {
    if (!dateString) return '___/___/____'; 
    const d = new Date(dateString);
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Guayaquil' });
  };

  const formatDateBody = (dateString?: string) => {
    if (!dateString) return '___-___-____';
    const d = new Date(dateString);
    const day = d.toLocaleDateString('es-EC', { day: 'numeric', timeZone: 'America/Guayaquil' });
    const month = d.toLocaleDateString('es-EC', { month: 'long', timeZone: 'America/Guayaquil' });
    const year = d.toLocaleDateString('es-EC', { year: 'numeric', timeZone: 'America/Guayaquil' });
    return `${day}-${month}-${year}`;
  };

  const getLegalDateText = () => {
    const d = data.date ? new Date(data.date) : new Date();
    const day = d.toLocaleDateString('es-EC', { day: 'numeric', timeZone: 'America/Guayaquil' });
    const month = d.toLocaleDateString('es-EC', { month: 'long', timeZone: 'America/Guayaquil' });
    const year = d.toLocaleDateString('es-EC', { year: 'numeric', timeZone: 'America/Guayaquil' });
    return `${day} días del mes de ${month} de ${year}`;
  };

  const totalDebt = data.totalReceivable || 0; 
  const vehiclePrice = data.carPrice || 0;
  const startDate = data.startDate ? formatDateBody(data.startDate) : '___-___-____';
  const endDate = data.endDate ? formatDateBody(data.endDate) : '___-___-____'; 

  return (
    <PageLayout title="PAGARÉ A LA ORDEN">
      <div className="font-serif text-[10pt] text-justify leading-snug space-y-5">
        
        <div className="border border-black px-2 py-1 flex justify-between items-center font-bold text-xs uppercase bg-gray-50">
            <div className="w-1/3 text-left">CONTRATO NRO: {data.contractId || 'CCV-0000'}</div>
            <div className="w-1/3 text-center text-base underline decoration-1 underline-offset-2">PAGARÉ</div>
            <div className="w-1/3 text-right">FECHA: {formatDateHeader(data.date)}</div>
        </div>

        <div className="font-bold text-sm mt-2">
            POR: {formatCurrency(totalDebt)} ( {formatTextAmount(totalDebt)} ).
        </div>

        <p>
            <strong>{data.clientName.toUpperCase()}</strong>, con C.I. <strong>{data.clientId}</strong>, debo (emos) y pagaré (mos) solidaria e incondicionalmente a la orden de <strong>AGUIRRE MARQUEZ FABIAN LEONARDO</strong> en la ciudad de <strong>CUENCA</strong>, o en el lugar donde se me (nos) reconvenga, la cantidad de <strong>{formatCurrency(totalDebt)} ( {formatTextAmount(totalDebt)} )</strong> obligándome (nos) irrevocablemente a pagar en <strong>{data.months} cuotas mensuales</strong>, que corresponden al pago de capital e interés, de acuerdo al siguiente detalle:
        </p>

        <div className="bg-white p-0 text-[10pt] uppercase text-justify leading-normal">
            <p>
                SE VENDE EN {formatCurrency(vehiclePrice)};
                {data.tradeInValue && data.tradeInValue > 0 ? (
                    <> DEJA COMO PARTE DE PAGO UN VEH PLACAS {data.tradeInPlate || '-----'} EN {formatCurrency(data.tradeInValue)}; </>
                ) : null}
                DISPOSITIVO {formatCurrency(data.deviceCost || 0)} DE CONTADO Y LA DIFERENCIA CON SEGURO PARA {data.months} MESES CRÉDITO DIRECTO AUT GERENCIA
            </p>
        </div>

        <p>
            Dichas cuotas serán pagadas irrevocablemente, a partir del <strong>{startDate}</strong>, hasta el <strong>{endDate}</strong>.
        </p>

        <p>
            Declaro (amos) que la falta de pago oportuno de una cualesquiera de las cuotas mensuales, antes detallada o de parte de alguna de ellas, permitirá al Acreedor anticipar y declarar de plazo vencido las cuotas posteriores y exigir al (los) Deudores y/o Avales el pago total de la obligación contenida en este pagaré, mas los gastos y costos a que hubiera lugar.
        </p>

        <p>
            En caso de mora, pagaré (mos) desde su vencimiento hasta su total cancelación, sobre los valores no pagados, la tasa máxima de interés de mora que para el efecto haya dispuesto la Autoridad Monetaria correspondiente, vigente a la respectiva fecha de vencimiento. Además, pagaré(mos) las comisiones y todos los gastos extrajudiciales, costos judiciales, y honorarios profesionales que ocasiones el cobro, bastando para determinar el monto de tales gastos, la sola aseveración del acreedor.
        </p>

        <p>
            Renuncio(amos) fuero y domicilio y quedo(amos) expresamente sometido (s) a los jueces competentes de la ciudad de CUENCA o del lugar en que se me (nos) reconvenga, y al trámite ejecutivo a elección del demandante; obligándome (nos) irrevocablemente al fiel cumplimiento de lo aquí estipulado con todos mis (nuestros) bienes presentes y futuros. El pago no podrá hacerse por partes ni aún por mis (nuestros) herederos.
        </p>

        <p>
            Sin protesto. Exímase al acreedor de este pagaré a Orden de su presentación para el pago al (los) suscriptor (es) del mismo, así como realizar los avisos por falta de pago.
        </p>

        <p className="pt-2">
            En Cuenca a los {getLegalDateText()}.
        </p>

        <div className="mt-16 grid grid-cols-2 gap-10 text-center text-[9pt] font-bold uppercase">
            <div className="flex flex-col items-center">
                <p className="mb-8">POR EL ACREEDOR</p> 
                <div className="border-t border-black w-48 mb-2"></div>
                <p>AGUIRRE MARQUEZ FABIAN LEONARDO</p>
                <p className="font-normal text-[7pt]">C.C. No. 0102109808</p>
            </div>

            <div className="flex flex-col items-center">
                <p className="mb-8">POR (EL) (LOS) DEUDOR (ES)</p> 
                <div className="h-4"></div>
                <div className="border-t border-black w-48 mb-2"></div>
                <p>{data.clientName}</p>
                <p className="font-normal text-[7pt]">C.C. No. {data.clientId}</p>
                <div className="mt-1 text-[7pt] font-normal normal-case leading-tight">
                    <p>Direccion: {data.clientAddress}</p>
                    <p>Telefono: {data.clientPhone}</p>
                </div>
            </div>
        </div>

      </div>
    </PageLayout>
  );
}