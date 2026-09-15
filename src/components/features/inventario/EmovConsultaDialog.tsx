'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import { ECUADOR_PLATE_HINT, parseEcuadorPlate } from '@/lib/inventario/normalizePlate'

type Job = {
  id: string
  valor: string
  estado: 'pendiente' | 'en_proceso' | 'esperando_intervencion' | 'completada' | 'error'
  error?: string | null
}
type Resultado = {
  fuente: string
  generado_en: string
  consulta: {
    valor: string
    sin_deudas: boolean
    total_a_pagar: number | null
    deudas: { concepto: string; total: number }[]
  }
}


async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || 'No se pudo consultar EMOV.')
  return body as T
}

const messages = {
  pendiente: 'Tu consulta está en espera.',
  en_proceso: 'Consultando valores en EMOV…',
  esperando_intervencion: 'EMOV no respondió todavía. Si solicitó un CAPTCHA, el operador debe resolverlo en el navegador remoto para continuar.',
  completada: 'Consulta completada.',
  error: 'No se pudo completar la consulta.',
}

export function EmovConsultaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [placa, setPlaca] = useState('')
  const [job, setJob] = useState<Job | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [retry, setRetry] = useState(0)
  const submitting = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const active = !!job && !['completada', 'error'].includes(job.estado)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    if (input.current?.disabled) closeButton.current?.focus()
    else input.current?.focus()
    return () => previous?.focus()
  }, [open])

  const jobId = job?.id
  useEffect(() => {
    if (!jobId) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const status = await readResponse<Job>(await fetch(`/api/emov/${jobId}`, {
          cache: 'no-store', signal: controller.signal,
        }))
        if (controller.signal.aborted) return
        setJob(status)
        setError('')
        if (status.estado === 'completada') {
          const data = await readResponse<Resultado>(await fetch(`/api/emov/${jobId}/resultado`, {
            cache: 'no-store', signal: controller.signal,
          }))
          if (controller.signal.aborted) return
          setResultado(data)
        } else if (status.estado === 'error') {
          setError(status.error || messages.error)
        } else {
          timer = setTimeout(poll, 3000)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'No se pudo consultar EMOV.')
        }
      }
    }
    void poll()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [jobId, retry])

  async function consultar() {
    if (submitting.current || active) return
    const normalized = parseEcuadorPlate(placa)
    if (!normalized) { setError(ECUADOR_PLATE_HINT); return }
    submitting.current = true
    setStarting(true)
    setError('')
    setResultado(null)
    setJob(null)
    try {
      const next = await readResponse<Job>(await fetch('/api/emov', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa: normalized }),
      }))
      setPlaca(next.valor)
      setJob(next)
      setRetry((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar la consulta.')
    } finally {
      submitting.current = false
      setStarting(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="emov-title"
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose()
          if (event.key !== 'Tab') return
          const nodes = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]')
          if (!nodes?.length) return
          const first = nodes[0], last = nodes[nodes.length - 1]
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        }}>
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-5">
          <div>
            <h2 id="emov-title" className="text-lg font-bold text-slate-900">Consultar EMOV Cuenca</h2>
            <p className="text-xs text-slate-500">Valores adeudados por placa</p>
          </div>
          <button ref={closeButton} type="button" aria-label="Cerrar consulta EMOV" onClick={onClose} className="rounded-lg p-2 text-slate-600 hover:bg-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
          <form onSubmit={(event) => { event.preventDefault(); void consultar() }} className="space-y-3">
            <label htmlFor="emov-placa" className="block text-sm font-semibold text-slate-700">Placa</label>
            <div className="flex flex-wrap gap-2">
              <input ref={input} id="emov-placa" value={placa} maxLength={10} disabled={starting || active}
                onChange={(event) => setPlaca(event.target.value.toUpperCase())} placeholder="ABC1234"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" disabled={starting || active} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {starting || active ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {starting || active ? 'Consultando…' : 'Consultar EMOV'}
              </button>
            </div>
          </form>
          {job && <p role="status" className={`rounded-xl p-3 text-sm ${job.estado === 'esperando_intervencion' ? 'bg-amber-50 text-amber-900' : 'bg-blue-50 text-blue-900'}`}>
            {job.valor}: {messages[job.estado]}
          </p>}
          {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
            <p>{error}</p>
            {job && job.estado !== 'error' && <button type="button" onClick={() => setRetry((n) => n + 1)} className="mt-2 font-semibold underline">Reintentar seguimiento</button>}
          </div>}
          {resultado && <section className="space-y-3">
            <h3 className="font-bold text-slate-900">Resultado para {resultado.consulta.valor}</h3>
            <p className="text-sm text-slate-700">{resultado.consulta.sin_deudas ? 'EMOV no reporta deudas.' : `Total a pagar: ${resultado.consulta.total_a_pagar === null ? 'No disponible' : `$${resultado.consulta.total_a_pagar.toFixed(2)}`}`}</p>
            {resultado.consulta.deudas.length > 0 && <table className="w-full text-left text-sm text-slate-800">
              <thead><tr className="border-b"><th className="py-2">Concepto</th><th className="py-2 text-right">Valor</th></tr></thead>
              <tbody>{resultado.consulta.deudas.map((deuda, i) => <tr key={`${i}-${deuda.concepto}`} className="border-b border-slate-100">
                <td className="py-2">{deuda.concepto}</td><td className="py-2 text-right">${deuda.total.toFixed(2)}</td>
              </tr>)}</tbody>
            </table>}
            {!resultado.consulta.sin_deudas && resultado.consulta.deudas.length === 0 && <p className="text-sm text-amber-800">EMOV devolvió el total, pero no se pudo extraer el desglose.</p>}
          </section>}
        </div>
      </div>
    </div>
  )
}
