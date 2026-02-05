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
}

/**
 * Componente principal que agrupa todas las páginas del contrato.
 * Se asegura de mantener la consistencia tipográfica en todo el documento.
 */
export function ContractDocument({ data, amortizacion }: ContractDocumentProps) {
    // Determinamos si hay datos de amortización para mostrar las páginas correspondientes
    const hasAmortization = amortizacion && amortizacion.length > 0;

    return (
        <div 
            className="print:w-[210mm] w-full flex flex-col items-center"
            style={{ 
                // Refuerzo de tipografía para evitar cambios entre pantalla e impresora
                fontFamily: 'Arial, Helvetica, sans-serif',
                WebkitFontSmoothing: 'antialiased',
                textRendering: 'optimizeLegibility'
            }}
        >
            {/* Página 1: Contrato de Compra Venta */}
            <Page1 data={data} />
            
            {/* Página 2: Pagaré */}
            <Page2 data={data} />
            
            {/* Página 3: Carta de Resciliación */}
            <Page3 data={data} />
            
            {/* Página 4: Formulario Licitud de Recursos */}
            <Page4 data={data} />
            
            {/* Página 5: Carta de Intermediación */}
            <Page5 data={data} />
            
            {/* Página 6: Tabla de Amortización (Detalle técnico) */}
            <Page6 data={data} hasAmortization={hasAmortization} />
            
            {/* Página 7: Resumen y Firmas de Amortización */}
            <Page7 data={data} hasAmortization={hasAmortization} />
        </div>
    );
}