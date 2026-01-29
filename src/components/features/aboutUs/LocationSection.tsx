import React from 'react';
import { MapPin, Phone, Clock, ArrowRight } from 'lucide-react';

const LOCATION_DATA = {
  name: 'Showroom Cuenca',
  // Separamos los datos para usarlos ordenadamente abajo
  addressMain: 'Av. España 6-73 y Sevilla',
  addressRef: '(Diagonal a Juan Eljuri)',
  addressSecondary: 'Av. Gil Ramírez Dávalos',
  phone: '+593 983335555',
  hours: 'Lun-Vie: 8:30 - 18:30 | Sab: 9:30 - 13:30',
  image: '/showroom.jpeg',
  mapUrl: 'https://goo.gl/maps/tu-link-aqui' // Asegúrate de poner el link real
};

export const LocationSection = () => {
  return (
    <section className="py-24 bg-gray-50" id="sedes">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl shadow-gray-200/50 flex flex-col md:flex-row min-h-[500px]">
          
          {/* Columna de Información */}
          <div className="w-full md:w-1/2 p-10 md:p-16 flex flex-col justify-center">
            <span className="text-red-600 font-bold tracking-widest uppercase text-xs mb-4">Nuestra Sede</span>
            <h2 className="text-4xl font-bold mb-8 text-gray-900">{LOCATION_DATA.name}</h2>
            
            <div className="space-y-8 flex-1">
              
              {/* === SECCIÓN DE DIRECCIÓN MEJORADA === */}
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 mr-4 mt-1">
                  <MapPin size={20} className="text-red-600" />
                </div>
                <div className="w-full">
                  <p className="font-semibold text-gray-900 mb-3">Dirección (Doble Acceso)</p>
                  
                  {/* Bloque Principal */}
                  <div className="mb-3 pl-3 border-l-2 border-red-200">
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block mb-0.5">Entrada Principal</span>
                    <p className="text-gray-700 font-medium">{LOCATION_DATA.addressMain}</p>
                  </div>

                  {/* Bloque Secundario */}
                  <div className="pl-3 border-l-2 border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Entrada Posterior</span>
                    <p className="text-gray-600 text-sm">{LOCATION_DATA.addressSecondary}</p>
                    <p className="text-gray-400 text-xs italic">{LOCATION_DATA.addressRef}</p>
                  </div>
                </div>
              </div>
              {/* ==================================== */}
              
              <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 mr-4 mt-1">
                  <Phone size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Teléfono</p>
                  <p className="text-gray-600">{LOCATION_DATA.phone}</p>
                </div>
              </div>

              <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 mr-4 mt-1">
                  <Clock size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Horarios de Atención</p>
                  <p className="text-gray-600">{LOCATION_DATA.hours}</p>
                </div>
              </div>
            </div>

            <a 
              href={LOCATION_DATA.mapUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-10 inline-flex items-center justify-center bg-black text-white px-8 py-4 rounded-xl hover:bg-gray-800 transition-all font-bold group w-full md:w-auto cursor-pointer"
            >
              Ver ubicación en Maps
              <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          {/* Columna de Imagen */}
          <div className="w-full md:w-1/2 relative h-64 md:h-auto">
            <img 
              src={LOCATION_DATA.image} 
              alt={LOCATION_DATA.name} 
              className="absolute inset-0 w-full h-full object-cover" 
            />
          </div>

        </div>
      </div>
    </section>
  );
};