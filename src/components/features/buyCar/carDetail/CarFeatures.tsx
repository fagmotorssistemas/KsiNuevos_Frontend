import React from "react";

interface CarFeaturesProps {
  features: string[] | null; // Esperamos un array de strings
}

export const CarFeatures = ({ features }: CarFeaturesProps) => {
  
  // Si no hay features o el array está vacío, no mostramos nada
  if (!features || features.length === 0) return null;

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        Equipamiento Destacado
      </h3>
      
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            {/* Icono de Check */}
            <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};