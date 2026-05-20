import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { RBAC_MODULE_DEFINITIONS, RBAC_SUBMODULE_DEFINITIONS } from './rbacCatalog'

export type SyncRbacCatalogResult = {
  modulesUpserted: number
  submodulesUpserted: number
  adminPermissionsEnsured: number
}

/**
 * Sincroniza módulos y submódulos del catálogo de código → tablas Supabase.
 * Los submódulos nuevos aparecen en /admin/permisos sin migración SQL manual.
 */
export async function syncRbacCatalogToSupabase(
  supabase: SupabaseClient<Database>
): Promise<SyncRbacCatalogResult> {
  let modulesUpserted = 0
  let submodulesUpserted = 0
  let adminPermissionsEnsured = 0

  for (const mod of RBAC_MODULE_DEFINITIONS) {
    const { error } = await supabase.from('modules').upsert(
      { name: mod.name, slug: mod.slug, sort_order: mod.sortOrder },
      { onConflict: 'slug' }
    )
    if (error) throw new Error(`modules[${mod.slug}]: ${error.message}`)
    modulesUpserted++
  }

  const { data: modules, error: modulesErr } = await supabase.from('modules').select('id, slug')
  if (modulesErr || !modules?.length) {
    throw new Error(modulesErr?.message ?? 'No se pudieron leer módulos')
  }

  const moduleIdBySlug = new Map(modules.map((m) => [m.slug, m.id]))

  for (const sub of RBAC_SUBMODULE_DEFINITIONS) {
    const module_id = moduleIdBySlug.get(sub.moduleSlug)
    if (!module_id) {
      throw new Error(`Módulo no encontrado: ${sub.moduleSlug}`)
    }

    const { error } = await supabase.from('submodules').upsert(
      {
        module_id,
        name: sub.name,
        slug: sub.slug,
        sort_order: sub.sortOrder,
      },
      { onConflict: 'module_id,slug' }
    )
    if (error) throw new Error(`submodules[${sub.slug}]: ${error.message}`)
    submodulesUpserted++
  }

  const { data: adminRole, error: roleErr } = await supabase
    .from('roles')
    .select('id')
    .eq('slug', 'admin-sistema')
    .maybeSingle()

  if (roleErr) throw new Error(roleErr.message)

  if (adminRole?.id) {
    const { data: allSubs, error: subsErr } = await supabase.from('submodules').select('id')
    if (subsErr) throw new Error(subsErr.message)

    for (const sub of allSubs ?? []) {
      const { error } = await supabase.from('role_permissions').upsert(
        {
          role_id: adminRole.id,
          submodule_id: sub.id,
          can_read: true,
          can_write: true,
          can_delete: true,
        },
        { onConflict: 'role_id,submodule_id' }
      )
      if (error) throw new Error(`role_permissions: ${error.message}`)
      adminPermissionsEnsured++
    }
  }

  return { modulesUpserted, submodulesUpserted, adminPermissionsEnsured }
}
