import React from 'react';
import { TallerSidebar } from '@/components/features/taller/TallerSidebar';

export default function TallerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // Contenedor principal: pantalla completa, fondo gris claro para contraste
        <div className="flex h-screen bg-gray-50 overflow-hidden">

            {/* Sidebar fijo a la izquierda */}
            <TallerSidebar />

            {/* Área de contenido principal */}
            <main className="flex-1 flex flex-col h-full w-full relative">
                {/* pt-16 en móvil para dejar espacio al header fijo del sidebar 
                    pt-0 en desktop porque el sidebar es lateral
                */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 w-full">
                    {/* Contenedor con ancho máximo para pantallas muy grandes */}
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}