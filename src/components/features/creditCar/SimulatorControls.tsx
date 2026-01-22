import React from "react";
import type { UnifiedSimulatorState } from "../../../types/simulator.types";
import { DirectControls } from "./DirectCredit/DirectControls";
import { BankControls } from "./BankCredit/BankControls";

interface Props {
  isSimulated: boolean;
  setIsSimulated: (v: boolean) => void;
  data: UnifiedSimulatorState;
  variant: "direct" | "bank"; // <--- 3. RECIBIMOS EL DATO
}

export const SimulatorControls = ({ setIsSimulated, data, variant }: Props) => {
  return (
    <div className="p-6 md:p-8 border-r border-gray-100 flex flex-col justify-center bg-white h-full">
      
      {/* 4. SEPARACIÓN DE LÓGICA VISUAL */}
      {variant === "direct" ? (
        <DirectControls setIsSimulated={setIsSimulated} data={data} />
      ) : (
        <BankControls setIsSimulated={setIsSimulated} data={data} />
      )}

    </div>
  );
};