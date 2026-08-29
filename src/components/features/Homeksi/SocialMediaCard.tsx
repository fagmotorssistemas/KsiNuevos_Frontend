"use client";

import React, { useState } from 'react';
import { Play, ExternalLink, X } from 'lucide-react';

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {videoTips.map((tip) => (
          <button
            key={tip.id}
            type="button"
            onClick={() => setSelectedVideo(tip)}
            className="group relative h-[440px] overflow-hidden border border-neutral-200 bg-neutral-950 text-left transition-colors duration-300 hover:border-neutral-400"
          >
            <video
              src={tip.videoUrl}
              poster={tip.image}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity duration-700 group-hover:opacity-100"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />

            <div className="absolute inset-0 z-20 flex flex-col justify-between p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">
                {tip.category}
              </p>
              <div>
                <h3 className="mb-2 text-lg font-semibold uppercase tracking-[0.08em] leading-snug text-white">
                  {tip.title}
                  <span className="text-red-500"> {tip.highlight}</span>
                </h3>
                <p className="line-clamp-2 text-xs leading-relaxed text-neutral-300">
                  {tip.description}
                </p>
              </div>
            </div>

            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="flex h-11 w-11 items-center justify-center border border-white/50 bg-black/30 text-white transition-colors duration-300 group-hover:border-red-600 group-hover:bg-red-600">
                <Play className="ml-0.5 h-4 w-4" strokeWidth={1.5} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="absolute inset-0" onClick={() => setSelectedVideo(null)} />

          <div className="relative flex w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden border border-neutral-200 bg-white md:flex-row">
            <button
              type="button"
              onClick={() => setSelectedVideo(null)}
              className="absolute right-3 top-3 z-50 border border-neutral-200 bg-white p-2 text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-950"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>

            <div className="relative flex w-full items-center justify-center bg-black md:w-[55%]">
              <video
                src={selectedVideo.videoUrl}
                className="h-full max-h-[80vh] w-full object-contain"
                controls
                autoPlay
                playsInline
              />
            </div>

            <div className="flex w-full flex-col justify-center bg-white p-8 md:w-[45%] md:p-10">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-700">
                {selectedVideo.category}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl">
                {selectedVideo.title}
              </h2>
              <p className="mb-5 text-xl font-semibold tracking-tight text-red-600">
                {selectedVideo.highlight}
              </p>
              <p className="text-sm leading-relaxed text-neutral-600">
                {selectedVideo.description}
              </p>
              <a
                href={selectedVideo.instagramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center justify-center gap-2 border border-neutral-900 bg-neutral-950 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:border-red-600 hover:bg-red-600"
              >
                <ExternalLink className="h-4 w-4" />
                Ver en Instagram
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};