import React from 'react';
import { ContractData } from '@/types/contracts';

// --- Importamos las 7 Páginas que componen la Carpeta de Crédito ---
import ContractMainPage from '../pages/1_ContractMainPage';       // Imagen 1
import PromissoryNotePage from '../pages/2_PromissoryNotePage';   // Imagen 2
import RescissionPage from '../pages/3_RescissionPage';           // Imagen 3
import LawfulFundsPage from '../pages/4_LawfulFundsPage';         // Imagen 4
import IntermediationPage from '../pages/5_IntermediationPage';   // Imagen 5
import AmortizationTablePage from '../pages/6_AmortizationTablePage'; // Imagen 6
import CreditSummaryPage from '../pages/7_CreditSummaryPage';     // Imagen 7

interface Props {
  data: ContractData;
}

export default function CreditTemplate({ data }: Props) {
  return (
    <div className="print:block w-full">
      
      {/* 1. CONTRATO DE COMPRA VENTA (Versión Crédito)
          - Cláusula Segunda muestra: Entrada + Saldo a Financiar + Cuotas
          - Firma como: DEUDOR
      */}
      <ContractMainPage data={data} mode="credit" />

      {/* 2. PAGARÉ A LA ORDEN
          - Documento legal estricto con renuncia de domicilio y monto total de deuda
      */}
      <PromissoryNotePage data={data} />

      {/* 3. CARTA DE RESCILIACIÓN
          - Documento firmado por adelantado para devolución del auto en caso de impago
      */}
      <RescissionPage data={data} />

      {/* 4. FORMULARIO DE ORIGEN LÍCITO DE RECURSOS (UAFE)
          - Obligatorio para montos > $5,000
      */}
      <LawfulFundsPage data={data} />
      
      {/* 5. CARTA DE INTERMEDIACIÓN
          - Declara que K-SI NUEVOS es intermediario de un auto en consignación
      */}
      <IntermediationPage data={data} />

      {/* 6. TABLA DE AMORTIZACIÓN
          - Detalle mes a mes de las cuotas
      */}
      <AmortizationTablePage data={data} />

      {/* 7. RESUMEN DE CRÉDITO / HOJA DE CIERRE
          - Resumen final con firma de "Acepto" y saldo total
      */}
      <CreditSummaryPage data={data} />

    </div>
  );
}