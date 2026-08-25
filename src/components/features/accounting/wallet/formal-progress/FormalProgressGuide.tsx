'use client';

import { X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

const ITEMS = [
  {
    label: 'Agenda cumplida',
    when: 'De los expedientes Formal con próxima acción hoy o vencida, cuántos recibieron un paso formal (verificación → cierre) en el día. Es el % que ves en Cartera.',
  },
  {
    label: 'Casos avanzados',
    when: 'Expedientes distintos que registraron al menos un paso Formal hoy. Un caso que hace dos pasos cuenta 1 aquí y 1 en cada categoría.',
  },
  {
    label: 'Pasos 1 a 5',
    when: 'Verificación, visita domiciliaria, predemanda, 4A recuperación / 4B vía judicial, y cierre. Solo esos tipos. Llamadas o WhatsApp de Temprana/Media no entran.',
  },
  {
    label: 'Cierres',
    when: 'Paso 5 registrado hoy (pago, vehículo, acuerdo o cartera castigada).',
  },
  {
    label: 'Saltos',
    when: 'Se ve si alguien avanzó sin completar un paso anterior. No suma a la cobertura; queda para auditoría.',
  },
];

export function FormalProgressGuide({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Cómo se lee este progreso"
        aria-label="Cómo se lee este progreso"
        className={trigger ? 'rounded-full' : undefined}
      >
        {trigger ?? (
          <span className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:bg-slate-50 inline-flex items-center">
            Cómo se revisa
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="formal-progress-guide-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5 animate-in zoom-in-95 duration-200"
          >
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
              <h2
                id="formal-progress-guide-title"
                className="text-sm font-bold uppercase tracking-wide text-slate-500"
              >
                Cómo se revisa el progreso Formal
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar guía"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm text-slate-700">
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Qué estás mirando
                </h3>
                <p>
                  Un solo número del <strong className="font-semibold text-slate-900">escritorio Formal</strong>{' '}
                  (mora 3+ meses), no por persona. El % es cobertura de agenda: acciones
                  programadas/vencidas que sí recibieron un paso Formal hoy (hora Ecuador).
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Qué cuenta
                </h3>
                <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {ITEMS.map((item) => (
                    <li key={item.label} className="px-3 py-2.5 bg-white">
                      <p className="font-medium text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-1">{item.when}</p>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Qué no cuenta
                </h3>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Gestiones Temprana/Media (llamada, WhatsApp, visita de cortesía).</li>
                  <li>Notas, observaciones o cambios de sistema sin paso Formal.</li>
                  <li>Abrir el expediente sin pulsar «Añadir Gestión» de un tipo Formal.</li>
                </ul>
              </section>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
