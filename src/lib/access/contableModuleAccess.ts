import type { Database } from '@/types/supabase'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

/**
 * Rol contable: acceso a Taller / Seguros (misma regla en navbar y en middleware).
 * Nota: no usar `can_access_* === false` de la BD para denegar: el default SQL es `false` y
 * bloquearía a todos los contables; además el cliente a veces no recibe la clave y `undefined === false` no coincide.
 */
export function contableMayAccessTaller(profile: Pick<ProfileRow, 'role'> | null): boolean {
  if (!profile) return false
  return (profile.role ?? '').toString().toLowerCase().trim() === 'contable'
}

export function contableMayAccessSeguros(profile: Pick<ProfileRow, 'role'> | null): boolean {
  if (!profile) return false
  return (profile.role ?? '').toString().toLowerCase().trim() === 'contable'
}

export function mayAccessSegurosRoute(profile: Pick<ProfileRow, 'role'> | null): boolean {
  if (!profile) return false
  const r = (profile.role ?? '').toString().toLowerCase().trim()
  if (r === 'admin') return true
  return contableMayAccessSeguros(profile)
}

export function mayAccessTallerRoute(profile: Pick<ProfileRow, 'role'> | null): boolean {
  if (!profile) return false
  const r = (profile.role ?? '').toString().toLowerCase().trim()
  if (r === 'taller') return true
  if (r === 'admin') return true
  return contableMayAccessTaller(profile)
}
