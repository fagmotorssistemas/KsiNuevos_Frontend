'use client'; 

import React, { useState } from 'react';
import { SellWizardContainer } from './SellWizardContainer';
import { ECUADOR_CAR_DATA } from '@/data/ecuadorCars';

const CheckIcon = () => (
  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
);

export const HeroSell = () => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  
  const [heroData, setHeroData] = useState({ year: '', brand: '', model: '' });

  // ESTADOS SUGERENCIAS
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [showBrandSugg, setShowBrandSugg] = useState(false);
  
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [showModelSugg, setShowModelSugg] = useState(false);
  const [yearError, setYearError] = useState('');

  // ----------------------------------------------------
  // LOGICA MARCA
  // ----------------------------------------------------
  const handleBrandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHeroData({ ...heroData, brand: val, model: '' }); // Reseteamos modelo

    if (val.length > 0) {
      const matches = Object.keys(ECUADOR_CAR_DATA).filter(brand => 
        brand.toLowerCase().includes(val.toLowerCase())
      );
      setBrandSuggestions(matches);
      setShowBrandSugg(true);
    } else {
      setShowBrandSugg(false);
    }
  };

  const selectBrand = (brand: string) => {
    // 1. Guardamos la marca exacta
    setHeroData({ ...heroData, brand: brand, model: '' }); 
    // 2. Cerramos la lista
    setShowBrandSugg(false); 
  };

  // ----------------------------------------------------
  // LOGICA MODELO
  // ----------------------------------------------------
  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHeroData({ ...heroData, model: val });

    // IMPORTANTE: Buscamos la llave original en la data
    // (Ej: Si user tiene "toyota", buscamos "Toyota" en la data)
    const currentBrandKey = Object.keys(ECUADOR_CAR_DATA).find(
      k => k.toLowerCase() === heroData.brand.toLowerCase()
    );

    if (val.length > 0 && currentBrandKey) {
      // Obtenemos los modelos de esa marca
      const models = ECUADOR_CAR_DATA[currentBrandKey] || [];
      
      const matches = models.filter(m => 
        m.toLowerCase().includes(val.toLowerCase())
      );
      setModelSuggestions(matches);
      setShowModelSugg(true);
    } else {
      setShowModelSugg(false);
    }
  };

  const selectModel = (model: string) => {
    setHeroData({ ...heroData, model: model });
    setShowModelSugg(false);
  };

  // ----------------------------------------------------
  // UTILS
  // ----------------------------------------------------
  const handleOpenWizard = (e: React.FormEvent) => {
      e.preventDefault();
      if(!heroData.year || !heroData.brand || !heroData.model) {
          alert("Por favor ingresa todos los datos.");
          return;
      }
      setIsWizardOpen(true);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Expresión regular: Solo permite números (^\d+$) o cadena vacía
    if (val === '' || /^\d+$/.test(val)) {
        setHeroData({ ...heroData, year: val });
        setYearError(''); // Si es número, borramos el error
    } else {
        // Si intenta escribir algo que NO es número
        setYearError('Ingrese solo números');
    }
};

  return (
    <section className="relative pt-12 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Texto Izquierdo (Sin cambios) */}
            <div className="space-y-6">
                 <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-black">
                  Vende tu auto <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">
                    sin complicaciones.
                  </span>
                </h1>
                <p className="text-lg text-neutral-600 max-w-lg">
                 Sin citas con extraños, sin trámites burocráticos y con pago 100% seguro.
                </p>
                <div className="space-y-4 pt-4">
                    {["Cotización gratuita", "Pago vía transferencia", "Trámite notarial"].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                            <CheckIcon />
                        </div>
                        <span className="text-neutral-700 font-medium">{item}</span>
                    </div>
                    ))}
                </div>
            </div>

            {/* Card Formulario */}
            <div className="relative">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-red-50 rounded-full blur-3xl opacity-50 -z-10"></div>
            
                <div className="bg-white rounded-3xl shadow-2xl shadow-neutral-200/50 border border-neutral-100 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-6 text-center">¡Cotiza tu auto ahora!</h3>
                    
                    <form className="space-y-4" onSubmit={handleOpenWizard}>
                        
                        {/* --- INPUT MARCA --- */}
                        <div className="space-y-2 relative">
                            <label className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Marca</label>
                            <input 
                                type="text"
                                placeholder="Ej: Toyota, Chevrolet..."
                                className="w-full bg-neutral-50 border border-neutral-200 text-black py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium placeholder:text-gray-400"
                                onChange={handleBrandChange}
                                onBlur={() => setShowBrandSugg(false)} // Ya no necesitamos timeout
                                value={heroData.brand}
                                autoComplete="off"
                            />
                            
                            {/* LISTA SUGERENCIAS MARCA */}
                            {showBrandSugg && brandSuggestions.length > 0 && (
                                <ul className="absolute z-50 w-full bg-white border border-neutral-200 rounded-xl shadow-xl max-h-60 overflow-y-auto mt-1 left-0">
                                    {brandSuggestions.map((brand) => (
                                        <li 
                                            key={brand}
                                            // 🚨 AQUÍ ESTÁ EL CAMBIO CLAVE: onMouseDown en lugar de onClick
                                            onMouseDown={() => selectBrand(brand)}
                                            className="px-4 py-2 hover:bg-red-50 cursor-pointer text-sm font-medium text-neutral-700 transition-colors border-b border-neutral-50 last:border-0"
                                        >
                                            {brand}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* --- INPUT MODELO --- */}
                        <div className="space-y-2 relative">
                            <label className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Modelo</label>
                            <input 
                                type="text"
                                placeholder="Ej: Yaris, Sail..."
                                className="w-full bg-neutral-50 border border-neutral-200 text-black py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all font-medium placeholder:text-gray-400"
                                onChange={handleModelChange}
                                onBlur={() => setShowModelSugg(false)} // Ya no necesitamos timeout
                                value={heroData.model}
                                autoComplete="off"
                                disabled={!heroData.brand} 
                            />
                             
                             {/* LISTA SUGERENCIAS MODELO */}
                             {showModelSugg && modelSuggestions.length > 0 && (
                                <ul className="absolute z-50 w-full bg-white border border-neutral-200 rounded-xl shadow-xl max-h-60 overflow-y-auto mt-1 left-0">
                                    {modelSuggestions.map((model) => (
                                        <li 
                                            key={model}
                                            // 🚨 AQUÍ TAMBIÉN: onMouseDown
                                            onMouseDown={() => selectModel(model)}
                                            className="px-4 py-2 hover:bg-red-50 cursor-pointer text-sm font-medium text-neutral-700 transition-colors border-b border-neutral-50 last:border-0"
                                        >
                                            {model}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Año</label>
                            <input 
                                type="text"
                                inputMode="numeric"
                                placeholder="Ej: 2022"
                                // Aquí cambiamos el color del borde si hay error
                                className={`w-full bg-neutral-50 border text-black py-3 px-4 rounded-xl focus:outline-none focus:ring-2 transition-all font-medium placeholder:text-gray-400 
                                    ${yearError 
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                                        : 'border-neutral-200 focus:border-red-600 focus:ring-red-600/20'
                                    }`}
                                onChange={handleYearChange}
                                value={heroData.year}
                                maxLength={4}
                            />
                            {/* Mensaje de error visible solo si existe */}
                            {yearError && (
                                <p className="text-xs text-red-500 font-medium mt-1 animate-pulse">
                                    {yearError}
                                </p>
                            )}
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

      {isWizardOpen && (
          <SellWizardContainer 
            isOpen={isWizardOpen} 
            onClose={() => setIsWizardOpen(false)}
            initialData={{
                year: parseInt(heroData.year) || 2026,
                brand: heroData.brand,
                model: heroData.model
            }}
          />
      )}

    </section>
  );
};