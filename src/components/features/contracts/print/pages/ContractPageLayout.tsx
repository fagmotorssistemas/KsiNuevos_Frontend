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
                /* Tamaño exacto A4 en pantalla */
                w-[210mm] min-h-[297mm] 
                bg-white mx-auto shadow-2xl mb-8 
                
                /* Tipografía base forzada para evitar variaciones */
                text-justify font-['Arial'] text-[11pt] leading-[1.3] text-black 
                
                /* Padding consistente */
                px-[25mm] py-[20mm]

                /* --- AJUSTES DE IMPRESIÓN --- */
                print:shadow-none 
                print:mb-0 
                print:w-[210mm] 
                
                /* AJUSTE CLAVE: Altura de impresión reducida 1mm */
                /* Esto evita que el borde inferior toque el límite y cree una hoja extra */
                print:h-[296mm] 
                print:min-h-0
                
                print:mx-0 
                
                /* Control estricto de saltos de página */
                print:break-after-page      
                print:break-inside-avoid    
                
                /* Eliminar desbordes que confunden al motor de impresión */
                print:overflow-hidden 
            "
        >
            {/* Contenedor interno con altura controlada */}
            <div className="h-full flex flex-col relative z-10 overflow-hidden">
                <div className="flex-1">
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