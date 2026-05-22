'use client'

import { NOTICIERO_AVATARS } from '../config/avatars'

const KSI_RED = '#CC0000'

const PRESENTER_STYLES: Record<string, { circle: string; initials: string }> = {
  Violante: { circle: 'bg-rose-100', initials: 'text-rose-800' },
  Hada: { circle: 'bg-violet-100', initials: 'text-violet-800' },
  Colin: { circle: 'bg-sky-100', initials: 'text-sky-800' },
}

export interface NoticieroPresenterSelection {
  id: string
  voice_id: string
  name: string
}

interface NoticieroPresenterPickerProps {
  value: NoticieroPresenterSelection
  onChange: (presenter: NoticieroPresenterSelection) => void
  disabled?: boolean
}

export function NoticieroPresenterPicker({
  value,
  onChange,
  disabled,
}: NoticieroPresenterPickerProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">Seleccionar Presentador</label>
      <div className="flex flex-wrap gap-3">
        {NOTICIERO_AVATARS.map((avatar) => {
          const selected = value.id === avatar.id
          const styles = PRESENTER_STYLES[avatar.name] ?? {
            circle: 'bg-gray-100',
            initials: 'text-gray-700',
          }
          const initials = avatar.name.slice(0, 1).toUpperCase()

          return (
            <button
              key={avatar.id}
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange({
                  id: avatar.id,
                  voice_id: avatar.voice_id,
                  name: avatar.name,
                })
              }
              className={`flex flex-1 min-w-[140px] max-w-[200px] flex-col items-center gap-2 rounded-xl border-2 bg-white px-4 py-4 shadow-sm transition-all disabled:opacity-50 ${
                selected
                  ? 'shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              style={
                selected
                  ? { borderColor: KSI_RED, boxShadow: `0 0 0 1px ${KSI_RED}` }
                  : undefined
              }
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-extrabold ${styles.circle} ${styles.initials}`}
              >
                {initials}
              </span>
              <span className="text-sm font-bold text-gray-900">{avatar.name}</span>
              <span className="text-xs text-gray-500 capitalize">
                {avatar.gender === 'female' ? 'Presentadora' : 'Presentador'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
