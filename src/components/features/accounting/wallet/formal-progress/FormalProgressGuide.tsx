'use client';

import { FileText, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

const ITEMS = [
  {
    label: 'Agenda cumplida',
    when: 'De los expedientes con saldo pendiente y próxima acción hoy o vencida, cuántos recibieron un paso Formal. Es el % del anillo. Quien ya no debe no entra.',
  },
  {
    label: 'Quedados · agenda',
    when: 'Los de esa agenda que hoy no tuvieron verificación, visita, predemanda, 4A/4B ni cierre. Toca la tarjeta para la lista.',
  },
  {
    label: 'Quedados · sin arrancar',
    when: 'Expedientes abiertos con saldo pendiente que nunca registraron un paso Formal. Si ya pagaron, no aparecen.',
  },
  {
    label: 'Quedados · en un paso',
    when: 'Ya arrancaron el pipeline (tienen al menos un paso) y todavía no hay cierre. Ahí se ve en qué paso se quedaron.',
  },
  {
    label: 'Lo que se cumplió',
    when: 'Pasos 1 a 5 registrados hoy. Un caso que hace dos pasos cuenta en cada uno. Llamadas o WhatsApp de Temprana/Media no entran.',
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
      {trigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Cómo se revisa este progreso"
          aria-label="Cómo se revisa este progreso"
          className="rounded-full"
        >
          {trigger}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2 shadow-sm"
          title="Cómo se revisa este progreso"
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Cómo se revisa</span>
        </button>
      )}

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
                  (mora 3+ meses), no por persona. Se lee igual que ventas: qué se está haciendo, en qué se
                  quedaron y qué se cumplió hoy (hora Ecuador).
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
