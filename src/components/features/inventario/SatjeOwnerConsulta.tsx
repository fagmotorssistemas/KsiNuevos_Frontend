'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ExternalLink, Loader2, RotateCcw } from 'lucide-react'
import { ECUADOR_PLATE_HINT, parseEcuadorPlate } from '@/lib/inventario/normalizePlate'
import {
  satjeFiscaliaOk,
  satjePersona,
  satjeProcesosUnicos,
  satjeResumenConsultas,
} from '@/lib/inventario/satjeResult'
import { readSatjeOwnerSession, writeSatjeOwnerSession } from '@/lib/inventario/consultaDialogSession'

type SatjeEstado = 'pendiente' | 'en_proceso' | 'esperando_captcha' | 'completada' | 'error' | string

type SatjeStatusResponse = {
  id?: string
  estado?: SatjeEstado
  mensaje?: string | null
  captchaListo?: boolean
  captchaActual?: number | null
  captchasTotal?: number
  etapa?: string | null
  error?: string
}

const CAPTCHA_STEPS = ['Función Judicial (SATJE)', 'Fiscalía'] as const
const DEFAULT_CAPTCHA_TOTAL = 2

type SatjeResultResponse = {
  resultado?: unknown
  error?: string
}

function statusMessage(estado: SatjeEstado, captchasDone: number, total: number): string {
  if (estado === 'pendiente') return 'En espera de turno'
  if (estado === 'completada') return 'Consulta completada'
  if (estado === 'error') return 'La consulta falló'
  if (estado === 'esperando_captcha') {
    return `Completado ${captchasDone} de ${total}`
  }
  if (captchasDone > 0 && captchasDone < total) {
    return `Completado ${captchasDone} de ${total}`
  }
  if (estado === 'en_proceso') return 'Preparando consulta'
  return 'Consultando…'
}

function stepLabel(index: number, etapa: string | null): string {
  if (etapa) return etapa
  return CAPTCHA_STEPS[index] ?? `CAPTCHA ${index + 1}`
}

function CaptchaStepList({
  estado,
  captchasDone,
  total,
  etapa,
}: {
  estado: SatjeEstado
  captchasDone: number
  total: number
  etapa: string | null
}) {
  const waiting = estado === 'esperando_captcha'
  const steps = Array.from({ length: total }, (_, i) => i)
  return (
    <ol className="mt-3 space-y-2">
      {steps.map((index) => {
        const done = index < captchasDone
        const current = waiting && index === captchasDone
        const upcoming = !done && !current
        return (
          <li
            key={index}
            className="flex items-start gap-2.5 text-sm"
          >
            <span
              className={
                done
                  ? 'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700'
                  : current
                    ? 'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700'
                    : 'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400'
              }
            >
              {done ? <Check className="h-3 w-3" /> : <span className="text-[11px] font-bold">{index + 1}</span>}
            </span>
            <span>
              <span className="font-medium text-slate-800">{stepLabel(index, current ? etapa : null)}</span>
              <span className="block text-xs text-slate-500">
                {done ? 'Completado' : current ? 'Resuelve este CAPTCHA' : upcoming ? 'Pendiente' : null}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function ResultView({ data }: { data: unknown }) {
  const persona = satjePersona(data)
  const procesos = satjeProcesosUnicos(data)
  const resumen = satjeResumenConsultas(data)
  const fiscaliaOk = satjeFiscaliaOk(data)

  if (!persona && procesos.length === 0 && resumen.length === 0) {
    if (typeof data === 'string') {
      return <p className="text-sm text-slate-800 whitespace-pre-wrap">{data}</p>
    }
    return <p className="text-sm text-slate-500">Sin procesos para mostrar.</p>
  }

  return (
    <div className="space-y-4">
      {persona ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-sm font-semibold text-slate-900">{persona.nombre || '—'}</p>
          {persona.cedula ? <p className="text-xs text-slate-600 mt-0.5">Cédula {persona.cedula}</p> : null}
        </div>
      ) : null}

      {resumen.length > 0 ? (
        <ul className="text-xs text-slate-600 space-y-1">
          {resumen.map((row) => (
            <li key={`${row.etiqueta}-${row.valor}`}>
              {row.etiqueta}
              {row.valor ? `: ${row.valor}` : ''}
              {' · '}
              {row.cantidad} proceso{row.cantidad === 1 ? '' : 's'}
            </li>
          ))}
        </ul>
      ) : null}

      <div>
        <p className="text-sm font-bold text-slate-900">
          Procesos judiciales
          <span className="font-medium text-slate-500"> · {procesos.length} único{procesos.length === 1 ? '' : 's'}</span>
        </p>
        {procesos.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No se encontraron procesos.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">N.º proceso</th>
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Acción / infracción</th>
                  <th className="px-3 py-2 font-semibold">Hallado por</th>
                </tr>
              </thead>
              <tbody>
                {procesos.map((row) => (
                  <tr key={row.numero} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">{row.numero}</td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{row.fecha || '—'}</td>
                    <td className="px-3 py-2 text-slate-800">{row.accion || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{row.halladoPor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!fiscaliaOk ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          La consulta de noticias del delito (Fiscalía) no se pudo completar. Los procesos SATJE de arriba sí están disponibles.
        </p>
      ) : null}
    </div>
  )
}

export function SatjeOwnerConsulta() {
  const saved = readSatjeOwnerSession()
  const [nombre, setNombre] = useState(saved?.nombre ?? '')
  const [cedula, setCedula] = useState(saved?.cedula ?? '')
  const [placa, setPlaca] = useState(saved?.placa ?? '')
  const [ruc, setRuc] = useState(saved?.ruc ?? '')
  const [consultaId, setConsultaId] = useState<string | null>(saved?.consultaId ?? null)
  const [estado, setEstado] = useState<SatjeEstado | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)
  const [progressOpen, setProgressOpen] = useState(() => Boolean(saved?.consultaId && saved.progressOpen))
  const [captchasDone, setCaptchasDone] = useState(0)
  const [captchasTotal, setCaptchasTotal] = useState(DEFAULT_CAPTCHA_TOTAL)
  const [etapa, setEtapa] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [captchaListo, setCaptchaListo] = useState(false)
  const [captchaPopupBlocked, setCaptchaPopupBlocked] = useState(false)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevEstadoRef = useRef<SatjeEstado | null>(null)
  const captchasDoneRef = useRef(0)

  const stopPoll = () => {
    if (pollRef.current) {
      clearTimeout(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => {
    writeSatjeOwnerSession({
      nombre,
      cedula,
      placa,
      ruc,
      consultaId,
      progressOpen,
    })
  }, [nombre, cedula, placa, ruc, consultaId, progressOpen])

  useEffect(() => () => {
    stopPoll()
  }, [])

  useEffect(() => {
    if (!consultaId || !progressOpen) return

    let cancelled = false

    const applyProgress = (body: SatjeStatusResponse, next: SatjeEstado) => {
      const total = body.captchasTotal && body.captchasTotal > 0 ? body.captchasTotal : DEFAULT_CAPTCHA_TOTAL
      setCaptchasTotal(total)
      setEtapa(body.etapa ?? null)
      setMensaje(body.mensaje ?? null)

      const prev = prevEstadoRef.current
      if (prev === 'esperando_captcha' && next !== 'esperando_captcha') {
        captchasDoneRef.current = Math.min(total, captchasDoneRef.current + 1)
      }

      if (typeof body.captchaActual === 'number' && body.captchaActual > 0) {
        const fromApi =
          next === 'esperando_captcha'
            ? Math.max(0, body.captchaActual - 1)
            : Math.min(total, body.captchaActual)
        captchasDoneRef.current = Math.max(captchasDoneRef.current, Math.min(total, fromApi))
      }

      if (next === 'completada') {
        captchasDoneRef.current = total
      }

      setCaptchasDone(captchasDoneRef.current)
      prevEstadoRef.current = next
    }

    const tick = async () => {
      try {
        const res = await fetch(`/api/satje/${encodeURIComponent(consultaId)}`)
        const body = (await res.json()) as SatjeStatusResponse
        if (cancelled) return
        if (!res.ok) {
          setError(body.error || 'No se pudo consultar el estado')
          setEstado('error')
          stopPoll()
          return
        }
        const next = body.estado || 'pendiente'
        applyProgress(body, next)
        setEstado(next)
        setCaptchaListo(Boolean(body.captchaListo))
        if (next === 'error') {
          setError(
            body.mensaje ||
              body.error ||
              'El scraper marcó esta consulta como error. KSI sí recibió respuesta (HTTP 200).'
          )
          stopPoll()
          return
        }
        setError(null)
        if (next === 'completada') {
          stopPoll()
          const out = await fetch(`/api/satje/${encodeURIComponent(consultaId)}/resultado`)
          const payload = (await out.json()) as SatjeResultResponse
          if (cancelled) return
          if (!out.ok) {
            setError(payload.error || 'No se pudo leer el resultado')
            setEstado('error')
            return
          }
          setResultado(payload.resultado)
          setProgressOpen(false)
          return
        }
        pollRef.current = setTimeout(() => {
          void tick()
        }, 2000)
      } catch {
        if (cancelled) return
        setError('No se pudo consultar el estado')
        setEstado('error')
        stopPoll()
      }
    }

    void tick()
    return () => {
      cancelled = true
      stopPoll()
    }
  }, [consultaId, progressOpen])

  const plateOk = placa.trim() === '' || Boolean(parseEcuadorPlate(placa))
  const cedulaOk = cedula.trim().length === 10
  const rucOk = ruc.trim() === '' || ruc.trim().length === 13

  const startConsulta = async () => {
    const name = nombre.trim()
    const idNumber = cedula.trim()
    const plate = placa.trim() ? parseEcuadorPlate(placa) : ''
    if (!name || idNumber.length !== 10) return
    if (placa.trim() && !plate) return
    if (ruc.trim() !== '' && ruc.trim().length !== 13) return
    setSubmitting(true)
    setError(null)
    setEstado('pendiente')
    setResultado(null)
    setCaptchasDone(0)
    captchasDoneRef.current = 0
    prevEstadoRef.current = null
    setCaptchasTotal(DEFAULT_CAPTCHA_TOTAL)
    setEtapa(null)
    setMensaje(null)
    setCaptchaListo(false)
    setCaptchaPopupBlocked(false)
    try {
      const res = await fetch('/api/satje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: name,
          cedula: idNumber,
          placa: plate || '',
          ruc: ruc.trim(),
        }),
      })
      const body = (await res.json()) as SatjeStatusResponse & { error?: string }
      if (res.status === 409 && body.id) {
        setConsultaId(body.id)
        setEstado(body.estado || 'pendiente')
        setProgressOpen(true)
        return
      }
      if (!res.ok || !body.id) {
        throw new Error(body.error || 'No se pudo crear la consulta')
      }
      setConsultaId(body.id)
      setEstado(body.estado || 'pendiente')
      setProgressOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la consulta')
    } finally {
      setSubmitting(false)
    }
  }

  const retry = () => {
    stopPoll()
    setConsultaId(null)
    setEstado(null)
    setProgressOpen(false)
    setCaptchasDone(0)
    captchasDoneRef.current = 0
    void startConsulta()
  }

  const dismissProgress = () => {
    stopPoll()
    setProgressOpen(false)
  }

  return (
    <div className="p-4 space-y-4">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          void startConsulta()
        }}
      >
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Nombre completo</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            placeholder="Como demandado / procesado"
            className="mt-1 w-full h-11 px-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Cédula</span>
            <input
              value={cedula}
              onChange={(e) => setCedula(e.target.value.replace(/\D/g, '').slice(0, 10))}
              required
              placeholder="10 dígitos"
              className="mt-1 w-full h-11 px-3 rounded-xl border border-slate-200 text-sm"
            />
          </label>
          <label className="block sm:col-span-1">
            <span className="text-xs font-semibold text-slate-600">Placa</span>
            <input
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))}
              maxLength={7}
              placeholder="Opcional"
              className="mt-1 w-full h-11 px-3 rounded-xl border border-slate-200 text-sm"
            />
            <span className="mt-1 block text-[11px] text-slate-500 leading-snug">Opcional. {ECUADOR_PLATE_HINT}</span>
            {placa.trim() && !plateOk ? (
              <span className="mt-1 block text-[11px] text-red-600">Formato no válido</span>
            ) : null}
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">RUC</span>
            <input
              value={ruc}
              onChange={(e) => setRuc(e.target.value.replace(/\D/g, '').slice(0, 13))}
              placeholder="Opcional"
              className="mt-1 w-full h-11 px-3 rounded-xl border border-slate-200 text-sm"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={submitting || !nombre.trim() || !cedulaOk || !plateOk || !rucOk}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Consultar SATJE
        </button>
      </form>

      {error && !progressOpen ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p>{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-red-900"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reintentar
          </button>
        </div>
      ) : null}

      {resultado != null ? (
        <section className="rounded-xl border border-slate-200 p-4">
          <h4 className="text-sm font-bold text-slate-900">Resultado SATJE</h4>
          <div className="mt-2">
            <ResultView data={resultado} />
          </div>
        </section>
      ) : null}

      {progressOpen ? (
        <div
          className="fixed inset-0 z-[92] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
            <p className="text-sm font-bold text-slate-900">
              {statusMessage(estado || 'pendiente', captchasDone, captchasTotal)}
            </p>
            {estado === 'pendiente' ? (
              <p className="mt-2 text-sm text-slate-600">
                El scraper atiende una consulta a la vez. Si alguien más está consultando, tu turno espera aquí.
              </p>
            ) : null}
            {estado && estado !== 'pendiente' && estado !== 'error' ? (
              <CaptchaStepList
                estado={estado}
                captchasDone={captchasDone}
                total={captchasTotal}
                etapa={etapa}
              />
            ) : null}
            {mensaje && estado === 'esperando_captcha' ? (
              <p className="mt-2 text-xs text-slate-500">{mensaje}</p>
            ) : null}
            {estado === 'esperando_captcha' ? (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!consultaId) return
                    const popup = window.open(
                      `/api/satje/${encodeURIComponent(consultaId)}/captcha`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                    setCaptchaPopupBlocked(!popup)
                  }}
                  disabled={!consultaId || !captchaListo}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  Resolver CAPTCHA {Math.min(captchasDone + 1, captchasTotal)} de {captchasTotal}
                </button>
                {captchaPopupBlocked && consultaId ? (
                  <a
                    href={`/api/satje/${encodeURIComponent(consultaId)}/captcha`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm font-semibold text-blue-700 underline"
                  >
                    El navegador bloqueó la ventana. Abrir CAPTCHA
                  </a>
                ) : null}
                <p className="text-xs text-slate-500">
                  Resuelve el CAPTCHA en la pestaña que se abre. Cuando termines, vuelve a Inventario.
                </p>
                {!captchaListo ? (
                  <p className="text-xs text-slate-500">
                    El CAPTCHA se mostrará en esa pestaña cuando el scraper lo pida.
                  </p>
                ) : null}
              </div>
            ) : estado !== 'error' ? (
              <p className="mt-3 text-sm text-slate-500 inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                Actualizando cada 2 segundos…
              </p>
            ) : null}
            {estado === 'error' ? (
              <div className="mt-3">
                <p className="text-sm text-red-700">
                  {error || mensaje || 'El scraper marcó la consulta como error'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Esto no es un fallo de red de KSI. El job en satje-api quedó en estado error (CAPTCHA, Chrome remoto o timeout).
                </p>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {estado === 'error' ? (
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reintentar
                </button>
              ) : null}
              <button
                type="button"
                onClick={dismissProgress}
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
