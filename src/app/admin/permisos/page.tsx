'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { toast } from 'sonner'
import { ADMIN_FIXED_ACCESS_LINES } from '@/lib/permissions'

type SubmoduleRow = {
  id: string
  module_id: string
  name: string
  slug: string
  sort_order: number
}

type ModuleRow = {
  id: string
  name: string
  slug: string
  sort_order: number
  submodules: SubmoduleRow[]
}

type RoleRow = {
  id: string
  slug: string
  name: string
  base_role: string
  description: string | null
}

type PermRow = {
  submodule_id: string
  can_read: boolean
  can_write: boolean
  can_delete: boolean
}

const BASE_ROLE_OPTIONS = [
  'vendedor',
  'cliente',
  'marketing',
  'finanzas',
  'contable',
  'abogado',
  'taller',
] as const

function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function AdminPermisosPage() {
  const router = useRouter()
  const { profile, isLoading: authLoading } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [modules, setModules] = useState<ModuleRow[]>([])
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [permCounts, setPermCounts] = useState<Map<string, number>>(new Map())
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [permBySubmodule, setPermBySubmodule] = useState<Map<string, PermRow>>(new Map())
  const [loadingTree, setLoadingTree] = useState(true)
  const [loadingPerms, setLoadingPerms] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newBaseRole, setNewBaseRole] = useState<string>('contable')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (profile?.role !== 'admin') {
      router.replace('/home')
    }
  }, [authLoading, profile?.role, router])

  const loadTree = useCallback(async () => {
    setLoadingTree(true)
    try {
      const { data: modData, error: mErr } = await supabase
        .from('modules')
        .select('id, name, slug, sort_order, submodules(id, module_id, name, slug, sort_order)')
        .order('sort_order')

      if (mErr) throw mErr

      const normalized = (modData ?? []).map((m) => ({
        ...m,
        submodules: [...(m.submodules ?? [])].sort((a, b) => a.sort_order - b.sort_order),
      })) as ModuleRow[]

      setModules(normalized)

      const { data: roleData, error: rErr } = await supabase
        .from('roles')
        .select('id, slug, name, base_role, description')
        .order('base_role')
        .order('name')

      if (rErr) throw rErr
      setRoles((roleData ?? []) as RoleRow[])

      const { data: rpAll, error: pErr } = await supabase
        .from('role_permissions')
        .select('role_id, can_read, can_write, can_delete')

      if (pErr) throw pErr
      const counts = new Map<string, number>()
      for (const row of rpAll ?? []) {
        if (row.can_read || row.can_write || row.can_delete) {
          counts.set(row.role_id, (counts.get(row.role_id) ?? 0) + 1)
        }
      }
      setPermCounts(counts)

      setSelectedRoleId((prev) => prev ?? roleData?.[0]?.id ?? null)
    } catch (e) {
      console.error(e)
      toast.error('No se pudo cargar el árbol de permisos')
    } finally {
      setLoadingTree(false)
    }
  }, [supabase])

  useEffect(() => {
    if (profile?.role !== 'admin') return
    void loadTree()
  }, [profile?.role, loadTree])

  const loadRolePerms = useCallback(
    async (roleId: string) => {
      setLoadingPerms(true)
      try {
        const { data, error } = await supabase
          .from('role_permissions')
          .select('submodule_id, can_read, can_write, can_delete')
          .eq('role_id', roleId)

        if (error) throw error
        const m = new Map<string, PermRow>()
        for (const row of data ?? []) {
          m.set(row.submodule_id, {
            submodule_id: row.submodule_id,
            can_read: row.can_read,
            can_write: row.can_write,
            can_delete: row.can_delete,
          })
        }
        setPermBySubmodule(m)
      } catch (e) {
        console.error(e)
        toast.error('No se pudieron cargar los permisos del rol')
      } finally {
        setLoadingPerms(false)
      }
    },
    [supabase]
  )

  const rolesByBase = useMemo(() => {
    const g = new Map<string, RoleRow[]>()
    for (const r of roles) {
      const k = r.base_role
      if (!g.has(k)) g.set(k, [])
      g.get(k)!.push(r)
    }
    return g
  }, [roles])

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  )

  /** Rol de catálogo con base admin: permisos no se editan (acceso fijo en app). */
  const isImmutableAdminRole = selectedRole?.base_role === 'admin'

  useEffect(() => {
    if (!selectedRoleId || profile?.role !== 'admin') return
    if (isImmutableAdminRole) {
      setPermBySubmodule(new Map())
      setLoadingPerms(false)
      return
    }
    void loadRolePerms(selectedRoleId)
  }, [selectedRoleId, loadRolePerms, profile?.role, isImmutableAdminRole])

  const upsertPerm = useCallback(
    async (submoduleId: string, patch: Partial<Pick<PermRow, 'can_read' | 'can_write' | 'can_delete'>>) => {
      if (!selectedRoleId) return
      const roleRow = roles.find((x) => x.id === selectedRoleId)
      if (roleRow?.base_role === 'admin') return
      const key = `${selectedRoleId}:${submoduleId}`
      setSavingKey(key)
      const prev = permBySubmodule.get(submoduleId)
      const next: PermRow = {
        submodule_id: submoduleId,
        can_read: patch.can_read ?? prev?.can_read ?? false,
        can_write: patch.can_write ?? prev?.can_write ?? false,
        can_delete: patch.can_delete ?? prev?.can_delete ?? false,
      }
      setPermBySubmodule((m) => new Map(m).set(submoduleId, next))
      try {
        const { error } = await supabase.from('role_permissions').upsert(
          {
            role_id: selectedRoleId,
            submodule_id: submoduleId,
            can_read: next.can_read,
            can_write: next.can_write,
            can_delete: next.can_delete,
          },
          { onConflict: 'role_id,submodule_id' }
        )
        if (error) throw error
      } catch (e) {
        console.error(e)
        toast.error('Error al guardar permiso')
        void loadRolePerms(selectedRoleId)
      } finally {
        setSavingKey(null)
      }
    },
    [selectedRoleId, supabase, permBySubmodule, loadRolePerms, roles]
  )

  const createRole = async () => {
    const name = newRoleName.trim()
    if (!name) {
      toast.error('Indica un nombre de rol')
      return
    }
    let slug = slugify(name)
    if (!slug) slug = `rol-${Date.now()}`
    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('roles')
        .insert({ name, slug, base_role: newBaseRole, description: null })
        .select('id')
        .single()
      if (error) throw error
      toast.success('Rol creado')
      setShowCreate(false)
      setNewRoleName('')
      await loadTree()
      if (data?.id) setSelectedRoleId(data.id)
    } catch (e) {
      console.error(e)
      toast.error('No se pudo crear el rol (¿slug duplicado?)')
    } finally {
      setCreating(false)
    }
  }

  if (authLoading || profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        Cargando…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Permisos por rol</h1>
            <p className="text-slate-600 mt-1">
              Los roles con base distinta de <strong>admin</strong> se configuran aquí. El administrador del
              sistema tiene acceso fijo completo y no se edita con casillas.
            </p>
          </div>
          <Button type="button" variant="primary" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? 'Cerrar' : 'Nuevo rol'}
          </Button>
        </div>

        {showCreate && (
          <Card>
            <CardHeader>
              <CardTitle>Crear rol</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="text-sm font-medium text-slate-700">Nombre</label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Ej. Contador regional"
                />
              </div>
              <div className="w-full md:w-48">
                <label className="text-sm font-medium text-slate-700">Rol base (enum)</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={newBaseRole}
                  onChange={(e) => setNewBaseRole(e.target.value)}
                >
                  {BASE_ROLE_OPTIONS.map((br) => (
                    <option key={br} value={br}>
                      {br}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="button" variant="primary" disabled={creating} onClick={() => void createRole()}>
                {creating ? 'Creando…' : 'Crear'}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Roles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
              {loadingTree ? (
                <p className="text-sm text-slate-500">Cargando…</p>
              ) : (
                [...rolesByBase.entries()].map(([base, list]) => (
                  <div key={base}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{base}</p>
                    <ul className="space-y-1">
                      {list.map((r) => {
                        const active = permCounts.get(r.id) ?? 0
                        const sel = selectedRoleId === r.id
                        const adminBase = r.base_role === 'admin'
                        return (
                          <li key={r.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedRoleId(r.id)}
                              className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                                sel ? 'bg-red-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                              }`}
                            >
                              <span className="font-medium">{r.name}</span>
                              <span className={`block text-xs mt-0.5 ${sel ? 'text-red-100' : 'text-slate-500'}`}>
                                {adminBase
                                  ? 'Acceso total fijo · no editable'
                                  : `${active} permisos activos · ${r.slug}`}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-8">
            <CardHeader>
              <CardTitle>
                {isImmutableAdminRole ? 'Rol administrador (acceso fijo)' : 'Matriz de permisos'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedRoleId ? (
                <p className="text-sm text-slate-500">Selecciona un rol.</p>
              ) : isImmutableAdminRole ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-6 text-emerald-950">
                  <p className="font-semibold text-lg mb-2">Acceso completo, sin casillas</p>
                  <p className="text-sm text-emerald-900/90 mb-4">
                    Los usuarios con <strong>rol enum admin</strong> en el perfil entran a todas las rutas de la
                    empresa. No hace falta marcar permisos en base de datos para ellos: la app lo trata como fijo.
                    Aquí solo configuras los demás roles (contable, vendedor, etc.).
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 mb-2">
                    Incluye, entre otras
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-sm text-emerald-900">
                    {ADMIN_FIXED_ACCESS_LINES.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : loadingPerms ? (
                <p className="text-sm text-slate-500">Cargando permisos…</p>
              ) : (
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                  {modules.map((mod) => (
                    <div key={mod.id}>
                      <h3 className="text-sm font-semibold text-slate-800 mb-2">{mod.name}</h3>
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-100 text-slate-600">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium">Submódulo</th>
                              <th className="text-center px-2 py-2 font-medium w-20">Leer</th>
                              <th className="text-center px-2 py-2 font-medium w-20">Escribir</th>
                              <th className="text-center px-2 py-2 font-medium w-20">Eliminar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mod.submodules.map((s) => {
                              const p = permBySubmodule.get(s.id)
                              const r = p?.can_read ?? false
                              const w = p?.can_write ?? false
                              const d = p?.can_delete ?? false
                              const busy = savingKey === `${selectedRoleId}:${s.id}`
                              return (
                                <tr key={s.id} className="border-t border-slate-100">
                                  <td className="px-3 py-2">
                                    <div className="font-medium text-slate-900">{s.name}</div>
                                    <div className="text-xs text-slate-500">{s.slug}</div>
                                  </td>
                                  {(['can_read', 'can_write', 'can_delete'] as const).map((col) => (
                                    <td key={col} className="text-center px-2 py-2">
                                      <input
                                        type="checkbox"
                                        disabled={busy}
                                        checked={col === 'can_read' ? r : col === 'can_write' ? w : d}
                                        onChange={(e) =>
                                          void upsertPerm(s.id, {
                                            can_read: col === 'can_read' ? e.target.checked : r,
                                            can_write: col === 'can_write' ? e.target.checked : w,
                                            can_delete: col === 'can_delete' ? e.target.checked : d,
                                          })
                                        }
                                        className="h-4 w-4 rounded border-slate-300"
                                      />
                                    </td>
                                  ))}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
