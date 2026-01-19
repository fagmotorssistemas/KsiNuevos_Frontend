import React from 'react';

export const ProcessSteps = () => {
  return (
    <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-3xl font-bold text-black mb-4">Vende tu auto en 3 simples pasos</h2>
                <p className="text-neutral-500">Hemos simplificado el proceso para que no pierdas tiempo ni dinero.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                {/* Connector Line (Desktop only) */}
                <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-neutral-100 -z-10"></div>

                {/* Step 1 */}
                <div className="text-center group">
                    <div className="w-24 h-24 bg-white border-2 border-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:border-red-600 transition-colors shadow-sm">
                        <span className="text-4xl font-bold text-neutral-200 group-hover:text-red-600 transition-colors">1</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3">Cotiza en línea</h3>
                    <p className="text-neutral-500 text-sm leading-relaxed px-4">
                        Ingresa los datos de tu auto en nuestro formulario y recibe una oferta preliminar.
                    </p>
                </div>

                {/* Step 2 */}
                <div className="text-center group">
                    <div className="w-24 h-24 bg-white border-2 border-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:border-red-600 transition-colors shadow-sm">
                        <span className="text-4xl font-bold text-neutral-200 group-hover:text-red-600 transition-colors">2</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3">Inspección gratis</h3>
                    <p className="text-neutral-500 text-sm leading-relaxed px-4">
                        Agenda una cita en nuestros puntos de inspección . Revisamos tu auto en 30 min.
                    </p>
                </div>

                {/* Step 3 */}
                <div className="text-center group">
                    <div className="w-24 h-24 bg-white border-2 border-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:border-red-600 transition-colors shadow-sm">
                        <span className="text-4xl font-bold text-neutral-200 group-hover:text-red-600 transition-colors">3</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3">Recibe tu pago</h3>
                    <p className="text-neutral-500 text-sm leading-relaxed px-4">
                        Si todo está en orden, te transferimos el dinero a tu cuenta bancaria de inmediato.
                    </p>
                </div>
            </div>
        </div>
    </section>
  );
};