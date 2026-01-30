import React from 'react';
import { Car, ShieldCheck, Users } from 'lucide-react';

export const ValuesSection = () => {
  return (
    <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">¿Por qué elegirnos?</h2>
        <div className="w-16 h-1 bg-red-600 mx-auto rounded-full"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
        {/* Valor 1 */}
        <div className="group">
          <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-red-600 group-hover:shadow-lg group-hover:shadow-red-500/30 transition-all duration-500 ease-out">
            <Car size={36} className="text-red-600 group-hover:text-white transition-colors duration-500" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Inventario Certificado</h3>
          <p className="text-gray-500 leading-relaxed px-4">
            Cada vehículo pasa por más de <span className="font-semibold text-gray-900">240 puntos de inspección</span> mecánica y estética.
          </p>
        </div>

        {/* Valor 2 */}
        <div className="group">
          <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-red-600 group-hover:shadow-lg group-hover:shadow-red-500/30 transition-all duration-500 ease-out">
            <ShieldCheck size={36} className="text-red-600 group-hover:text-white transition-colors duration-500" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Respaldo Documental</h3>
          <p className="text-gray-500 leading-relaxed px-4">
            Compra con papeles en regla <span className="font-semibold text-gray-900">y acompañamiento en el trámite.</span>
          </p>
        </div>

        {/* Valor 3 */}
        <div className="group">
          <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-red-600 group-hover:shadow-lg group-hover:shadow-red-500/30 transition-all duration-500 ease-out">
            <Users size={36} className="text-red-600 group-hover:text-white transition-colors duration-500" />
          </div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Trato Personalizado</h3>
          <p className="text-gray-500 leading-relaxed px-4">
            Olvídate de la burocracia. Nuestros expertos gestionan todo el papeleo para que tú solo disfrutes.
          </p>
        </div>
      </div>
    </section>
  );
};