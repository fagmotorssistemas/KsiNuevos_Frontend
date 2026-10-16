import { AuditoriaCarroPanel } from '@/components/features/leads/embudo/AuditoriaCarroPanel'

export default function EmbudoPage() {
  return (
    <div className="space-y-5 pb-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Embudo</h1>
        <p className="text-sm text-stone-500">Carro por carro: dónde se cae y por qué.</p>
      </header>
      <AuditoriaCarroPanel />
    </div>
  )
}
