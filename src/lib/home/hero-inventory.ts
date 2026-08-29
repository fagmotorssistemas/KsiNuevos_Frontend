import { createServiceRoleClient } from '@/lib/supabase/server'

export type HeroInventorySlide = {
  id: string
  src: string
  alt: string
}

const HERO_CAR_LIMIT = 24

export async function fetchHeroInventorySlides(): Promise<HeroInventorySlide[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('inventoryoracle')
    .select('id, brand, model, year, img_main_url, status')
    .eq('status', 'disponible')
    .not('img_main_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) throw new Error(error.message)

  return (data ?? [])
    .filter((row) => Boolean(row.img_main_url?.trim()))
    .sort(() => Math.random() - 0.5)
    .slice(0, HERO_CAR_LIMIT)
    .map((row) => ({
      id: row.id,
      src: row.img_main_url!.trim(),
      alt: `${row.brand} ${row.model} ${row.year}`.trim(),
    }))
}
