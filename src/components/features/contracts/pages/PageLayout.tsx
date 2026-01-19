import React from 'react';

interface Props {
  children: React.ReactNode;
  title?: string; // Título opcional para el encabezado (ej: ANEXO 1)
}

export default function PageLayout({ children, title = "DOCUMENTO LEGAL" }: Props) {
  return (
    <div 
      // Clases para visualizar en pantalla (sombra, margen) y para imprimir (ancho completo, sin sombra)
      className="bg-white mx-auto relative flex flex-col print:w-full print:h-screen print:m-0 print:shadow-none"
      style={{ 
        width: '210mm', 
        height: '297mm',      // Altura fija A4
        padding: '15mm 20mm', // Márgenes internos seguros para impresión
        marginBottom: '10mm', // Separación visual entre hojas en tu pantalla
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', // Sombra bonita solo en pantalla
      }}
    >
      {/* --- ENCABEZADO COMÚN (Se repite en todas las hojas) --- */}
      <header className="mb-6 border-b border-gray-400 pb-2 flex justify-between items-end flex-shrink-0">
        
        {/* Logo a la izquierda */}
        <div className="flex-shrink-0">
            {/* Usamos <img> normal para evitar conflictos de rutas al imprimir rápido, 
                pero asegúrate de que /logol.png esté en tu carpeta public */}
            <img 
                src="/logol.png" 
                alt="Logo K-SI NUEVOS" 
                className="h-7 w-auto object-contain object-left" 
                onError={(e) => { e.currentTarget.style.display = 'none'; }} 
            />
        </div>

        {/* Título a la derecha */}
        <div className="text-right">
            <h2 className="font-serif font-bold text-lg text-black leading-none">
                K-SI NUEVOS
            </h2>
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mt-1">
                {title}
            </p>
        </div>
      </header>

      {/* --- CONTENIDO DINÁMICO (Aquí se inyecta el texto de cada contrato) --- */}
      <main className="flex-grow flex flex-col justify-start text-justify leading-relaxed text-black font-serif text-[10pt]">
        {children}
      </main>

      {/* --- PIE DE PÁGINA COMÚN --- */}
      <footer className="mt-auto pt-4 text-center text-[7pt] text-gray-400 border-t border-gray-100 flex-shrink-0">
          <p>K-SI NUEVOS - Av. España y Sevilla - Cuenca, Ecuador</p>
      </footer>
    </div>
  );
}