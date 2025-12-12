// (1) Importamos la función 'useAuth' original que creamos en AuthContext
import { useAuth } from '@/contexts/AuthContext'

// (2) Simplemente la exportamos de nuevo.
// Esto nos permite importarla desde '@hooks/useAuth' en lugar de
// la ruta más larga '@contexts/AuthContext'
export { useAuth }