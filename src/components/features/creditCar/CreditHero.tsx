'use client'; // 1. IMPORTANTE: Esto define que es un componente de cliente
import { useRouter } from 'next/navigation'; // 2. Importamos el router


export const CreditHero = () => {
    const router = useRouter(); // 3. Inicializamos el router

    // Función para navegar al dar click en Crédito Directo
    const handleDirectCreditClick = () => {
        router.push('/simulador?mode=direct'); 
    };

    // Función para Bancos (opcional, si también quieres que navegue)
    const handleBankClick = () => {
        router.push('/simulador?mode=bank');
    };

  return (
    <section className="relative bg-[#ffffff] pt-16 pb-24 overflow-hidden font-sans">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        
        {/* 1. Títulos y Subtítulos */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-extrabold text-[#333333] mb-4 leading-tight">
            Tu auto soñado <br className="hidden md:block" />
            financiado a tu medida
          </h1>
          <p className="text-lg text-gray-600">
            Solo necesitás tu identificación para simular. Elegí la opción que prefieras:
          </p>
        </div>

        {/* LOS BOTONES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
          
          {/* BOTÓN DIRECTO */}
          <button 
            onClick={handleDirectCreditClick}
            className="group bg-white hover:bg-[#ec2b2b] border-2 border-transparent hover:border-[#ec2b2b] shadow-lg rounded-xl p-6 text-left transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="bg-blue-100 text-[#ec2b2b] text-xs font-bold px-2 py-1 rounded group-hover:bg-white group-hover:text-[#ec2b2b]">
                RECOMENDADO
              </span>
              {/* Icono... */}
              <svg className="w-6 h-6 text-[#ec2b2b] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-white mb-1">Crédito Directo</h3>
            <p className="text-sm text-gray-500 group-hover:text-blue-100">
              Aprobación inmediata con nosotros. Sin bancos ni trámites largos.
            </p>
            <div className="mt-5 inline-block bg-[#ec2b2b] group-hover:bg-white text-white group-hover:text-[#ec2b2b] px-4 py-2 rounded-lg text-sm font-bold transition-colors">
              Click aquí para simular
            </div>
          </button>

          {/* BOTÓN BANCOS */}
          <button 
            onClick={handleBankClick}
            className="group bg-white hover:bg-gray-800 border-2 border-transparent hover:border-gray-800 shadow-lg rounded-xl p-6 text-left transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded group-hover:bg-gray-700 group-hover:text-white">
                TRADICIONAL
              </span>
              {/* Icono... */}
              <svg className="w-6 h-6 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-white mb-1">Bancos y Cooperativas</h3>
            <p className="text-sm text-gray-500 group-hover:text-gray-300">
              Gestionamos tu crédito con entidades externas. Tasas preferenciales.
            </p>
              <div className="mt-5 inline-block bg-[#1a1a1a] group-hover:bg-white text-white group-hover:text-[#1a1a1a] px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 shadow-sm">
              Click aquí para simular
            </div>
          </button>

        </div>

        {/* 3. Imagen del Auto y Notas */}
        <div className="relative max-w-5xl mx-auto mt-8">
          
          {/* Nota Izquierda */}
          <div className="absolute top-0 left-0 md:-left-4 md:top-10 hidden md:block w-48 text-[#ec2b2b] transform -rotate-2">
             <p className="font-handwriting font-bold text-lg bg-blue-20/90 p-1 rounded">
               ELEGÍS TU ADELANTO Y PLAZO
             </p>
             <svg className="w-12 h-12 ml-8 mt-1 transform rotate-12" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10,10 Q50,50 80,80" strokeLinecap="round"/></svg>
          </div>

          {/* IMAGEN DEL AUTO */}
          <div className="relative z-10 flex justify-center">
             <img 
               src="/raptor.png" 
               alt="Auto Financiado" 
               className="w-full max-w-5xl object-contain drop-shadow-2xl"
             />
          </div>

          {/* Nota Derecha */}
          <div className="absolute top-10 right-0 md:-right-4 md:top-20 hidden md:block w-48 text-[#ec2b2b] text-right transform rotate-1">
             <p className="font-handwriting font-bold text-lg bg-blue-20/80 p-1 rounded">
               PAGÁS MES A MES FIJO
             </p>
             <svg className="w-12 h-12 mr-8 mt-1 ml-auto transform -rotate-12 scale-x-[-1]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10,10 Q50,50 80,80" strokeLinecap="round"/></svg>
          </div>

        </div>
      </div>
    </section>
  );
};