import { AccountingSidebar } from '@/components/layout/accounting-sidebar';

export default function AccountingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // Contenedor principal: pantalla completa, fondo gris claro para contraste
        <div className="flex h-screen bg-gray-50 overflow-hidden">

            {/* Sidebar fijo a la izquierda */}
            <AccountingSidebar />

            {/* Área de contenido principal */}
            <main className="flex-1 flex flex-col h-full w-full relative">
                {/* pt-16 md:pt-0: Agrega padding superior solo en móvil 
          para que el contenido no quede oculto detrás del header móvil 
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