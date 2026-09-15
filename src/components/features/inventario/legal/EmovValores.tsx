import { emovText, type EmovSnapshot } from '@/lib/inventario/emovResult'

export function EmovValores({ emov }: { emov?: EmovSnapshot | null }) {
  return <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
    <h3 className="font-semibold text-slate-900">Valores EMOV Cuenca</h3>
    {emov?.estado === 'completada' ? <>
      <p className="text-sm font-semibold">Total EMOV: {emov.total === null ? 'No disponible' : `$${emov.total.toFixed(2)}`}</p>
      <table className="w-full text-sm"><thead><tr><th className="text-left">Concepto</th><th className="text-right">Valor</th></tr></thead>
        <tbody>{emov.conceptos.map((c, i) => <tr key={i} className="border-t border-emerald-100"><td className="py-2">{c.concepto}</td><td className="text-right">${c.total.toFixed(2)}</td></tr>)}</tbody>
      </table>
      {emov.total === 0 && <p className="text-sm">Sin valores pendientes en EMOV.</p>}
      {!!emov.total && !emov.conceptos.length && <p className="text-sm">EMOV reportó un total sin desglose.</p>}
      <p className="text-xs text-slate-600">Los valores se muestran por fuente; no se suman nuevamente a las citaciones ANT.</p>
    </> : <p role="status" className="text-sm">{emovText(emov)}{!emov || emov.estado === 'error' ? '. Pulsa Consultar EMOV en Contraste oficial.' : ''}</p>}
  </section>
}
