import { SellerSidebar } from '@/components/layout/seller-sidebar';

export default function AccountingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // CAMBIO 1: Agregamos 'print:h-auto' y 'print:overflow-visible'
        // Esto evita que la página se corte a la altura de la pantalla al imprimir.
        <div className="flex h-screen bg-gray-50 overflow-hidden print:h-auto print:overflow-visible print:block">

            {/* Sidebar fijo a la izquierda - Oculto al imprimir */}
            <div className="print:hidden">
                <SellerSidebar  />
            </div>

            {/* Área de contenido principal */}
            <main className="flex-1 flex flex-col h-full w-full relative print:h-auto print:block">
                
                {/* CAMBIO 2: Aquí es donde está la magia.
                   - 'print:overflow-visible': Elimina la barra de scroll y deja fluir el contenido.
                   - 'print:h-auto': Permite que el div crezca tanto como el contenido requiera.
                   - 'print:p-0': (Opcional) Quita el padding para aprovechar todo el papel.
                */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 w-full print:overflow-visible print:h-auto print:p-0">
                    
                    {/* Contenedor con ancho máximo */}
                    <div className="max-w-7xl mx-auto h-full print:h-auto print:w-full print:max-w-none">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}