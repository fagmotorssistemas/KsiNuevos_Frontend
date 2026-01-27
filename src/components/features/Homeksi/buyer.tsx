import React from 'react';

interface BuyerStory {
  id: number;
  clientName: string;
  carModel: string;
  year: number;
  imageUrl: string;
}

const successStories: BuyerStory[] = [
  {
    id: 1,
    clientName: "Familia Satisfecha",
    carModel: "Vehículo Seminuevo",
    year: 2022,
    imageUrl: "/Videos_fotos_vendedores/Venta.jpeg", 
  },
  {
    id: 2,
    clientName: "Cliente Feliz",
    carModel: "SUV Familiar",
    year: 2020,
    imageUrl: "/Videos_fotos_vendedores/Venta1.jpeg",
  },
  {
    id: 3,
    clientName: "Nuevo Propietario",
    carModel: "Todo Terreno",
    year: 2018,
    imageUrl: "/Videos_fotos_vendedores/Venta2.jpg",
  },
  {
    id: 4,
    clientName: "Entrega Exitosa",
    carModel: "Sedán Ejecutivo",
    year: 2021,
    imageUrl: "/Videos_fotos_vendedores/Venta3.png",
  }
];

export const BuyerSection = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {successStories.map((story) => (
        <div 
          key={story.id} 
className="group relative w-full aspect-[4/5] md:aspect-auto md:h-[400px] rounded-[2rem] overflow-hidden cursor-default shadow-lg hover:shadow-2xl transition-all duration-500 bg-slate-100"        >
          {/* 1. Imagen del Cliente */}
          <img 
            src={story.imageUrl} 
            alt={`Cliente feliz ${story.clientName}`} 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />

          {/* 2. Degradado Inferior (Sutil, solo para que se lea el nombre) */}

        </div>
      ))}
    </div>
  );
}; 