// src/components/features/contracts/pages/ContractPageLayout.tsx
import React from "react";

interface Props {
    children: React.ReactNode;
    pageNumber?: number;
}

export function ContractPageLayout({ children, pageNumber }: Props) {
    return (
        <div 
            className="
                relative 
                w-[210mm] min-h-[297mm] /* Tamaño base A4 en pantalla */
                bg-white mx-auto shadow-2xl mb-8 
                /* Padding: 25mm lados, 20mm arriba/abajo */
                px-[25mm] py-[20mm]
                text-justify font-serif text-[11pt] leading-[1.5] text-black 
                
                /* --- ESTILOS DE IMPRESIÓN --- */
                print:shadow-none 
                print:mb-0 
                print:w-[210mm] 
                
                /* AJUSTE CLAVE 1: Altura fija ligeramente menor a A4 (297mm) 
                   para evitar que 1px de desborde cree una hoja nueva */
                print:h-[296mm] 
                print:min-h-0
                
                print:mx-0 
                print:p-[20mm] /* Mantener margen interno */
                
                /* AJUSTE CLAVE 2: Control de saltos de página */
                print:break-after-page      /* Salto después de cada página */
                print:break-inside-avoid    /* Evitar que se parta a la mitad */
                
                /* AJUSTE CLAVE 3: La última página del grupo NO debe tener salto */
                last:print:break-after-auto
                
                print:overflow-hidden /* Cortar contenido que exceda el A4 */
            "
            // ELIMINADO: style={{ pageBreakAfter: 'always' }} 
            // Esto causaba la página en blanco al final. Ahora lo controlamos con clases.
        >
            {/* Contenido de la página */}
            <div className="h-full flex flex-col relative z-10">
                <div className="flex-1">
                 {children}
                </div>
            </div>

            {/* Número de página */}
            {pageNumber && (
                <div className="absolute bottom-[10mm] right-[25mm] text-[10px] text-gray-500 print:text-black">
                    Pág. {pageNumber}
                </div>
            )}
        </div>
    );
}