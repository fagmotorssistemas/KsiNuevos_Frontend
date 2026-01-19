import React from 'react';
import PageLayout from './PageLayout';
import { ContractData } from '@/types/contracts';

interface Props {
  data: ContractData;
}

export default function AmortizationTablePage({ data }: Props) {
  
  // --- Helpers de Formato ---
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '--/--/--';
    const d = new Date(dateString);
    // Ajuste UTC para mostrar la fecha correcta
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
  };

  const getLegalDateText = () => {
    const d = data.date ? new Date(data.date) : new Date();
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `Cuenca, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
  };

  // --- Totales ---
  // Calculamos los totales sumando las columnas de la tabla (si existe la data)
  const schedule = data.amortizationSchedule || [];
  const totalCapital = schedule.reduce((acc: number, item: any) => acc + (item.principal || 0), 0);
  const totalInterest = schedule.reduce((acc: number, item: any) => acc + (item.interest || 0), 0);
  const totalPayment = schedule.reduce((acc: number, item: any) => acc + (item.amount || 0), 0);

  return (
    <PageLayout title="ANEXO DE CRÉDITO">
      <div className="font-serif text-[9pt] space-y-4">
        
        {/* --- ENCABEZADO --- */}
        <div className="text-center mb-4">
            <h2 className="font-bold text-lg uppercase underline decoration-1 underline-offset-4">TABLA DE AMORTIZACIÓN</h2>
            <p className="mt-2 text-xs">{getLegalDateText()}</p>
        </div>

        {/* --- DATOS GENERALES (Caja de Información) --- */}
        <div className="border border-black p-2 bg-gray-50 grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
            <div className="flex justify-between border-b border-gray-300">
                <span className="font-bold">CLIENTE:</span>
                <span className="uppercase">{data.clientName}</span>
            </div>
            <div className="flex justify-between border-b border-gray-300">
                <span className="font-bold">C.I. / RUC:</span>
                <span>{data.clientId}</span>
            </div>
            <div className="flex justify-between border-b border-gray-300">
                <span className="font-bold">VEHÍCULO:</span>
                <span className="uppercase">{data.carMake} {data.carModel}</span>
            </div>
            <div className="flex justify-between border-b border-gray-300">
                <span className="font-bold">PLACA:</span>
                <span className="uppercase">{data.carPlate}</span>
            </div>
            <div className="flex justify-between border-b border-gray-300">
                <span className="font-bold">MONTO FINANCIADO:</span>
                <span>{formatCurrency(totalCapital)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-300">
                <span className="font-bold">PLAZO:</span>
                <span>{data.months} MESES</span>
            </div>
        </div>

        {/* --- TABLA DE CUOTAS --- */}
        <div className="mt-4">
            <table className="w-full text-center text-[8pt] border-collapse border border-black">
                <thead className="bg-gray-100 font-bold uppercase text-[7pt]">
                    <tr>
                        <th className="border border-black py-1 px-1 w-10">No.</th>
                        <th className="border border-black py-1 px-2">Vencimiento</th>
                        <th className="border border-black py-1 px-2">Capital</th>
                        <th className="border border-black py-1 px-2">Interés</th>
                        <th className="border border-black py-1 px-2 bg-gray-200">Cuota Total</th>
                        <th className="border border-black py-1 px-2">Saldo Capital</th>
                    </tr>
                </thead>
                <tbody>
                    {schedule.length > 0 ? (
                        schedule.map((row: any, index: number) => (
                            <tr key={index} className="odd:bg-white even:bg-gray-50/50">
                                <td className="border border-black py-1 px-1 font-bold">{row.period || index + 1}</td>
                                <td className="border border-black py-1 px-2">{formatDate(row.dueDate || row.date)}</td>
                                <td className="border border-black py-1 px-2 text-right">{formatCurrency(row.principal)}</td>
                                <td className="border border-black py-1 px-2 text-right">{formatCurrency(row.interest)}</td>
                                <td className="border border-black py-1 px-2 text-right font-bold bg-gray-100">{formatCurrency(row.amount)}</td>
                                <td className="border border-black py-1 px-2 text-right text-gray-600">{formatCurrency(row.balance)}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={6} className="border border-black py-8 text-center text-gray-400 italic">
                                No hay datos de amortización disponibles. <br/>
                                Verifique los datos del crédito (Precio, Entrada, Plazo).
                            </td>
                        </tr>
                    )}
                </tbody>
                {/* Pie de Tabla (Totales) */}
                {schedule.length > 0 && (
                    <tfoot className="font-bold bg-gray-200 text-[8pt]">
                        <tr>
                            <td colSpan={2} className="border border-black py-1 px-2 text-right">TOTALES:</td>
                            <td className="border border-black py-1 px-2 text-right">{formatCurrency(totalCapital)}</td>
                            <td className="border border-black py-1 px-2 text-right">{formatCurrency(totalInterest)}</td>
                            <td className="border border-black py-1 px-2 text-right">{formatCurrency(totalPayment)}</td>
                            <td className="border border-black py-1 px-2 bg-gray-300">--</td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>

        {/* --- TEXTO LEGAL INFERIOR --- */}
        <div className="mt-6 text-justify text-[8pt] leading-tight text-gray-600">
            <p>
                <strong>NOTA:</strong> La presente tabla de amortización detalla el plan de pagos correspondiente al crédito directo otorgado por K-SI NUEVOS. El deudor declara conocer y aceptar los valores aquí descritos, obligándose a cancelar las cuotas en las fechas de vencimiento estipuladas. El incumplimiento en el pago generará intereses de mora según lo establecido en el Pagaré a la Orden suscrito adjunto.
            </p>
        </div>

        {/* --- FIRMAS --- */}
        <div className="mt-20 grid grid-cols-2 gap-16 text-center text-[9pt] font-bold uppercase">
            
            {/* Firma Cliente */}
            <div className="flex flex-col items-center">
                <div className="border-t border-black w-56 mb-2"></div>
                <p>{data.clientName}</p>
                <p className="font-normal text-[8pt]">C.C. No. {data.clientId}</p>
                <p className="font-normal normal-case text-[8pt] mt-1 text-gray-500">(Deudor)</p>
            </div>

            {/* Firma Gerente */}
            <div className="flex flex-col items-center">
                <div className="border-t border-black w-56 mb-2"></div>
                <p>AGUIRRE MARQUEZ FABIAN LEONARDO</p> 
                <p className="font-normal normal-case text-[8pt]">Gerente General</p>
                <p className="font-normal normal-case text-[8pt] mt-1 text-gray-500">(Acreedor)</p>
            </div>
        </div>

      </div>
    </PageLayout>
  );
}