import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Facebook, Instagram, Linkedin, MapPin } from 'lucide-react';
import { PUBLIC_PATHS } from '@/lib/nav/publicPaths';
import { LOCATION_DATA } from '@/components/features/aboutUs/locationData';

const WHATSAPP_HOME_HREF = `https://wa.me/593983335555?text=${encodeURIComponent(
  'Hola, vi la página web y quiero hablar con un asesor.'
)}`;

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

export function NuestraHistoriaSection() {
  return (
    <section className="bg-neutral-50 px-6 py-14 md:py-16">
      <div className="max-w-7xl mx-auto">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-red-700">
          Nuestra historia
        </p>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-950 md:text-[2.5rem] md:leading-tight lg:col-span-4">
            Nacimos en Cuenca.
            <span className="mt-2 block text-neutral-500">Seguimos vendiéndote de frente.</span>
          </h2>
          <div className="space-y-5 text-sm leading-relaxed text-neutral-500 md:text-base md:leading-7 lg:col-span-6 lg:col-start-6">
            <p>
              Miles de autos han salido de esta sala. Cada uno con un cliente que preguntó, revisó y se fue rodando. Esa es la historia: trato claro, papeles en orden y un equipo que está cuando lo necesitas.
            </p>
            <p>
              Empezamos aquí, en Azuay, atendiendo en persona. No cambiamos eso por un chat anónimo: te mostramos el auto, te explicamos el estado y te acompañamos hasta la entrega. Si hay crédito, se arma a tu medida. Si vienes a vender o a dejar el tuyo de parte de pago, te damos una respuesta concreta.
            </p>
            <p>
              Lo que nos importa es que salgas seguro de lo que firmaste. Por eso la garantía está en los documentos, no en un eslogan. Así hemos crecido: de cliente en cliente, sin perder el trato de sala.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export const MainFooter = ({ showHistoria = true }: { showHistoria?: boolean } = {}) => {
  return (
    <>
      {showHistoria ? <NuestraHistoriaSection /> : null}

      <footer className="relative overflow-hidden text-white">
      <Image
        src={LOCATION_DATA.image}
        alt=""
        fill
        sizes="100vw"
        className="object-cover blur-[2px] scale-105"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-black/72" aria-hidden />

      <div className="relative z-10 px-6 pt-10 pb-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <Link href={PUBLIC_PATHS.home} className="inline-block mb-6">
              <Image
                src="/logo.png"
                alt="Logo de K-si New"
                width={120}
                height={40}
                className="object-contain opacity-90 hover:opacity-100 transition-opacity brightness-0 invert"
              />
            </Link>
            <p className="text-neutral-300 text-sm leading-relaxed max-w-xs">
              Seminuevos en Cuenca. Te atendemos en sala.
            </p>
          </div>

          <div>
            <h4 className="font-black mb-6 text-white uppercase text-xs tracking-[0.2em]">Plataforma</h4>
            <ul className="text-neutral-300 text-sm space-y-3 font-medium">
              <li>
                <Link href="/usados/cuenca" className="hover:text-white hover:translate-x-1 transition-all inline-block">
                  Comprar auto
                </Link>
              </li>
              <li>
                <Link href="/vender/cuenca" className="hover:text-white hover:translate-x-1 transition-all inline-block">
                  Vender auto
                </Link>
              </li>
              <li>
                <Link href="/creditos/cuenca" className="hover:text-white hover:translate-x-1 transition-all inline-block">
                  Financiamiento
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-black mb-6 text-white uppercase text-xs tracking-[0.2em]">Soporte</h4>
            <ul className="text-neutral-300 text-sm space-y-3 font-medium">
              <li>
                <Link href="/nosotros/cuenca" className="hover:text-white hover:translate-x-1 transition-all inline-block">
                  Nosotros
                </Link>
              </li>
              <li>
                <Link href="/vender/cuenca#faq-section" className="hover:text-white hover:translate-x-1 transition-all inline-block">
                  Preguntas frecuentes
                </Link>
              </li>
              <li>
                <Link href="/nosotros/cuenca#sedes" className="hover:text-white hover:translate-x-1 transition-all inline-block">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-center md:items-start">
            <h4 className="font-black mb-6 text-white uppercase text-xs tracking-[0.2em]">Síguenos</h4>
            <div className="flex flex-row gap-3">
              <Link
                href="https://www.facebook.com/ksinuevosfagmotors"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center border border-white/20 text-neutral-300 hover:text-white hover:border-white/50 transition-all"
              >
                <Facebook size={18} />
              </Link>
              <Link
                href="https://www.instagram.com/ksinuevosfag/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center border border-white/20 text-neutral-300 hover:text-white hover:border-white/50 transition-all"
              >
                <Instagram size={18} />
              </Link>
              <Link
                href="https://www.tiktok.com/@fagmotors"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center border border-white/20 text-neutral-300 hover:text-white hover:border-white/50 transition-all"
              >
                <TikTokIcon />
              </Link>
              <Link
                href="https://www.linkedin.com/in/fabian-aguirre-5536632ab/recent-activity/all/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center border border-white/20 text-neutral-300 hover:text-white hover:border-white/50 transition-all"
              >
                <Linkedin size={18} />
              </Link>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-start">
            <div className="flex w-full max-w-[200px] flex-col gap-2">
              <a
                href={WHATSAPP_HOME_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-white/25 bg-white/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:border-white/45 hover:bg-white/15"
              >
                <WhatsAppIcon />
                Contáctate
              </a>
              <a
                href={LOCATION_DATA.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-white/25 bg-transparent px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-200 transition-colors hover:border-white/45 hover:text-white"
              >
                <MapPin size={14} />
                Nuestra ubicación
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
    </>
  );
};
