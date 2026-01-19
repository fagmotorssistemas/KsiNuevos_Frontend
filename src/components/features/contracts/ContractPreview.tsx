import React from 'react';
import { ContractType, ContractData } from '@/types/contracts';
import CashTemplate from './templates/CashTemplate';
import CreditTemplate from './templates/CreditTemplate';

interface Props {
  type: ContractType;
  data: ContractData;
}

export default function ContractPreview({ type, data }: Props) {
  return (
    // CAMBIO IMPORTANTE:
    // Quitamos 'bg-white', 'shadow', 'width: 210mm'.
    // Ahora es un contenedor gris (mesa de trabajo) que centra las hojas.
    <div className="w-full flex justify-center bg-gray-100 p-8 print:p-0 print:bg-white print:m-0">
      
      <div className="print:w-full">
        {/* Ya no hay <header> aquí, porque PageLayout ya tiene el logo en cada hoja */}
        
        {type === 'cash' ? (
            <CashTemplate data={data} />
        ) : (
            <CreditTemplate data={data} />
        )}
      </div>

    </div>
  );
}