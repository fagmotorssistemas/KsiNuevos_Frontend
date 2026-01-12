import React from 'react';

// Iconos locales para este componente
const CheckIcon = () => (
  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
);
const ChevronDown = () => (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
);

export const HeroSell = () => {
  return (
    <section className="relative pt-12 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left: Text & Value Prop */}
          <div className="space-y-6">
            <div className="inline-flex items-center space-x-2 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                <span className="text-xs font-bold text-red-700 uppercase tracking-widest">Cotización Instantánea</span>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight leading-tight text-black">
              Vende tu auto <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">
                sin complicaciones.
              </span>
            </h1>
            
            <p className="text-lg text-neutral-600 max-w-lg leading-relaxed">
              Recibe una oferta al instante. Sin citas con extraños, sin trámites burocráticos y con pago inmediato 100% seguro.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <div className="flex items-center gap-2">
                    <div className="bg-neutral-100 p-1 rounded-full"><CheckIcon /></div>
                    <span className="text-sm font-medium text-neutral-700">Pago en 1 hora</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-neutral-100 p-1 rounded-full"><CheckIcon /></div>
                    <span className="text-sm font-medium text-neutral-700">Trámite gratuito</span>
                </div>
            </div>
          </div>

          {/* Right: The "Quoter" Card */}
          <div className="relative">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-red-50 rounded-full blur-3xl opacity-50 -z-10"></div>
            
            <div className="bg-white rounded-3xl shadow-2xl shadow-neutral-200/50 border border-neutral-100 p-6 sm:p-8">
                <h3 className="text-xl font-bold mb-6 text-center">¡Cotiza tu auto ahora!</h3>
                
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Año</label>
                        <div className="relative">
                            <select className="w-full appearance-none bg-neutral-50 border border-neutral-200 text-black py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium">
                                <option>Selecciona el año</option>
                                <option>2024</option>
                                <option>2023</option>
                                <option>2022</option>
                            </select>
                            <div className="absolute right-4 top-4 pointer-events-none"><ChevronDown /></div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Marca</label>
                        <div className="relative">
                            <select className="w-full appearance-none bg-neutral-50 border border-neutral-200 text-black py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium">
                                <option>Selecciona la marca</option>
                                <option>Toyota</option>
                                <option>Chevrolet</option>
                            </select>
                            <div className="absolute right-4 top-4 pointer-events-none"><ChevronDown /></div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Modelo</label>
                        <div className="relative">
                            <select className="w-full appearance-none bg-neutral-50 border border-neutral-200 text-black py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium">
                                <option>Selecciona el modelo</option>
                            </select>
                            <div className="absolute right-4 top-4 pointer-events-none"><ChevronDown /></div>
                        </div>
                    </div>

                    <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-600/30 transition-all transform hover:-translate-y-0.5 mt-4">
                        Recibir Oferta
                    </button>
                </form>
                
                <p className="text-xs text-center text-neutral-400 mt-4">
                    Al continuar aceptas nuestros términos y condiciones.
                </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};