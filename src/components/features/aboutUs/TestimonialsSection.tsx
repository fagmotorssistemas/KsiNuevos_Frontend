import React from 'react';
import { Star, Quote, CheckCircle2 } from 'lucide-react';

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Carlos Mendoza',
    initials: 'CM',
    role: 'Comprador verificado',
    comment: 'La experiencia fue increíble. Vendí mi auto en menos de 2 horas y el pago fue inmediato. Nunca había sentido tanta seguridad en un trámite.',
    stars: 5,
    date: 'Hace 2 días'
  },
  {
    id: 2,
    name: 'Andrea Rivas',
    initials: 'AR',
    role: 'Compradora verificada',
    comment: 'Me encantó la transparencia. El reporte mecánico de 240 puntos me dio la confianza que necesitaba para mi primer auto seminuevo.',
    stars: 5,
    date: 'Hace 1 semana'
  },
  {
    id: 3,
    name: 'Jorge Téllez',
    initials: 'JT',
    role: 'Vendedor',
    comment: 'Sin complicaciones ni trámites burocráticos. Se encargaron de todo el papeleo en la notaría. Muy profesionales y recomendados.',
    stars: 4,
    date: 'Hace 3 semanas'
  },
];

export const TestimonialsSection = () => {
  return (
    <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto bg-white" id="testimonios">
      {/* Header de la sección */}
      <div className="flex flex-col items-center text-center mb-16">
        <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-bold tracking-widest uppercase mb-6">
          <Star size={12} className="mr-2 fill-red-600" />
          Confianza K-si Nuevos
        </span>
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
          No solo vendemos autos, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500">
            creamos relaciones.
          </span>
        </h2>
        <p className="text-gray-500 max-w-2xl text-lg leading-relaxed">
          La satisfacción de nuestros clientes es el motor que nos impulsa. Descubre por qué somos la opción #1 en seminuevos.
        </p>
      </div>

      {/* Grid de Testimonios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
        {TESTIMONIALS.map((test) => (
          <div 
            key={test.id} 
            className="group relative bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 hover:border-red-100 transition-all duration-500 ease-out flex flex-col"
          >
            {/* Comillas decorativas */}
            <div className="absolute top-8 right-8 text-gray-100 group-hover:text-red-50 transition-colors duration-500 transform group-hover:scale-110">
              <Quote size={64} fill="currentColor" />
            </div>

            {/* Estrellas */}
            <div className="flex gap-1 mb-6 relative z-10">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={18} 
                  fill={i < test.stars ? "#fbbf24" : "none"} 
                  className={i < test.stars ? "text-amber-400" : "text-gray-200"}
                />
              ))}
            </div>

            {/* Comentario */}
            <p className="text-gray-600 text-lg leading-relaxed mb-8 relative z-10 flex-grow font-medium">
              "{test.comment}"
            </p>

            {/* Separador */}
            <div className="w-full h-px bg-gray-50 mb-6 group-hover:bg-red-50 transition-colors"></div>

            {/* Perfil del Cliente */}
            <div className="flex items-center relative z-10">
              {/* Avatar con Iniciales */}
              <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm mr-4 shadow-md group-hover:bg-red-600 transition-colors duration-300">
                {test.initials}
              </div>
              
              <div>
                <h4 className="font-bold text-gray-900 text-base">{test.name}</h4>
                <div className="flex items-center mt-0.5">
                  <CheckCircle2 size={14} className="text-green-500 mr-1.5" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide group-hover:text-gray-600 transition-colors">
                    {test.role}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Fecha discreta */}
            <div className="absolute bottom-8 right-8 text-xs text-gray-300 font-medium">
              {test.date}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};