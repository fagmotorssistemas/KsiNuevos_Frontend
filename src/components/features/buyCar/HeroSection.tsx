import React from "react";

export const HeroSection = () => {
  return (
    // Borde neutral
    <div className="bg-white border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <h1 className="text-4xl md:text-5xl font-black mb-4 text-black uppercase tracking-tighter">
          Encuentra tu auto ideal
        </h1>
        <div className="h-1 w-20 bg-red-600 mb-6 rounded-full" />
        <p className="text-neutral-500 text-lg md:text-xl max-w-2xl font-medium">
          Explora nuestro inventario certificado. Planes de financiamiento a tu medida y garantía total.
        </p>
      </div>
    </div>
  );
};