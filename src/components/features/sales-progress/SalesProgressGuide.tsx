'use client';

import { CircleHelp, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

const RATES = [
  {
    label: 'Anillo: oficio del día',
    how: 'X de Y',
    when: 'Gestiones hechas ÷ gestiones que había que hacer hoy: contestar (cuota 35), IA, citas (vino/no vino), showroom, info. faltante y financiamiento. No es 21 de 21 de los que llegaron. Si contestó los de hoy pero no llegó a 35, el anillo de contestados queda corto.',
  },
  {
    label: 'Contestados (cuota)',
    how: 'X de 35',
    when: 'Resúmenes ejecutivos guardados hoy. Meta 35 al día (Juan: 50). Si llegaron 21, esos 21 cuentan; hay que completar 35 con leads de otros días que nunca tuvieron resumen. 21 de 21 no es 100%.',
  },
  {
    label: 'Seguimientos IA',
    how: 'X de Y',
    when: 'Lo que mandó el bot (fecha/hora detectada). Hay que agendarlo como cita. X de Y hoy. Los vencidos de 14 días salen en Se quedaron de hacer y en el detalle.',
  },
  {
    label: 'Citas de agenda',
    how: 'X de Y',
    when: 'De las citas de hoy, cuántas tienen gestión: vino, o no vino con motivo y llamada/mensaje.',
  },
  {
    label: 'Visitas showroom',
    how: 'Cuántas',
    when: 'Cuántas visitas registraron hoy en Showroom. Eso no es el seguimiento: es anotar que el cliente vino.',
  },
  {
    label: 'Seguimiento showroom',
    how: 'X de Y',
    when: 'De las visitas de hoy, cuántas tienen nota de seguimiento. Registrar la visita no basta. Primero la llamada, después la nota.',
  },
  {
    label: 'Llegaron → cita',
    how: '%',
    when: 'De los leads que llegaron hoy, cuántos ya tienen una cita creada hoy.',
  },
  {
    label: 'Info. faltante / financiamiento (hoy)',
    how: 'X de Y',
    when: 'De las que llegaron hoy, cuántas se contestaron o se llenaron. Contestó no es lo mismo que salió de etapa.',
  },
];

const POINTS = [
  {
    label: 'Leads contestados',
    pts: '+1',
    cap: '40 leads · 40 pts',
    when: 'Guardó el resumen ejecutivo hoy. Un lead = 1 punto, una sola vez. Cuota de oficio: 35 al día. Tope de puntos: 40 (Juan: 50).',
  },
  {
    label: 'Visitas showroom',
    pts: '+4',
    cap: '3 visitas · 12 pts',
    when: 'Registrar la visita en Showroom. Suma aunque no escribas seguimiento.',
  },
  {
    label: 'Seguimiento showroom',
    pts: '+3 / +2 / +1',
    cap: 'tope 9 pts (extra)',
    when: 'Escribir la primera gestión de la visita. Mismo día = 3, al día siguiente = 2, a los 2+ días = 1. Sin gestión = 0. La nota al crear la visita no cuenta.',
  },
  {
    label: 'Lead ganado',
    pts: '+10',
    cap: '2 ganados · 20 pts',
    when: 'Cierra el lead como Ganado. Pasar a Perdido no suma. No es el titular de esta pantalla.',
  },
  {
    label: 'Asesoría avanzada',
    pts: '+5',
    cap: 'sin tope',
    when: 'Llena la gestión completa (no basta el estado). De las que llegaron hoy, cuántas se enviaron llenas.',
  },
  {
    label: 'Cita completada',
    pts: '+5',
    cap: '2 citas · 10 pts',
    when: 'En Agenda: si vino suma. Si no vino también suma cuando dejan el motivo y si se llamó o se dejó un mensaje.',
  },
  {
    label: 'Proforma PDF',
    pts: '+3',
    cap: '1 · 3 pts',
    when: 'Genera una proforma con PDF. Compartir por WhatsApp no se registra.',
  },
];

export function SalesProgressGuide({ trigger }: { trigger?: ReactNode }) {
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
        title="Cómo se revisa este progreso"
        aria-label="Cómo se revisa este progreso"
        className={trigger ? 'rounded-full' : undefined}
      >
        {trigger ?? (
          <span className="h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center">
            <CircleHelp className="h-4 w-4" />
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
                  El oficio:{' '}
                  <strong className="font-semibold text-slate-900">cuánto están haciendo para vender</strong>,{' '}
                  <strong className="font-semibold text-slate-900">en qué nos quedamos</strong> (montón abierto) y{' '}
                  <strong className="font-semibold text-slate-900">qué se quedaron de hacer</strong> vs lo que cumplieron
                  hoy. Las unidades vendidas no entran aquí.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Cómo leerlo</h3>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>
                    Arriba eliges el <strong className="font-semibold text-slate-900">mes</strong> (solo los meses de
                    ese año; otro año aparece si hay registro), la{' '}
                    <strong className="font-semibold text-slate-900">semana 1–4</strong> o el{' '}
                    <strong className="font-semibold text-slate-900">calendario del día</strong>. Meses y semanas que aún
                    no llegan salen en gris.
                  </li>
                  <li>
                    El anillo es el <strong className="font-semibold text-slate-900">oficio del día</strong>: gestiones
                    hechas de las que había que hacer (contestar, IA, citas, showroom, info., financiamiento). Las
                    barras de abajo son esas mismas cuentas. Contestados de la semana va en el chip, no en el anillo.
                  </li>
                  <li>
                    La frase dice <strong className="font-semibold text-slate-900">cumpliendo</strong> y{' '}
                    <strong className="font-semibold text-slate-900">se quedaron</strong> en claro.
                  </li>
                  <li>
                    <strong className="font-semibold text-slate-900">En qué nos quedamos</strong>: info. faltante,
                    financiamiento y pedidos pendientes. Es el montón, no solo lo de hoy. Toca un nombre y se abre el
                    caso.
                  </li>
                  <li>
                    <strong className="font-semibold text-slate-900">Se quedaron de hacer</strong> es lo del día: IA sin
                    agendar, citas sin vino/no vino, showroom sin nota, info. faltante sin contestar, ficha de
                    financiamiento incompleta.
                  </li>
                  <li>
                    <strong className="font-semibold text-slate-900">Haciendo para vender</strong> son las barras X de Y
                    (sin “ganado” mezclado). Contestó no es lo mismo que salió de etapa.
                  </li>
                  <li>
                    En <strong className="font-semibold text-slate-900">Resumen de todos</strong> ves % cumpliendo y
                    quedados (info, fin., pedidos). Toca el nombre para cambiar de vendedor.
                  </li>
                </ol>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Tasas (lo que mira el jefe)</h3>
                <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {RATES.map((item) => (
                    <li key={item.label} className="px-3 py-2.5 bg-white">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-medium text-slate-900">{item.label}</p>
                        <p className="text-xs tabular-nums text-slate-500 shrink-0">{item.how}</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{item.when}</p>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Qué suma (tope 100, atrás)</h3>
                <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {POINTS.map((item) => (
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
                <p className="text-xs text-slate-400">
                  Los puntos siguen atrás. No son el titular.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Roles</h3>
                <ul className="space-y-1.5">
                  <li>
                    <strong className="font-semibold text-slate-900">Felipe, Vanessa y Xavier</strong> — pipeline del día
                    y de la semana. Cuota de resúmenes: 35 al día. Contestar los que llegan no cierra el día: hay que
                    completar con cartera sin resumen. Tope de puntos de contestados: 40.
                  </li>
                  <li>
                    <strong className="font-semibold text-slate-900">Juan</strong> — cartera estrancada (leads viejos).
                    No se le pide pipeline nuevo. Tope de contestados: 50 al día. En el ranking ves cuántos{' '}
                    <strong className="font-semibold text-slate-900">gestionó hoy</strong> y sus quedados.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Qué no cuenta</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Entrar a Leads, Agenda o Showroom sin registrar nada.</li>
                  <li>Cambiar el estado sin guardar el resumen ejecutivo.</li>
                  <li>Contestar info. faltante y dejarla en En proceso: no salió de etapa.</li>
                  <li>La observación al crear la visita: no es seguimiento (hay que escribir la gestión).</li>
                  <li>Descartar un seguimiento IA en Agenda lo saca de la lista (limpia fecha/hora del bot).</li>
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
