'use client'

import { useState } from 'react'
import {
  clampMusicTrimSec,
  formatMusicTimeSec,
  parseMusicTimeInput,
} from './music-trim-time'

type Props = {
  valueSec: number
  maxSec: number
  disabled?: boolean
  onChangeSec: (sec: number) => void
  labelClassName?: string
  inputClassName?: string
}

export function MusicTrimStartField({
  valueSec,
  maxSec,
  disabled = false,
  onChangeSec,
  labelClassName = 'text-xs font-medium text-gray-700',
  inputClassName = 'w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center font-mono tabular-nums',
}: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const display = draft ?? formatMusicTimeSec(valueSec)

  function commitDraft(raw: string) {
    const parsed = parseMusicTimeInput(raw)
    if (parsed != null) {
      onChangeSec(clampMusicTrimSec(parsed, maxSec))
    }
    setDraft(null)
  }

  return (
    <>
      <label className={labelClassName}>Inicio manual del track</label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          step={1}
          max={maxSec}
          value={Math.min(valueSec, maxSec)}
          onChange={(e) => {
            setDraft(null)
            onChangeSec(Number(e.target.value))
          }}
          className="flex-1 accent-violet-600"
          disabled={disabled}
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder="0:00"
          value={display}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commitDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          className={inputClassName}
          disabled={disabled}
          aria-label="Inicio del track en minutos:segundos"
        />
      </div>
      <p className="text-xs text-gray-500">
        Formato <span className="font-mono">m:ss</span>
        {maxSec > 0 ? (
          <>
            {' '}
            · máx. {formatMusicTimeSec(maxSec)}
          </>
        ) : null}
      </p>
    </>
  )
}
