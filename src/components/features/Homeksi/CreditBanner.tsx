import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const CreditBanner = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
      <div className="relative overflow-hidden border border-neutral-200 bg-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(220,38,38,0.08),_transparent_55%)]" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 items-center gap-10 p-8 md:p-12">
          <div className="space-y-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-red-600">Crédito K-si</p>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1] text-neutral-950">
              Paga tu próximo auto <span className="text-red-600">en 3 años</span>
            </h2>
            <p className="text-base text-neutral-600 max-w-md leading-relaxed">
              Arma un presupuesto en minutos. Tasas claras, sin rodeos, con un asesor a tu lado.
            </p>
            <Link href="/creditos/cuenca" className="inline-flex">
              <span className="inline-flex items-center gap-2 bg-red-600 px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-red-700">
                Simular mi crédito
                <ArrowRight size={16} />
              </span>
            </Link>
          </div>

          <div className="border border-neutral-200 bg-neutral-50 p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500 mb-2">
              Préstamo estimado
            </p>
            <p className="text-4xl md:text-5xl font-semibold tracking-tight mb-8 text-neutral-950">$20,000</p>
            <div className="space-y-6">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="uppercase tracking-[0.16em] text-neutral-500">Pago inicial</span>
                  <span className="text-neutral-950">$12,000</span>
                </div>
                <div className="h-px bg-neutral-200">
                  <div className="h-px w-[60%] bg-red-600" />
                </div>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="uppercase tracking-[0.16em] text-neutral-500">Mensualidades</span>
                  <span className="text-neutral-950">$413</span>
                </div>
                <div className="h-px bg-neutral-200">
                  <div className="h-px w-[40%] bg-neutral-800" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
