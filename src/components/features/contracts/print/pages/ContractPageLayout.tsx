// src/components/features/contracts/pages/ContractPageLayout.tsx
import React from "react";

interface Props {
    children: React.ReactNode;
    pageNumber?: number;
    /**
     * En impresión, permite que esta sección ocupe varias hojas (p. ej. tabla de amortización larga).
     * Sin esto, `overflow-hidden` + altura fija A4 recorta el contenido que no cabe en una hoja.
     */
    allowPrintOverflow?: boolean;
}

export function ContractPageLayout({
    children,
    pageNumber,
    allowPrintOverflow = false,
}: Props) {
    const printSizeClasses = allowPrintOverflow
        ? [
              "print:h-auto print:min-h-0 print:overflow-visible print:break-inside-auto",
              /* Repite padding en cada hoja cuando el bloque se parte; evita cuotas pegadas al borde */
              "print:[box-decoration-break:clone] print:[-webkit-box-decoration-break:clone]",
              "print:px-[26mm] print:py-[22mm]",
          ].join(" ")
        : "print:h-[296mm] print:min-h-0 print:overflow-hidden print:break-inside-avoid";

    const innerWrapperClasses = allowPrintOverflow
        ? "flex flex-col relative z-10 print:overflow-visible"
        : "h-full flex flex-col relative z-10 overflow-hidden";

    return (
        <div 
            className={`
                relative 
                w-[210mm] min-h-[297mm] 
                bg-white mx-auto shadow-2xl mb-8 
                text-justify font-['Arial'] text-[11pt] leading-[1.3] text-black 
                px-[25mm] py-[20mm]
                print:shadow-none 
                print:mb-0 
                print:w-[210mm] 
                print:mx-0 
                print:break-after-page 
                ${printSizeClasses}
            `}
        >
            <div className={innerWrapperClasses}>
                <div className="flex-1 min-h-0">
                    {children}
                </div>
            </div>

            {/* Número de página con posición fija en puntos para precisión */}
            {pageNumber && (
                <div className="absolute bottom-[40pt] right-[70pt] text-[9pt] text-gray-500 print:text-black">
                    Pág. {pageNumber}
                </div>
            )}
        </div>
    );
}