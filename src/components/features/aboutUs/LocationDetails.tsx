import React from 'react';
import { MapPin, Phone, Clock, ArrowRight } from 'lucide-react';
import { LOCATION_DATA } from './locationData';

const WHATSAPP_HOME_HREF = `https://wa.me/593983335555?text=${encodeURIComponent(
  'Hola, vi la página web y quiero hablar con un asesor.'
)}`;

const WHATSAPP_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all duration-300 shadow-[0_4px_14px_0_rgba(37,211,102,0.39)] hover:shadow-[0_6px_20px_rgba(37,211,102,0.23)] bg-[#25D366] text-white hover:bg-[#128C7E] active:scale-[0.98]';

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export function LocationDetails({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={className}>
      <span
        className={`mb-4 block text-[11px] uppercase tracking-[0.32em] ${
          compact ? 'font-medium text-red-800/90' : 'font-bold tracking-widest text-xs text-red-600'
        }`}
      >
        Nuestra Sede
      </span>
      <h2
        className={`${
          compact
            ? 'mb-6 font-nike text-3xl font-normal uppercase tracking-wide text-neutral-900'
            : 'mb-8 text-4xl font-bold text-gray-900'
        }`}
      >
        {LOCATION_DATA.name}
      </h2>

      <div className={`${compact ? 'space-y-5' : 'space-y-8'} flex-1`}>
        <div className="flex items-start">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mr-4 mt-1 ${compact ? 'bg-white/50' : 'bg-red-50'}`}>
            <MapPin size={compact ? 18 : 20} className={compact ? 'text-red-800' : 'text-red-600'} strokeWidth={compact ? 1.6 : 2} />
          </div>
          <div className="w-full">
            <p className={compact ? 'mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-800' : 'font-semibold mb-3 text-gray-900'}>
              Dirección (Doble Acceso)
            </p>
            <div className={`mb-3 pl-3 border-l ${compact ? 'border-red-800/40' : 'border-l-2 border-red-200'}`}>
              <span className={`uppercase tracking-[0.18em] block mb-0.5 ${compact ? 'text-[10px] font-medium text-red-800/80' : 'text-[10px] font-bold text-red-600 tracking-wider'}`}>
                Entrada Principal
              </span>
              <p className={compact ? 'text-[15px] font-normal text-neutral-900' : 'font-medium text-gray-700'}>{LOCATION_DATA.addressMain}</p>
            </div>
            <div className={`pl-3 border-l ${compact ? 'border-neutral-400/60' : 'border-l-2 border-gray-100'}`}>
              <span className={`uppercase tracking-[0.18em] block mb-0.5 ${compact ? 'text-[10px] font-medium text-neutral-600' : 'text-[10px] font-bold text-gray-400 tracking-wider'}`}>
                Entrada Posterior
              </span>
              <p className={compact ? 'text-[15px] font-normal text-neutral-800' : 'text-sm text-gray-600'}>{LOCATION_DATA.addressSecondary}</p>
              <p className={compact ? 'text-xs font-light italic text-neutral-600' : 'text-xs italic text-gray-400'}>{LOCATION_DATA.addressRef}</p>
            </div>
          </div>
        </div>

        {!compact ? (
          <div className="flex items-start">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 mr-4 mt-1">
              <Phone size={20} className="text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">Teléfono</p>
              <p className="text-gray-600">{LOCATION_DATA.phone}</p>
            </div>
          </div>
        ) : null}

        <div className="flex items-start">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mr-4 mt-1 ${compact ? 'bg-white/50' : 'bg-red-50'}`}>
            <Clock size={compact ? 18 : 20} className={compact ? 'text-red-800' : 'text-red-600'} strokeWidth={compact ? 1.6 : 2} />
          </div>
          <div>
            <p className={compact ? 'mb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-800' : 'font-semibold mb-1 text-gray-900'}>
              Horarios de Atención
            </p>
            <p className={compact ? 'text-[15px] font-normal text-neutral-900' : 'text-gray-600'}>{LOCATION_DATA.hours}</p>
          </div>
        </div>

        {compact ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a href={WHATSAPP_HOME_HREF} target="_blank" rel="noopener noreferrer" className={WHATSAPP_BUTTON_CLASS}>
              <WhatsAppIcon />
              Hablar con alguien
            </a>
            <a
              href={LOCATION_DATA.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all duration-300 bg-neutral-900 text-white hover:bg-black active:scale-[0.98]"
            >
              Ver ubicación
              <ArrowRight size={18} />
            </a>
          </div>
        ) : null}
      </div>

      {!compact ? (
      <a
        href={LOCATION_DATA.mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex items-center justify-center px-8 py-4 rounded-xl transition-all group w-full md:w-auto cursor-pointer bg-black text-white font-bold hover:bg-gray-800"
      >
        Ver ubicación en Maps
        <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
      </a>
      ) : null}
    </div>
  );
}
