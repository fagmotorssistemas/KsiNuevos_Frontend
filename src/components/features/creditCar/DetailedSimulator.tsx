import React from "react";
// Importamos los dos componentes que YA TIENES creados y arreglados
import { DirectDetailedSimulator } from "./DirectCredit/DirectDetailedSimulator"; 
import { BankDetailedSimulator } from "./BankCredit/BankDetailedSimulator";   

interface Props {
  mode: "direct" | "bank"; 
}

export const DetailedSimulator = ({ mode }: Props) => {
  // LÓGICA SIMPLE:
  // Si el modo es "bank", mostramos el componente de Banco.
  // Si no, mostramos el de Directo.
  
  if (mode === "bank") {
    return <BankDetailedSimulator />;
  }

  return <DirectDetailedSimulator />;
};