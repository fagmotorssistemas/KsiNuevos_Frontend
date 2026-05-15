'use client'

interface CustomTopicInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function CustomTopicInput({ value, onChange, disabled }: CustomTopicInputProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">Tema del noticiero</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={5}
        placeholder="Ej: Promoción de fin de mes 10% descuento en todos los SUV. Invitación al evento de puertas abiertas del sábado..."
        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 disabled:bg-gray-50"
      />
      <p className="text-xs text-gray-500">
        Describe el tema libremente. La IA generará un guión estilo noticiero de ~25 segundos.
      </p>
    </div>
  )
}
