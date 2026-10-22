import React, { createContext, useContext } from 'react'
import type { ReelTheme } from '../plan/types'
import { PALETTES, type Palette } from '../theme'

const PaletteContext = createContext<Palette>(PALETTES.ksi)

/** Los gráficos que comparten ambos diseños (sticker, barra de progreso) toman el acento de aquí. */
export const PaletteProvider: React.FC<{ theme: ReelTheme; children: React.ReactNode }> = ({ theme, children }) => (
  <PaletteContext.Provider value={PALETTES[theme] ?? PALETTES.ksi}>{children}</PaletteContext.Provider>
)

export const usePalette = () => useContext(PaletteContext)
