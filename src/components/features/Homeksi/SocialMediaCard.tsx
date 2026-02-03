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

// ... (Mantén tu array videoTips igual) ...
// Solo incluyo el componente visual actualizado

const videoTips: VideoTip[] = [
    // ... tus datos ...
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
    category: "COMODIDAD URBANA",
    title: "Chery Tiggo 2 Pro ",
    highlight: "2023 Manual",
    description: "Altura, comodidad y practicidad para el día a día. Motor 1.5L, tracción 4x2 y un consumo razonable ideal para la ciudad. El equilibrio perfecto entre estilo y ahorro.",
    image: "https://images.unsplash.com/photo-1619767886558-efdc259c6e09?auto=format&fit=crop&q=80&w=500",
    videoUrl: "/Videos_fotos_vendedores/Video-Vane.mp4",
    instagramLink: "https://www.instagram.com/reel/C2i_XyOuR6y/",
  },
  {
    id: 4,
    category: "ESTILO EUROPEO",
    title: "Mini Cooper ",
    highlight: "Countryman 2017",
    description: "Diseño europeo inconfundible. Motor 2.0 Twin Power Turbo, caja automática y 5 puertas. Potencia y estilo en cada detalle.",
    image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=500",
    videoUrl: "/Videos_fotos_vendedores/Video-pedro1.mp4",
    instagramLink: "https://www.instagram.com/reel/DTOlw8Ngeem/",
  },
];

export const SocialMediaSection = () => {
  const [selectedVideo, setSelectedVideo] = useState<VideoTip | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-4">
        {videoTips.map((tip) => (
          <div 
            key={tip.id}
            onClick={() => setSelectedVideo(tip)}
            className="group relative h-[480px] rounded-[1rem] overflow-hidden bg-black shadow-lg cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-neutral-800"
          >
            <video
              src={tip.videoUrl}
              poster={tip.image}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

            <div className="absolute inset-0 p-6 flex flex-col justify-between z-20 pointer-events-none">
              <div className="flex justify-between items-start">
                <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white bg-red-600 rounded-md">
                  {tip.category}
                </span>
                <Volume2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              <div>
                <h3 className="text-xl md:text-2xl font-bold leading-tight text-white mb-2">
                  {tip.title} 
                  <span className="text-white ml-1 font-black">{tip.highlight}</span>
                </h3>
                <p className="text-neutral-300 text-xs font-medium leading-relaxed line-clamp-2">
                  {tip.description}
                </p>
              </div>
            </div>

            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="w-14 h-14 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/50 transition-all duration-300 group-hover:bg-red-600 group-hover:border-red-600 group-hover:scale-110">
                <Play className="w-6 h-6 text-white ml-1" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          
          <div className="absolute inset-0" onClick={() => setSelectedVideo(null)} />

          <div className="relative w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
            
            <button 
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 z-50 p-2 bg-neutral-100 text-neutral-500 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="w-full md:w-[55%] bg-black flex items-center justify-center relative">
              <video
                src={selectedVideo.videoUrl}
                className="w-full h-full max-h-[80vh] object-contain"
                controls
                autoPlay
                playsInline
              />
            </div>

            <div className="w-full md:w-[45%] p-8 md:p-10 flex flex-col justify-center bg-white">
              <div className="mb-auto">
                 <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest text-red-600 bg-red-50 rounded-full uppercase">
                  {selectedVideo.category}
                </span>
                
                <h2 className="text-3xl md:text-4xl font-bold text-black leading-tight mb-2">
                  {selectedVideo.title}
                </h2>
                <h3 className="text-2xl md:text-3xl font-black text-red-600 mb-6">
                  {selectedVideo.highlight}
                </h3>
                
                <div className="w-12 h-1 bg-neutral-200 mb-6" />

                <p className="text-neutral-600 text-lg leading-relaxed">
                  {selectedVideo.description}
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-neutral-100">
                <a 
                  href={selectedVideo.instagramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center gap-3 w-full py-4 bg-black hover:bg-red-600 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-red-600/20"
                >
                  <ExternalLink className="w-5 h-5" />
                  Ver en Instagram
                  <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};