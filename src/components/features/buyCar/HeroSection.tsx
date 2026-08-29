import React from "react";

type HeroSectionProps = {
  title?: string;
  intro?: string;
};

export const HeroSection = ({
  title = "Autos usados en Cuenca",
  intro = "Carros, vehículos y seminuevos en patio. Filtra por marca, precio y año.",
}: HeroSectionProps) => {
  return (
    <div className="bg-white border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <h1 className="text-4xl md:text-5xl font-black mb-4 text-black uppercase tracking-tighter">
          {title}
        </h1>
        <div className="h-1 w-20 bg-red-600 mb-6 rounded-full" />
        <p className="text-neutral-500 text-lg md:text-xl max-w-2xl font-medium">
          {intro}
        </p>
      </div>
    </div>
  );
};