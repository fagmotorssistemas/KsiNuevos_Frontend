import { AccountingSidebar } from '@/components/layout/accounting-sidebar';
import { AccountingRoleGuard } from '@/components/layout/AccountingRoleGuard';

export default function AccountingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AccountingRoleGuard>
            {/* Contenedor principal: pantalla completa, fondo gris claro para contraste */}
            <div className="flex h-screen bg-gray-50 overflow-hidden">

                {/* Sidebar fijo a la izquierda */}
                <AccountingSidebar />

                {/* Área de contenido principal */}
                <main className="flex-1 flex flex-col h-full w-full relative">
                    {/* pt-16 md:pt-0: Agrega padding superior solo en móvil 
          para que el contenido no quede oculto detrás del header móvil 
        */}
                    <div className="flex-1 overflow-y-auto px-4 md:px-6 xl:px-8 py-4 md:py-8 pt-20 md:pt-8 w-full">
                        {/* Un poco más ancho que 7xl: aprovecha pantallas grandes sin full-bleed */}
                        <div className="max-w-[92rem] mx-auto h-full w-full">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </AccountingRoleGuard>
    );
}