'use client';

// 1. IMPORTANTE: Agregamos 'useEffect' a los imports
import { useState, useMemo, useEffect } from 'react';
import { ContractType, ContractData } from '@/types/contracts';
import ContractTypeSelector from '@/components/features/contracts/ContractTypeSelector';
import ContractForm from '@/components/features/contracts/ContractForm';
import ContractPreview from '@/components/features/contracts/ContractPreview';
import { useContractFinancing } from '@/hooks/Homeksi/useContractFinancing';

const defaultData: ContractData = {
  clientName: '',
  clientId: '',
  clientAddress: '',
  clientCity: 'Cuenca',
  clientPhone: '',
  carMake: 'CHEVROLET',
  carModel: 'SAIL',
  carYear: '2020',
  carPlate: 'ABC-1234',
  carEngine: '',
  carChassis: '',
  carCylinder: '',
  carTonnage: '',
  carCapacity: '5',
  carOrigin: 'ECUADOR',
  carType: 'SEDAN',
  carColor: 'BLANCO',
  carPrice: 15000,
  downPayment: 9000, 
  creditAmount: 0,
  months: 36,
  monthlyInstallment: 0,
  // NO ponemos fecha aquí para evitar error de servidor, la ponemos en el useEffect
};

export default function ContractsPage() {
  const [type, setType] = useState<ContractType>('cash');
  const [data, setData] = useState<ContractData>(defaultData);

  // 2. CORRECCIÓN: "Efecto" para poner la fecha automática al cargar
  useEffect(() => {
    // Solo si no hay fecha seteada, ponemos la actual
    if (!data.date) {
        setData(prev => ({
            ...prev,
            date: new Date().toISOString() // Guarda fecha Y hora
        }));
    }
  }, []); // El array vacío [] asegura que solo corra una vez al entrar

  // Hook Financiero
  const { 
    monthlyPayment, 
    totalDebt, 
    amortizationSchedule, 
    downPaymentAmount,
    termMonths,
    totalReceivable 
  } = useContractFinancing(data.carPrice || 0, data.downPayment, data.months);

  // Datos para vista previa
  const previewData: ContractData = useMemo(() => {
    if (type === 'cash') return data;

    return {
      ...data,
      downPayment: downPaymentAmount,
      monthlyInstallment: monthlyPayment,
      totalReceivable: totalReceivable || totalDebt,
      amortizationSchedule: amortizationSchedule,
      installments: termMonths,
      months: termMonths,
      administrativeFee: 386,
      deviceCost: 686
    };
  }, [data, type, monthlyPayment, totalDebt, amortizationSchedule, downPaymentAmount, termMonths, totalReceivable]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="sticky top-0 z-30 bg-white border-b px-6 py-4 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
          <p className="text-sm text-gray-500">Generación de documentos de Compra-Venta</p>
        </div>
        
        <div className="flex items-center gap-3">
             <ContractTypeSelector current={type} onChange={setType} />
             <button 
                onClick={handlePrint}
                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Imprimir
             </button>
        </div>
      </div>

      <div className="p-6 max-w-[1600px] mx-auto grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4 xl:col-span-3 space-y-6 print:hidden h-fit overflow-y-auto max-h-[calc(100vh-100px)] custom-scrollbar">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <ContractForm 
              type={type} 
              data={{ ...data, monthlyInstallment: monthlyPayment }} 
              onChange={setData} 
            />
          </div>
        </div>

        <div className="lg:col-span-8 xl:col-span-9 flex justify-center bg-gray-200/50 p-8 rounded-xl min-h-[800px] print:p-0 print:bg-white print:m-0 print:block print:w-full">
           <div className="scale-[0.8] md:scale-[0.9] lg:scale-100 origin-top">
              <ContractPreview type={type} data={previewData} />
           </div>
        </div>
      </div>
    </div>
  );
}