// src/components/features/contracts/pages/ContractPageLayout.tsx
import React from "react";

interface Props {
    children: React.ReactNode;
    pageNumber?: number;
}

export function ContractPageLayout({ children, pageNumber }: Props) {
    return (
        <div className="relative w-[210mm] min-h-[297mm] bg-white mx-auto shadow-2xl mb-8 p-[25mm] pt-[20mm] pb-[20mm] text-justify font-serif text-[11pt] leading-[1.6] text-black print:shadow-none print:mb-0 print:break-after-page print:w-full print:h-auto print:mx-0">
            {/* Contenido de la página */}
            <div className="h-full flex flex-col relative z-10">
                {children}
            </div>

            {/* Número de página (Discreto) */}
            {pageNumber && (
                <div className="absolute bottom-6 right-8 text-[10px] text-gray-400 print:text-black">
                    Pág. {pageNumber}
                </div>
            )}
        </div>
    );
}