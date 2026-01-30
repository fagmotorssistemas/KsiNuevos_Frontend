import React from "react";
import type { CarDetail } from "@/hooks/Homeksi/useCarDetail";

interface CarSpecsProps {
  car: CarDetail;
}

export const CarSpecs = ({ car }: CarSpecsProps) => {
  
  /**
   * Función para transformar valores a Camel Case visual (Capitalizado)
   * Convierte: "gasolina" -> "Gasolina", "tracción trasera" -> "Tracción Trasera"
   */
  const formatValue = (val: string | number | boolean | null | undefined) => {
    if (val === null || val === undefined || val === "") return null;
    
    // Si es un número, lo devolvemos con formato de miles si es necesario
    if (typeof val === "number") return val.toLocaleString();
    
    // Si es un string, aplicamos la capitalización de cada palabra
    if (typeof val === "string") {
      return val
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    return val.toString();
  };

  const allSpecs = [
    // --- IDENTIDAD ---
    { label: "Marca", value: formatValue(car.brand) },
    { label: "Modelo", value: formatValue(car.model) },
    { label: "Versión", value: formatValue(car.version) },
    { label: "Año", value: car.year },
    { label: "VIN", value: car.vin?.toUpperCase() }, // El VIN suele ir en mayúsculas siempre

    // --- MOTOR ---
    { label: "Motor", value: formatValue(car.engine_displacement) },
    { label: "Combustible", value: formatValue(car.fuel_type) },
    { label: "Cilindros", value: car.cylinders },
    { label: "Transmisión", value: formatValue(car.transmission) },
    { label: "Velocidades", value: car.transmission_speeds },
    { label: "Tracción", value: formatValue(car.drive_type) },

    // --- CARROCERÍA ---
    { label: "Carrocería", value: formatValue(car.type_body) },
    { label: "Color Exterior", value: formatValue(car.color) },
    { label: "Condición", value: formatValue(car.condition) },
    { label: "Puertas", value: car.doors },

    // --- INTERIOR ---
    { label: "Color Interior", value: formatValue(car.interior_color) },
    { label: "Tapicería", value: formatValue(car.upholstery_type) },
    { label: "Pasajeros", value: car.passenger_capacity },

    // --- HISTORIAL ---
    { label: "Kilometraje", value: car.mileage ? `${car.mileage.toLocaleString()} km` : null },
    { label: "Placa", value: car.plate_short?.toUpperCase() },
    { label: "Ciudad", value: formatValue(car.city_registration) },
    { label: "Dueños", value: car.previous_owners },
    
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
  const visibleSpecs = allSpecs.filter(
    (spec) => spec.value !== null && spec.value !== undefined && spec.value !== ""
  );

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
              {spec.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};