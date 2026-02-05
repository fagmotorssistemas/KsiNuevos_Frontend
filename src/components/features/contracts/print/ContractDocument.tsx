// src/components/features/contracts/print/ContractDocument.tsx
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
    fechaImpresion?: string; // NUEVA PROP
}

export function ContractDocument({ data, amortizacion, fechaImpresion }: ContractDocumentProps) {
    const hasAmortization = amortizacion && amortizacion.length > 0;

    return (
        <div 
            className="print:w-[210mm] w-full flex flex-col items-center"
            style={{ 
                fontFamily: 'Arial, Helvetica, sans-serif',
                WebkitFontSmoothing: 'antialiased',
                textRendering: 'optimizeLegibility'
            }}
        >
            <Page1 data={data} />
            <Page2 data={data} />
            <Page3 data={data} />
            <Page4 data={data} />
            
            {/* PASAMOS LA FECHA A LAS PÁGINAS FINALES */}
            <Page5 data={data} fechaImpresion={fechaImpresion} />
            
            <Page6 
                data={data} 
                hasAmortization={hasAmortization} 
                fechaImpresion={fechaImpresion} 
            />
            
            <Page7 
                data={data} 
                hasAmortization={hasAmortization} 
                fechaImpresion={fechaImpresion} 
            />
        </div>
    );
}