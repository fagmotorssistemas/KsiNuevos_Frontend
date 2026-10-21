import React from 'react'
import type { IconName } from '../plan/schema'

type Props = { name: IconName; size: number; color?: string; strokeWidth?: number }

/** Íconos de línea (24×24) para las características que Gemini puede señalar. */
const PATHS: Record<IconName, React.ReactNode> = {
  volante: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M3.4 10.6c3-.9 5.6-1.2 8.6-1.2s5.6.3 8.6 1.2" />
      <path d="M12 14.4V21" />
      <path d="M9.8 13.2 5 18.4M14.2 13.2 19 18.4" />
    </>
  ),
  motor: (
    <>
      <path d="M3 10h2V8h3V6h7v2h2l2.5 2.5H21v5h-1.5L17 18H9l-2-2H5v-2H3z" />
      <path d="M11 9.5 9.6 12.6h2.8L11 15.6" />
    </>
  ),
  pantalla: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16.5V20" />
      <path d="M7 9h5M7 12h8" />
    </>
  ),
  camara: (
    <>
      <path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4z" />
      <circle cx="12" cy="13.2" r="3.6" />
    </>
  ),
  asiento: (
    <>
      <path d="M8 3.5c1.6 0 2.6 1 2.4 2.8l-1 6.7h6.4c1.3 0 2.2 1 2.2 2.3V18H8.2c-1.6 0-2.7-1.2-2.6-2.8L6.2 5.6C6.3 4.4 6.9 3.5 8 3.5z" />
      <path d="M9 18v2.5M16 18v2.5" />
    </>
  ),
  rin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 10V3.5M13.9 11.4l6.1-2M13.2 13.6l3.8 5.2M10.8 13.6 7 18.8M10.1 11.4 4 9.4" />
    </>
  ),
  velocimetro: (
    <>
      <path d="M4.2 17.5a9 9 0 1 1 15.6 0" />
      <path d="M12 14 16.5 8.8" />
      <circle cx="12" cy="14" r="1.6" />
      <path d="M6.8 12.5h1.5M12 6.6V8M17.2 12.5h-1.5" />
    </>
  ),
  transmision: (
    <>
      <circle cx="6" cy="5" r="1.6" />
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="18" cy="5" r="1.6" />
      <circle cx="6" cy="19" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
      <path d="M6 6.6v10.8M12 6.6v10.8M18 6.6V12H6" />
    </>
  ),
  traccion: (
    <>
      <rect x="3" y="3.5" width="4.5" height="6.5" rx="1.4" />
      <rect x="16.5" y="3.5" width="4.5" height="6.5" rx="1.4" />
      <rect x="3" y="14" width="4.5" height="6.5" rx="1.4" />
      <rect x="16.5" y="14" width="4.5" height="6.5" rx="1.4" />
      <path d="M7.5 6.8h9M7.5 17.2h9M12 6.8v10.4" />
    </>
  ),
  combustible: (
    <>
      <path d="M5 20V5.5C5 4.7 5.7 4 6.5 4h6c.8 0 1.5.7 1.5 1.5V20M3.5 20h12" />
      <path d="M7.5 7.5h4v3.5h-4z" />
      <path d="M14 9h2.2c.9 0 1.6.7 1.6 1.6v5.2a1.3 1.3 0 0 0 2.6 0V8.4L18 6" />
    </>
  ),
  aire: (
    <>
      <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
      <path d="m9.6 4.6 2.4 2 2.4-2M9.6 19.4l2.4-2 2.4 2" />
    </>
  ),
  seguridad: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6z" />
      <path d="m8.6 12 2.4 2.4 4.6-4.8" />
    </>
  ),
  maletero: (
    <>
      <path d="M3.5 10.5 6 5h12l2.5 5.5V18h-17z" />
      <path d="M3.5 10.5h17M10 14h4" />
    </>
  ),
  luces: (
    <>
      <path d="M9.5 6C6 6 4 8.7 4 12s2 6 5.5 6c1.3 0 2-.8 2-2V8c0-1.2-.7-2-2-2z" />
      <path d="M14.5 8.5H20M14.5 12H21M14.5 15.5H20" />
    </>
  ),
  familia: (
    <>
      <circle cx="7.5" cy="6.5" r="2.3" />
      <circle cx="16.5" cy="6.5" r="2.3" />
      <circle cx="12" cy="12" r="1.8" />
      <path d="M3.8 20v-5.4c0-2 1.7-3.6 3.7-3.6M20.2 20v-5.4c0-2-1.7-3.6-3.7-3.6M9 20v-2.6c0-1.6 1.3-2.8 3-2.8s3 1.2 3 2.8V20" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  estrella: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" />,
}

export const Icon: React.FC<Props> = ({ name, size, color = '#fff', strokeWidth = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {PATHS[name]}
  </svg>
)
