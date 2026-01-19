import React from 'react';
import { ContractType } from '@/types/contracts';

interface Props {
  current: ContractType;
  onChange: (type: ContractType) => void;
}

export default function ContractTypeSelector({ current, onChange }: Props) {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-1 border border-gray-200">
      <button
        onClick={() => onChange('cash')}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
          current === 'cash' 
            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Contado
      </button>
      <button
        onClick={() => onChange('credit')}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
          current === 'credit' 
            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Crédito / Cuotas
      </button>
    </div>
  );
}