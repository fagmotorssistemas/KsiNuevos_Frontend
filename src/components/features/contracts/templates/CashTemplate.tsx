import React from 'react';
import { ContractData } from '@/types/contracts';

// Importamos solo las páginas necesarias para CONTADO
import ContractMainPage from '../pages/1_ContractMainPage';
import LawfulFundsPage from '../pages/4_LawfulFundsPage';
import IntermediationPage from '../pages/5_IntermediationPage';

interface Props {
  data: ContractData;
}

export default function CashTemplate({ data }: Props) {
  return (
    <div className="print:block">
      {/* 1. Contrato Principal (Modo Contado) 
          Esto ajustará la Cláusula Segunda para decir "PAGADO DE CONTADO" 
      */}
      <ContractMainPage data={data} mode="cash" />

      {/* 2. Formulario de Origen Lícito de Recursos (UAFE) 
          Obligatorio para justificar el ingreso del dinero de contado
      */}
      <LawfulFundsPage data={data} />
      
      {/* 3. Carta de Intermediación 
          Justifica la venta del vehículo consignado
      */}
      <IntermediationPage data={data} />
    </div>
  );
}