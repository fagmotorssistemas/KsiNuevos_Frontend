#!/usr/bin/env node
/**
 * Establece la contraseña de un usuario de Auth por UUID (API admin).
 * Útil cuando el correo no es accesible y no puedes usar el flujo de recuperación.
 *
 * Requiere en el entorno (p. ej. con `node --env-file=.env`):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY  (nunca en el cliente ni en git)
 *   - SUPABASE_NEW_PASSWORD      (evita pasar la clave por argv / historial)
 *
 * Uso:
 *   SUPABASE_NEW_PASSWORD='tu_nueva_clave' npm run supabase:admin-set-password -- <uuid>
 *
 * Ejemplo:
 *   SUPABASE_NEW_PASSWORD='...' npm run supabase:admin-set-password -- 920fe992-8f4a-4866-a9b6-02f6009fc7b3
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const newPassword = process.env.SUPABASE_NEW_PASSWORD
const uid = process.argv[2]?.trim()

if (!url || !serviceKey) {
  console.error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (revisa .env y usa node --env-file=.env vía npm run).'
  )
  process.exit(1)
}

if (!uid) {
  console.error('Falta el UUID del usuario.')
  console.error(
    "Uso: SUPABASE_NEW_PASSWORD='...' npm run supabase:admin-set-password -- <uuid>"
  )
  process.exit(1)
}

if (!newPassword || newPassword.length < 6) {
  console.error(
    'Define SUPABASE_NEW_PASSWORD en el entorno (mínimo 6 caracteres; no la pongas en argv).'
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data, error } = await supabase.auth.admin.updateUserById(uid, {
  password: newPassword,
})

if (error) {
  console.error('Error al actualizar usuario:', error.message)
  process.exit(1)
}

console.log('Contraseña actualizada para:', data.user?.id ?? uid)
console.log('Email en Auth:', data.user?.email ?? '(sin email)')
