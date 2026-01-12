import React from "react";

interface CarFeaturesProps {
  features: string[] | null;
}

export const CarFeatures = ({ features }: CarFeaturesProps) => {
  
  if (!features || features.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-8 mb-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-red-600 rounded-full"></div>
        <h3 className="text-xl font-black text-black uppercase tracking-tight">
          Equipamiento Destacado
        </h3>
      </div>
      
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors">
            {/* Check Rojo */}
            <div className="mt-0.5 w-5 h-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <span className="text-sm font-medium text-black">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};