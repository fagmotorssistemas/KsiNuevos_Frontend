import React, { useState } from 'react';
import { Play, ExternalLink, X, Volume2, ChevronRight } from 'lucide-react';

interface VideoTip {
  id: number;
  category: string;
  title: string;
  highlight: string;
  description: string;
  image: string;
  videoUrl: string;
  instagramLink: string;
}

const videoTips: VideoTip[] = [
  {
    id: 1,
    category: "RESEÑA K-SI NUEVOS",
    title: "Chevrolet Trailblazer ",
    highlight: "2019 Diesel",
    description: "No te fijes solo en el diseño. Motor 2.8L Automático, 4x4. Potencia y torque real con estructura sólida para viajes y familia.",
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1bcfb0?auto=format&fit=crop&q=80&w=500",
    videoUrl: "/Videos_fotos_vendedores/Video-felipe.mp4",
    instagramLink: "https://www.instagram.com/reel/DTOpNfLjTto/",
  },
  {
    id: 2,
    category: "FAMILIA Y POTENCIA",
    title: "Mitsubishi Montero ",
    highlight: "Sport GLS 2021",
    description: "Elegancia hecha para durar. Motor 3.0L Gasolina, Automático y 4x4. Todo lo que buscas en un SUV familiar y potente.",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=500",
    videoUrl: "/Videos_fotos_vendedores/Video-Mafer.mp4",
    instagramLink: "https://www.instagram.com/reel/DSn6ZMxEr16/",
  },
  {
    id: 3,
    category: "OFF-ROAD PURO",
    title: "Jeep Wrangler ",
    highlight: "Unlimited Sahara",
    description: "Carácter puro y firmeza. Modelo 2012, 4x4 de 4 puertas. Un vehículo sólido, sin juegos raros, listo para la aventura.",
    image: "https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&q=80&w=500",
    videoUrl: "/Videos_fotos_vendedores/Video-pedro1.mp4",
    instagramLink: "https://www.instagram.com/reel/DTMD73lihVk/",
  },
  {
    id: 4,
    category: "ESTILO EUROPEO",
    title: "Mini Cooper ",
    highlight: "Countryman 2017",
    description: "Diseño europeo inconfundible. Motor 2.0 Twin Power Turbo, caja automática y 5 puertas. Potencia y estilo en cada detalle.",
    image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=500",
    videoUrl: "/Videos_fotos_vendedores/Video-pedro2.mp4",
    instagramLink: "https://www.instagram.com/reel/DTOlw8Ngeem/",
  },
];

export const SocialMediaSection = () => {
  const [selectedVideo, setSelectedVideo] = useState<VideoTip | null>(null);

  return (
    <>
      {/* --- GRID DE TARJETAS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-4">
        {videoTips.map((tip) => (
          <div 
            key={tip.id}
            onClick={() => setSelectedVideo(tip)}
            className="group relative h-[480px] rounded-[1rem] overflow-hidden bg-white shadow-lg cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-gray-100"
          >
            {/* Video Preview */}
            <video
              src={tip.videoUrl}
              poster={tip.image}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            
            {/* Degradado */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

            {/* Contenido de la Tarjeta */}
            <div className="absolute inset-0 p-6 flex flex-col justify-between z-20 pointer-events-none">
              {/* Header */}
              <div className="flex justify-between items-start">
                <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white bg-red-600 rounded-md shadow-sm">
                  {tip.category}
                </span>
                <Volume2 className="w-5 h-5 text-white/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-md" />
              </div>

              {/* Footer Texto */}
              <div>
                <h3 className="text-xl md:text-2xl font-bold leading-tight text-white mb-2 drop-shadow-md">
                  {tip.title} 
                  {/* Se eliminó 'italic' */}
                  <span className="text-white ml-1 font-black">{tip.highlight}</span>
                </h3>
                <p className="text-gray-200 text-xs font-medium leading-relaxed line-clamp-2">
                  {tip.description}
                </p>
              </div>
            </div>

            {/* Botón Play */}
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/50 transition-all duration-300 group-hover:bg-red-600 group-hover:border-red-600 group-hover:scale-110 shadow-lg">
                <Play className="w-6 h-6 text-white ml-1" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- MODAL --- */}
      {selectedVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          
          <div 
            className="absolute inset-0" 
            onClick={() => setSelectedVideo(null)} 
          />

          <div className="relative w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
            
            <button 
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 z-50 p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Lado Video */}
            <div className="w-full md:w-[55%] bg-black flex items-center justify-center relative">
              <video
                src={selectedVideo.videoUrl}
                className="w-full h-full max-h-[80vh] object-contain"
                controls
                autoPlay
                playsInline
              />
            </div>

            {/* Lado Info */}
            <div className="w-full md:w-[45%] p-8 md:p-10 flex flex-col justify-center bg-white">
              <div className="mb-auto">
                 <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest text-red-600 bg-red-50 rounded-full uppercase">
                  {selectedVideo.category}
                </span>
                
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-2">
                  {selectedVideo.title}
                </h2>
                {/* Se eliminó 'italic' */}
                <h3 className="text-2xl md:text-3xl font-black text-red-600 mb-6">
                  {selectedVideo.highlight}
                </h3>
                
                <div className="w-12 h-1 bg-gray-200 mb-6" />

                <p className="text-gray-600 text-lg leading-relaxed">
                  {selectedVideo.description}
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <a 
                  href={selectedVideo.instagramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center gap-3 w-full py-4 bg-gray-900 hover:bg-red-600 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-red-600/20"
                >
                  <ExternalLink className="w-5 h-5" />
                  Ver en Instagram
                  <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                </a>
                <p className="text-center text-gray-400 text-xs mt-3">
                  Síguenos en @KsiNuevos
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};