"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

const INTERVAL_MS = 3800;

type Slide = {
  id: string;
  src: string;
  alt: string;
};

function isRemoteSrc(src: string) {
  return src.startsWith("http://") || src.startsWith("https://");
}

export function HeroStoriesCarousel() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/public/hero-inventory");
        const data = (await res.json()) as { slides?: Array<{ id?: string; src?: string; alt?: string }> };
        const next = (data.slides ?? [])
          .filter((slide): slide is Slide => Boolean(slide.id && slide.src?.trim()))
          .map((slide) => ({
            id: slide.id,
            src: slide.src.trim(),
            alt: slide.alt?.trim() || "Vehículo K-si Nuevos",
          }));
        if (!cancelled) {
          setSlides(next);
          setIndex(0);
        }
      } catch {
        if (!cancelled) setSlides([]);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const advance = useCallback(() => {
    setIndex((current) => (slides.length === 0 ? 0 : (current + 1) % slides.length));
  }, [slides.length]);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = window.setInterval(advance, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [advance, paused, slides.length]);

  const current = slides[index];

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-neutral-300"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carrusel"
      aria-label="Inventario K-si Nuevos en Cuenca"
    >
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <clipPath id="hero-vehicle-clip" clipPathUnits="objectBoundingBox">
            <path d="M0.12,0.03 C0.02,0.12,-0.01,0.38,0.03,0.58 C0.07,0.82,0.01,0.96,0.16,1 H0.97 C1.02,0.78,1.01,0.22,0.98,0.06 C0.86,-0.02,0.42,-0.01,0.12,0.03 Z" />
          </clipPath>
        </defs>
      </svg>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,#d4d4d4,transparent_55%)]" />

      {!current ? (
        <div className="absolute inset-[8%] rounded-[42%_28%_48%_32%/36%_44%_28%_52%] bg-neutral-200" />
      ) : (
        slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={i !== index}
          >
            <Image
              src={slide.src}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 54vw"
              className="object-cover scale-125 blur-2xl opacity-50"
              quality={75}
              unoptimized={isRemoteSrc(slide.src)}
              aria-hidden
            />

            <div
              className="absolute -left-[8%] top-[6%] h-[88%] w-[108%] overflow-hidden shadow-[0_40px_80px_-28px_rgba(15,23,42,0.45)]"
              style={{ clipPath: "url(#hero-vehicle-clip)" }}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={i === 0}
                sizes="(max-width: 768px) 100vw, 54vw"
                className={`object-cover transition-transform duration-[3800ms] ease-out ${
                  i === index ? "scale-105" : "scale-100"
                }`}
                quality={75}
                unoptimized={isRemoteSrc(slide.src)}
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-white/10" />
            </div>
          </div>
        ))
      )}

      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 md:w-36 bg-gradient-to-r from-neutral-200/90 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/40 to-transparent" />

      {current ? (
        <p className="absolute bottom-6 left-6 right-6 text-white text-sm md:text-base font-bold drop-shadow-md">
          {current.alt}
        </p>
      ) : null}
    </div>
  );
}
