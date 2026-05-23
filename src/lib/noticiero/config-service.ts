import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { NoticieroConfig, NoticieroHistory } from './types'

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function getNoticieroConfig(): Promise<NoticieroConfig | null> {
  const supabase = getServiceClient()
  const { data, error } = await supabase.from('noticiero_config').select('*').limit(1).maybeSingle()
  if (error) {
    console.error('[noticiero/config] read error:', error)
    throw new Error(error.message)
  }
  return data as NoticieroConfig | null
}

export async function updateNoticieroConfig(
  id: string,
  patch: Partial<Omit<NoticieroConfig, 'id' | 'created_at'>>
): Promise<NoticieroConfig> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('noticiero_config')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    console.error('[noticiero/config] update error:', error)
    throw new Error(error?.message ?? 'No se pudo actualizar la configuración')
  }
  return data as NoticieroConfig
}

export async function getNoticieroHistory(limit = 20): Promise<NoticieroHistory[]> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('noticiero_history')
    .select('*, inventoryoracle(brand, model, year)')
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[noticiero/history] read error:', error)
    throw new Error(error.message)
  }
  return (data ?? []) as NoticieroHistory[]
}

export async function getNoticieroHistoryById(id: string): Promise<NoticieroHistory | null> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('noticiero_history')
    .select('*, inventoryoracle(brand, model, year)')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[noticiero/history] read by id error:', error)
    throw new Error(error.message)
  }
  return data as NoticieroHistory | null
}

export async function createNoticieroHistoryRow(
  row: Omit<NoticieroHistory, 'id' | 'published_at' | 'inventoryoracle'>
): Promise<string> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('noticiero_history')
    .insert(row)
    .select('id')
    .single()

  if (error || !data?.id) {
    console.error('[noticiero/history] insert error:', error)
    throw new Error(error?.message ?? 'No se pudo crear el historial')
  }
  return data.id
}

export async function updateNoticieroHistory(
  id: string,
  patch: Partial<Omit<NoticieroHistory, 'id' | 'inventoryoracle'>>
): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase.from('noticiero_history').update(patch).eq('id', id)
  if (error) {
    console.error('[noticiero/history] update error:', error)
    throw new Error(error.message)
  }
}
