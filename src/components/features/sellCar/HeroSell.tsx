'use client'; 

import React, { useState } from 'react';
import { SellWizardContainer } from './SellWizardContainer'; // Importamos el modal

// Iconos locales
const CheckIcon = () => (
  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
);
const ChevronDown = () => (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
);

export const HeroSell = () => {
  // Estado para abrir/cerrar el modal
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  
  // Estado para capturar los datos iniciales del Hero
  const [heroData, setHeroData] = useState({
      year: '',
      brand: '',
      model: ''
  });

  const handleOpenWizard = (e: React.FormEvent) => {
      e.preventDefault();
      // Validación simple antes de abrir
      if(!heroData.year || !heroData.brand) {
          alert("Por favor selecciona año y marca para comenzar.");
          return;
      }
      setIsWizardOpen(true);
  };

  return (
    <section className="relative pt-12 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* IZQUIERDA: Texto */}
            <div className="space-y-6">
                 <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight leading-tight text-black">
                  Vende tu auto <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">
                    sin complicaciones.
                  </span>
                </h1>
                <p className="text-lg text-neutral-600 max-w-lg leading-relaxed">
                  Recibe una oferta al instante. Sin citas con extraños, sin trámites burocráticos y con pago inmediato 100% seguro.
                </p>
                
                <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                            <CheckIcon />
                        </div>
                        <span className="text-neutral-700 font-medium">Cotización gratuita</span>
                    </div>
                    <div className="flex items-center gap-3">
                         <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                            <CheckIcon />
                        </div>
                        <span className="text-neutral-700 font-medium">Pago inmediato vía transferencia</span>
                    </div>
                    <div className="flex items-center gap-3">
                         <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                            <CheckIcon />
                        </div>
                        <span className="text-neutral-700 font-medium">Trámite notarial incluido</span>
                    </div>
                </div>
            </div>

            {/* DERECHA: Card del Formulario */}
            <div className="relative">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-red-50 rounded-full blur-3xl opacity-50 -z-10"></div>
            
                <div className="bg-white rounded-3xl shadow-2xl shadow-neutral-200/50 border border-neutral-100 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-6 text-center">¡Cotiza tu auto ahora!</h3>
                    
                    <form className="space-y-4" onSubmit={handleOpenWizard}>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Año</label>
                            <div className="relative">
                                <select 
                                    className="w-full appearance-none bg-neutral-50 border border-neutral-200 text-black py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium"
                                    onChange={(e) => setHeroData({...heroData, year: e.target.value})}
                                    value={heroData.year}
                                >
                                    <option value="">Selecciona el año</option>
                                    <option value="2024">2024</option>
                                    <option value="2023">2023</option>
                                    <option value="2022">2022</option>
                                    <option value="2021">2021</option>
                                    <option value="2020">2020</option>
                                    <option value="2019">2019</option>
                                    <option value="2018">2018</option>
                                    <option value="2017">2017</option>
                                    <option value="2016">2016</option>
                                    <option value="2015">2015</option>
                                </select>
                                <div className="absolute right-4 top-4 pointer-events-none"><ChevronDown /></div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Marca</label>
                            <div className="relative">
                                <select 
                                    className="w-full appearance-none bg-neutral-50 border border-neutral-200 text-black py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium"
                                    onChange={(e) => setHeroData({...heroData, brand: e.target.value})}
                                    value={heroData.brand}
                                >
                                    <option value="">Selecciona la marca</option>
                                    <option value="Toyota">Toyota</option>
                                    <option value="Chevrolet">Chevrolet</option>
                                    <option value="Kia">Kia</option>
                                    <option value="Hyundai">Hyundai</option>
                                    <option value="Mazda">Mazda</option>
                                    <option value="Nissan">Nissan</option>
                                    <option value="Ford">Ford</option>
                                    <option value="Volkswagen">Volkswagen</option>
                                </select>
                                <div className="absolute right-4 top-4 pointer-events-none"><ChevronDown /></div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Modelo</label>
                            <input 
                                type="text"
                                placeholder="Ej: Yaris, Sail, Spark..."
                                className="w-full bg-neutral-50 border border-neutral-200 text-black py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium placeholder:text-gray-400"
                                onChange={(e) => setHeroData({...heroData, model: e.target.value})}
                                value={heroData.model}
                            />
                        </div>

                        <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-600/30 transition-all transform hover:-translate-y-0.5 mt-4">
                            Continuar Cotización
                        </button>
                    </form>
                    
                    <p className="text-xs text-center text-neutral-400 mt-4">
                        Al continuar aceptas nuestros términos y condiciones.
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* CORRECCIÓN: Renderizado Condicional */}
      {isWizardOpen && (
          <SellWizardContainer 
            isOpen={isWizardOpen} 
            onClose={() => setIsWizardOpen(false)}
            initialData={{
                year: parseInt(heroData.year) || 2024,
                brand: heroData.brand,
                model: heroData.model
            }}
          />
      )}

    </section>
  );
};