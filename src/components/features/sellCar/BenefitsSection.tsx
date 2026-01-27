import React from 'react';

// Iconos locales
const CarIcon = () => (
    <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><circle cx="17" cy="17" r="2"></circle></svg>
);
const MoneyIcon = () => (
    <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
);
const SecurityIcon = () => (
    <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
);

export const BenefitsSection = () => {
  return (
    <section className="py-24 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                
                {/* Image Placeholder */}
                <div className="relative h-[500px] rounded-3xl overflow-hidden bg-neutral-200 shadow-xl">
                    <img 
                        src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800"
                        alt="Happy Customer"
                        className="w-full h-full object-cover"
                    />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                        <p className="text-white font-medium">"Vendí mi auto en 24 horas y el dinero estuvo en mi cuenta antes de salir de la oficina."</p>
                     </div>
                </div>

                {/* Content */}
                <div>
                    <h2 className="text-3xl font-bold mb-8">¿Por qué vender tu auto en K-si Nuevos?</h2>
                    
                    <div className="space-y-8">
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-neutral-200 shadow-sm">
                                <SecurityIcon />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold mb-1">Seguridad Garantizada</h4>
                                <p className="text-neutral-500 text-sm">Olvídate de tratos con desconocidos y fraudes. Nosotros somos una empresa establecida y transparente.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-neutral-200 shadow-sm">
                                <MoneyIcon />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold mb-1">Mejor Oferta del Mercado</h4>
                                <p className="text-neutral-500 text-sm">Analizamos datos para darte el precio más justo y competitivo por tu auto.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-neutral-200 shadow-sm">
                                <CarIcon />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold mb-1">Aceptamos tu auto a cuenta</h4>
                                <p className="text-neutral-500 text-sm">¿Quieres cambiar de auto? Deja el tuyo como parte de pago y llévate un K-si Nuevo.</p>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    </section>
  );
};