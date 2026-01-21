// src/components/features/contracts/ContractDocument.tsx
import { ContratoDetalle, CuotaAmortizacion } from "@/types/contratos.types";
import { Page1 } from "./pages/Page1";
import { Page2 } from "./pages/Page2";
import { Page3 } from "./pages/Page3";
import { Page4 } from "./pages/Page4";
import { Page5 } from "./pages/Page5";
import { Page6 } from "./pages/Page6";
import { Page7 } from "./pages/Page7";

interface ContractDocumentProps {
    data: ContratoDetalle;
    amortizacion: CuotaAmortizacion[];
}

export function ContractDocument({ data, amortizacion }: ContractDocumentProps) {
    // Determinamos si es crédito basado en si existen cuotas
    // O podrías usar: const esCredito = data.formaPago.includes("CREDITO");
    const hasAmortization = amortizacion && amortizacion.length > 0;

    return (
        <div className="print:w-full">
            <Page1 data={data} />
            <Page2 data={data} />
            <Page3 data={data} />
            <Page4 data={data} />
            <Page5 data={data} />
            <Page6 data={data} />
            {/* La página 7 se renderiza condicionalmente dentro del componente o aquí */}
            <Page7 data={data} hasAmortization={hasAmortization} />
        </div>
    );
}