import React from "react";
import type { CarDetail } from "@/hooks/Homeksi/useCarDetail";

interface CarSpecsProps {
  car: CarDetail;
}

export const CarSpecs = ({ car }: CarSpecsProps) => {
  
  const allSpecs = [
    // --- IDENTIDAD ---
    { label: "Marca", value: car.brand },
    { label: "Modelo", value: car.model },
    { label: "Versión", value: car.version },
    { label: "Año", value: car.year },
    { label: "VIN", value: car.vin },

    // --- MOTOR ---
    { label: "Motor", value: car.engine_displacement },
    { label: "Combustible", value: car.fuel_type },
    { label: "Cilindros", value: car.cylinders },
    { label: "Transmisión", value: car.transmission },
    { label: "Velocidades", value: car.transmission_speeds },
    { label: "Tracción", value: car.drive_type },

    // --- CARROCERÍA ---
    { label: "Carrocería", value: car.type_body },
    { label: "Color Exterior", value: car.color },
    { label: "Condición", value: car.condition },
    { label: "Puertas", value: car.doors },

    // --- INTERIOR ---
    { label: "Color Interior", value: car.interior_color },
    { label: "Tapicería", value: car.upholstery_type },
    { label: "Pasajeros", value: car.passenger_capacity },

    // --- HISTORIAL ---
    { label: "Kilometraje", value: car.mileage },
    { label: "Placa", value: car.plate_short },
    { label: "Ciudad", value: car.city_registration },
    { label: "Dueños", value: car.previous_owners },
    
    // Para booleanos: Verificamos si es null/undefined primero.
    // Si es null, pasamos null para que el filtro lo oculte. 
    // Si es true/false, mostramos Sí/No.
    { 
        label: "Mantenimientos", 
        value: car.has_maintenance_record != null 
            ? (car.has_maintenance_record ? "Sí" : "No") 
            : null 
    },
    { 
        label: "Certificado", 
        value: car.is_certified != null 
            ? (car.is_certified ? "Sí" : "No") 
            : null 
    },
  ];

  // FILTRO MÁGICO:
  // Solo mostramos items donde value NO sea null, undefined o comillas vacías.
  // (Nota: El 0 sí pasa el filtro porque es un dato válido para kilometraje o dueños)
  const visibleSpecs = allSpecs.filter(
    (spec) => spec.value !== null && spec.value !== undefined && spec.value !== ""
  );

  // Si después de filtrar no queda nada, no renderizamos el componente
  if (visibleSpecs.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-8 mb-8 shadow-sm">
      <div className="flex items-center gap-3 mb-8 border-b border-neutral-100 pb-4">
        <div className="w-1 h-6 bg-red-600 rounded-full"></div>
        <h3 className="text-xl font-black text-black uppercase tracking-tight">
          Ficha Técnica
        </h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-y-8 gap-x-8">
        {visibleSpecs.map((spec, index) => (
          <div 
            key={index} 
            className="flex flex-col group border-l-2 border-neutral-100 hover:border-red-600 pl-4 transition-all duration-300"
          >
            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest mb-1 group-hover:text-red-600 transition-colors">
              {spec.label}
            </span>
            <span className="text-sm font-bold text-black break-words">
              {/* Aquí ya es seguro renderizar directamente porque filtramos los vacíos */}
              {spec.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};