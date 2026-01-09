import React from "react";
import type { CarDetail } from "@/hooks/Homeksi/useCarDetail";

interface CarSpecsProps {
  car: CarDetail;
}

export const CarSpecs = ({ car }: CarSpecsProps) => {
  
  // Mapeo exhaustivo de tu base de datos
  const allSpecs = [
    // --- IDENTIDAD ---
    { label: "Marca", value: car.brand },
    { label: "Modelo", value: car.model },
    { label: "Versión", value: car.version },
    { label: "Año", value: car.year },
    { label: "VIN", value: car.vin },
    { label: "ID / Slug", value: car.slug }, 

    // --- MOTOR ---
    { label: "Motor", value: car.engine_displacement },
    { label: "Combustible", value: car.fuel_type },
    { label: "Cilindros", value: car.cylinders },
    { label: "Transmisión", value: car.transmission },
    { label: "Velocidades", value: car.transmission_speeds },
    { label: "Tracción", value: car.drive_type },
    { label: "Detalle Tracción", value: car.drive_type_detail },

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
    { label: "Placa (Corto)", value: car.plate_short },
    { label: "Ciudad Registro", value: car.city_registration },
    { label: "Dueños Anteriores", value: car.previous_owners },
    { label: "Mantenimientos", value: car.has_maintenance_record ? "Sí" : "No" },
    { label: "Certificado", value: car.is_certified ? "Sí" : "No" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">
        Especificaciones Completas (Debug Mode)
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-y-6 gap-x-6">
        {allSpecs.map((spec, index) => (
          <div key={index} className="flex flex-col group border-l-2 border-transparent hover:border-blue-100 pl-2 transition-all">
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
              {spec.label}
            </span>
            <span className={`text-sm font-semibold break-words ${!spec.value ? 'text-red-300 italic' : 'text-gray-800'}`}>
              {/* AQUÍ ESTÁ EL CAMBIO: Si no hay valor, mostramos "---" en rojo en lugar de ocultarlo */}
              {spec.value !== null && spec.value !== undefined && spec.value !== "" 
                ? spec.value 
                : "---"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};