'use client';

import { FileText, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const ITEMS = [
  {
    label: 'Leads contestados',
    pts: '+2',
    cap: '20 leads · 40 pts',
    when: 'Guardó el resumen ejecutivo hoy. Un lead cuenta una sola vez. Es la mayor parte del día, pero sola no llega a 80.',
  },
  {
    label: 'Visitas showroom',
    pts: '+4',
    cap: '3 visitas · 12 pts',
    when: 'Toda visita del día asignada al vendedor, con o sin gestión escrita.',
  },
  {
    label: 'Lead ganado',
    pts: '+10',
    cap: '2 ganados · 20 pts',
    when: 'Cierra el lead como Ganado. Pasar a Perdido no suma.',
  },
  {
    label: 'Asesoría avanzada',
    pts: '+5',
    cap: '3 · 15 pts',
    when: 'Mueve la asesoría de financiamiento a En proceso o Resuelto.',
  },
  {
    label: 'Cita completada',
    pts: '+5',
    cap: '2 citas · 10 pts',
    when: 'Marca la cita como completada en Agenda.',
  },
  {
    label: 'Proforma PDF',
    pts: '+3',
    cap: '1 · 3 pts',
    when: 'Genera una proforma con PDF. Compartir por WhatsApp no se registra.',
  },
];

export function SalesProgressGuide() {
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
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2 shadow-sm"
        title="Cómo se revisa este progreso"
      >
        <FileText className="h-4 w-4" />
        <span className="hidden sm:inline">Cómo se revisa</span>
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
            aria-labelledby="progress-guide-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5 animate-in zoom-in-95 duration-200"
          >
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
              <h2 id="progress-guide-title" className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Cómo se revisa el progreso
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
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Qué estás mirando</h3>
                <p>
                  Un día perfecto suma <strong className="font-semibold text-slate-900">100 puntos</strong> (hora de
                  Ecuador). El score mira si el vendedor gestionó y avanzó hacia la venta, no si solo abrió pantallas.
                </p>
                <p>
                  Contestados son la mayor parte (<strong className="font-semibold text-slate-900">40 pts</strong>), pero
                  con volumen y showroom no llegas a 80. Para 80 hacen falta también ganado, asesoría, citas o proforma.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Cómo leerlo</h3>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>
                    <strong className="font-semibold text-slate-900">Puntos del día</strong> y el ranking: quién avanzó
                    esa fecha.
                  </li>
                  <li>
                    En el ranking, <strong className="font-semibold text-slate-900">llegaron</strong> son leads nuevos del
                    día. <strong className="font-semibold text-slate-900">Contestados</strong> son resúmenes ejecutivos
                    guardados hoy (de cualquier lead).
                  </li>
                  <li>
                    Toca una categoría para ver el detalle. Si está en 0, esa palanca no se usó.
                  </li>
                  <li>
                    La tendencia es el <strong className="font-semibold text-slate-900">equipo en %</strong> (Felipe,
                    Vanessa y Xavier), de <strong className="font-semibold text-slate-900">sábado a viernes</strong>.
                    100% = los 3 al tope. Toca un día para ver esa fecha.
                  </li>
                </ol>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Qué suma (tope 100)</h3>
                <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {ITEMS.map((item) => (
                    <li key={item.label} className="px-3 py-2.5 bg-white">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-medium text-slate-900">{item.label}</p>
                        <p className="text-xs tabular-nums text-slate-500 shrink-0">
                          {item.pts} · {item.cap}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{item.when}</p>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-slate-400">40 + 12 + 20 + 15 + 10 + 3 = 100</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Roles</h3>
                <ul className="space-y-1.5">
                  <li>
                    <strong className="font-semibold text-slate-900">Felipe, Vanessa y Xavier</strong> — pipeline del día.
                    Se espera que trabajen los leads que llegan hoy.
                  </li>
                  <li>
                    <strong className="font-semibold text-slate-900">Juan</strong> — cartera estrancada. El backlog no
                    resta. En el ranking ves <strong className="font-semibold text-slate-900">gestionados hoy</strong>{' '}
                    (resumen ejecutivo), aunque el lead no sea de hoy. Suma con las mismas categorías.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Qué no cuenta</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Entrar a Leads, Agenda o Showroom sin registrar nada.</li>
                  <li>Cambiar el estado sin guardar el resumen ejecutivo.</li>
                  <li>Cerrar como Perdido (solo Ganado suma).</li>
                  <li>El historial de interacciones: no suma aparte del resumen.</li>
                  <li>Acciones de otro vendedor o de otro día (corte 00:00 Ecuador).</li>
                </ul>
              </section>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
