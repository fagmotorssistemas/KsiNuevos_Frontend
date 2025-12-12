// --- ARCHIVO: src/lib/supabase/client.ts ---
'use client' // Importante para que use el 'browser' client

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

// ¡YA NO ES 'const supabase = ...' !
// Ahora es una función que crea el cliente.
// No la llamamos aquí, solo la exportamos.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}