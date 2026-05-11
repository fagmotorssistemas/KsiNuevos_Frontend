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
    const tieneAdicionales = Boolean(data.listaCuotasAdicionales?.length);
    const tienePagosCheque = Boolean(data.listaPagosCheque?.length);
    const muestraPaginaAmortizacion = hasAmortization || tieneAdicionales || tienePagosCheque;

    const page7 = (
        <Page7
            data={data}
            hasAmortization={hasAmortization}
            fechaImpresion={fechaImpresion}
        />
    );

    return (
        <div
            className="print:w-[210mm] w-full flex flex-col items-center print:block print:mx-auto"
            style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                WebkitFontSmoothing: 'antialiased',
                textRendering: 'optimizeLegibility',
            }}
        >
            <Page1 data={data} />
            <Page2 data={data} />
            <Page3 data={data} />
            <Page4 data={data} />

            <Page5 data={data} fechaImpresion={fechaImpresion} />

            <Page6
                data={data}
                hasAmortization={hasAmortization}
                fechaImpresion={fechaImpresion}
            />

            {/*
              Tras Pág. 6 fragmentada, el motor suele rellenar el hueco bajo las firmas con el inicio de Pág. 7.
              Los hijos de flex ignoran a menudo break-before al imprimir; forzamos flujo en bloque + salto explícito.
            */}
            {muestraPaginaAmortizacion ? (
                <div
                    data-contract-print-page7=""
                    className="w-full print:block print:w-[210mm] print:mx-auto"
                    style={{
                        breakBefore: 'page',
                        pageBreakBefore: 'always',
                    }}
                >
                    {page7}
                </div>
            ) : (
                page7
            )}
        </div>
    );
}