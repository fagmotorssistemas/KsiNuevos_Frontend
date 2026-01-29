import React from 'react';
import Link from 'next/link';
import { ArrowRight, Calculator } from 'lucide-react';

export const CreditBanner = () => {
  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 mb-16 shadow-sm">
      {/* Decoración de fondo sutil en gris/rojo muy claro */}
      <div className="absolute top-0 right-0 w-1/2 h-full overflow-hidden pointer-events-none opacity-[0.03]">
        <svg viewBox="0 0 400 400" className="w-full h-full transform translate-x-20 -translate-y-10">
          <rect x="50" y="50" width="300" height="300" rx="40" fill="none" stroke="#dc2626" strokeWidth="8" transform="rotate(15)" />
          <rect x="100" y="100" width="300" height="300" rx="40" fill="none" stroke="#dc2626" strokeWidth="8" transform="rotate(15)" />
        </svg>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 items-center gap-12 p-8 md:p-16">
        {/* Columna Izquierda: Mensaje principal */}
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-bold tracking-wide uppercase">
            <Calculator size={16} />
            Tu próximo auto a un click
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
              Paga tu próximo auto <br/><span className="text-blue-600 underline decoration-blue-200">en 3 años</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-md leading-relaxed">
              No dejes pasar la oportunidad. Arma un presupuesto en minutos.
            </p>
          </div>

          <Link href="/creditCar" className="inline-block">
            <button className="flex items-center gap-3 bg-red-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-red-700 transition-all shadow-[0_20px_40px_rgba(220,38,38,0.2)] hover:-translate-y-1 active:scale-95">
              Simular mi crédito
              <ArrowRight size={20} />
            </button>
          </Link>
        </div>

        {/* Columna Derecha: El Visualizador de Valores (Inspirado en tu captura) */}
        <div className="flex justify-center lg:justify-end">
          <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.06)] border border-slate-50 w-full max-w-md">
            <p className="text-slate-400 font-medium mb-1 uppercase text-xs tracking-widest">Tu préstamo estimado</p>
            <h4 className="text-5xl font-black text-slate-900 mb-8 tracking-tight">
              $ 20,000
            </h4>
            
            <div className="space-y-7">
              {/* Pago Inicial */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Pago inicial</span>
                  <span className="text-xl font-bold text-slate-900">$ 12,000</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-600 w-[60%] rounded-full shadow-[0_0_10px_rgba(220,38,38,0.4)]"></div>
                </div>
              </div>

              {/* Mensualidades */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Mensualidades</span>
                  <span className="text-xl font-bold text-slate-900">$ 413</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-800 w-[40%] rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <span>Plazos flexibles</span>
              <span>Aprobación inmediata</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};