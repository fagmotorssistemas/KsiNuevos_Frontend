'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  CheckCircle2,
  Plus,
  UserCircle2,
  FolderOpen,
  ToggleRight,
  RefreshCw,
  Search,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { ADMIN_FIXED_ACCESS_LINES } from '@/lib/permissions'
import { BASE_ROLE_LABELS, BASE_ROLE_STYLES, MODULE_ICONS } from './constants'

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
  active_permissions?: number
  user_count?: number
}

type UserRow = {
  id: string
  full_name: string | null
  email?: string | null
  phone?: string | null
  role: string | null
  status: string | null
  catalog_roles: { id: string; slug: string; name: string; base_role: string }[]
}

type DashboardStats = {
  departments: number
  roles: number
  modules: number
  active_permissions: number
  staff_users: number
}

const BASE_ROLE_OPTIONS = ['vendedor', 'marketing', 'finanzas', 'contable', 'abogado', 'taller'] as const

function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function PermisosAdminPanel() {
  const router = useRouter()
  const { profile, isLoading: authLoading } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [modules, setModules] = useState<ModuleRow[]>([])
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userPermBySubmodule, setUserPermBySubmodule] = useState<Map<string, boolean>>(new Map())
  const [loadingUserPerms, setLoadingUserPerms] = useState(false)
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newBaseRole, setNewBaseRole] = useState<string>('contable')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (profile?.role !== 'admin') router.replace('/home')
  }, [authLoading, profile?.role, router])

  const loadClientFallback = useCallback(async () => {
    try {
      const { data: profiles, error: uErr } = await supabase
        .from('profiles')
        .select('id, full_name, phone, role, status')
        .neq('role', 'cliente')
        .order('full_name')
      if (!uErr && profiles?.length) {
        setUsers(
          profiles.map((p) => ({
            ...p,
            catalog_roles: [],
          }))
        )
        setStats((s) => ({
          departments: s?.departments ?? 0,
          roles: s?.roles ?? 0,
          modules: s?.modules ?? 0,
          active_permissions: s?.active_permissions ?? 0,
          staff_users: profiles.length,
        }))
        setSelectedUserId(profiles[0]?.id ?? null)
      }
    } catch {
      /* ignore */
    }
  }, [supabase])

  const syncCatalogFromCode = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/rbac/sync-catalog', {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.warn('[permisos] sync-catalog', json.error ?? res.status)
        return false
      }
      return true
    } catch (e) {
      console.warn('[permisos] sync-catalog', e)
      return false
    }
  }, [])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      await syncCatalogFromCode()
      const res = await fetch('/api/admin/rbac', { credentials: 'include' })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error ?? json.hint ?? 'Error al cargar')
      }

      const mods = (json.modules ?? []) as ModuleRow[]
      const rls = (json.roles ?? []) as RoleRow[]
      const us = (json.users ?? []) as UserRow[]

      setModules(mods)
      setRoles(rls)
      setUsers(us)
      setStats(json.stats as DashboardStats ?? null)
      setSelectedUserId((prev) => {
        if (prev && us.some((u) => u.id === prev)) return prev
        return us[0]?.id ?? null
      })

      if (json.profilesError) {
        toast.error(`Usuarios (profiles): ${json.profilesError}`)
      }

      if (us.length === 0) {
        toast.error(json.error ?? 'No se pudieron cargar usuarios del equipo.')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo cargar'
      toast.error(msg)
      await loadClientFallback()
    } finally {
      setLoading(false)
    }
  }, [loadClientFallback, syncCatalogFromCode])

  useEffect(() => {
    if (profile?.role !== 'admin') return
    void loadDashboard()
  }, [profile?.role, loadDashboard])

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        (u.full_name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.phone ?? '').toLowerCase().includes(q) ||
        (u.role ?? '').toLowerCase().includes(q) ||
        u.catalog_roles.some((cr) => cr.name.toLowerCase().includes(q))
    )
  }, [users, userSearch])

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  )

  const loadUserPerms = useCallback(
    async (user: UserRow) => {
      setLoadingUserPerms(true)
      try {
        if (user.role === 'admin') {
          const all = new Map<string, boolean>()
          for (const mod of modules) {
            for (const s of mod.submodules) all.set(s.id, true)
          }
          setUserPermBySubmodule(all)
          return
        }
        const m = new Map<string, boolean>()
        for (const mod of modules) {
          for (const s of mod.submodules) m.set(s.id, false)
        }

        let { data: profileData, error: profileErr } = await supabase
          .from('profile_permissions')
          .select('submodule_id, can_read')
          .eq('profile_id', user.id)
        if (profileErr) throw profileErr

        if ((profileData?.length ?? 0) === 0 && user.catalog_roles[0]) {
          const { error: seedErr } = await supabase.rpc('seed_profile_permissions_from_role', {
            p_profile_id: user.id,
            p_role_id: user.catalog_roles[0].id,
          })
          if (!seedErr) {
            const refetch = await supabase
              .from('profile_permissions')
              .select('submodule_id, can_read')
              .eq('profile_id', user.id)
            profileData = refetch.data
          }
        }

        for (const row of profileData ?? []) {
          if (row.can_read) m.set(row.submodule_id, true)
        }

        setUserPermBySubmodule(m)
      } catch (e) {
        console.error(e)
        toast.error('No se pudieron cargar los accesos del usuario')
        setUserPermBySubmodule(new Map())
      } finally {
        setLoadingUserPerms(false)
      }
    },
    [supabase, modules]
  )

  useEffect(() => {
    if (selectedUserId && filteredUsers.some((u) => u.id === selectedUserId)) return
    setSelectedUserId(filteredUsers[0]?.id ?? null)
  }, [filteredUsers, selectedUserId])

  useEffect(() => {
    if (!selectedUser) {
      setUserPermBySubmodule(new Map())
      return
    }
    void loadUserPerms(selectedUser)
  }, [selectedUser, loadUserPerms])

  const upsertUserPerm = useCallback(
    async (submoduleId: string, access: boolean) => {
      if (!selectedUser || selectedUser.role === 'admin') return
      const key = `${selectedUser.id}:${submoduleId}`
      setSavingKey(key)
      setUserPermBySubmodule((m) => new Map(m).set(submoduleId, access))
      try {
        const { error } = await supabase.from('profile_permissions').upsert(
          {
            profile_id: selectedUser.id,
            submodule_id: submoduleId,
            can_read: access,
            can_write: access,
            can_delete: access,
          },
          { onConflict: 'profile_id,submodule_id' }
        )
        if (error) throw error
      } catch (e) {
        console.error(e)
        toast.error('Error al guardar acceso del usuario')
        void loadUserPerms(selectedUser)
      } finally {
        setSavingKey(null)
      }
    },
    [supabase, selectedUser, loadUserPerms]
  )

  const toggleUserModuleAccess = async (mod: ModuleRow, enable: boolean) => {
    if (!selectedUser || selectedUser?.role === 'admin') return
    for (const s of mod.submodules) {
      const current = userPermBySubmodule.get(s.id) ?? false
      if (current !== enable) await upsertUserPerm(s.id, enable)
    }
  }

  const assignUserRole = async (profileId: string, roleId: string) => {
    setAssigningUserId(profileId)
    try {
      const res = await fetch('/api/admin/rbac/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ profileId, roleId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')
      toast.success('Permisos actualizados para este usuario')
      await loadDashboard()
      setSelectedUserId(profileId)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo asignar')
    } finally {
      setAssigningUserId(null)
    }
  }

  const createRole = async () => {
    const name = newRoleName.trim()
    if (!name) {
      toast.error('Indica un nombre de perfil')
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
      setShowCreate(false)
      setNewRoleName('')
      await loadDashboard()
      if (data?.id && selectedUserId) {
        await assignUserRole(selectedUserId, data.id)
      } else {
        toast.success('Perfil creado. Asígnalo a un usuario en la lista.')
      }
    } catch (e) {
      console.error(e)
      toast.error('No se pudo crear el perfil')
    } finally {
      setCreating(false)
    }
  }

  if (authLoading || profile?.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-slate-500">
        Cargando…
      </div>
    )
  }

  const staffCount = stats?.staff_users ?? users.length

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-100 via-stone-50 to-white">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
              Administración
            </p>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Usuarios y accesos</h1>
            <p className="text-slate-600 mt-2 max-w-2xl">
              Cada usuario tiene sus propios accesos en la base de datos. El perfil de permisos solo
              copia una plantilla al asignarlo; después, activar o quitar módulos afecta únicamente a
              esa persona.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void loadDashboard()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            <Button type="button" variant="primary" onClick={() => setShowCreate((v) => !v)}>
              <Plus className="h-4 w-4 mr-2" />
              {showCreate ? 'Cerrar' : 'Nuevo perfil de permisos'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Usuarios del equipo', value: staffCount, icon: Users },
            { label: 'Módulos en catálogo', value: stats?.modules ?? '—', icon: FolderOpen },
            { label: 'Accesos activos (total)', value: stats?.active_permissions ?? '—', icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-stone-200/80 bg-white/90 backdrop-blur px-5 py-4 shadow-sm"
            >
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <Icon className="h-4 w-4" />
                {label}
              </div>
              <p className="text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {showCreate && (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-sm font-medium text-slate-700">Nombre del perfil</label>
              <input
                className="mt-1 w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Ej. Contador regional"
              />
            </div>
            <div className="w-full md:w-52">
              <label className="text-sm font-medium text-slate-700">Departamento base</label>
              <select
                className="mt-1 w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm"
                value={newBaseRole}
                onChange={(e) => setNewBaseRole(e.target.value)}
              >
                {BASE_ROLE_OPTIONS.map((br) => (
                  <option key={br} value={br}>
                    {BASE_ROLE_LABELS[br] ?? br}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" variant="primary" disabled={creating} onClick={() => void createRole()}>
              {creating ? 'Creando…' : 'Crear y asignar al usuario seleccionado'}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-4 rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-12rem)]">
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/80 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Equipo ({staffCount})
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  placeholder="Buscar nombre o email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 pl-9 pr-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {loading ? (
                <p className="text-sm text-slate-500 px-2 py-4">Cargando usuarios…</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-sm text-slate-500 px-2 py-4">No hay usuarios staff.</p>
              ) : (
                filteredUsers.map((u) => {
                  const catalog = u.catalog_roles[0]
                  const st =
                    BASE_ROLE_STYLES[catalog?.base_role ?? u.role ?? ''] ?? BASE_ROLE_STYLES.admin
                  const sel = selectedUserId === u.id
                  const accessCount =
                    selectedUserId === u.id
                      ? [...userPermBySubmodule.values()].filter(Boolean).length
                      : '—'
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUserId(u.id)}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                        sel
                          ? `bg-white ring-2 ${st.ring} shadow-md`
                          : 'hover:bg-stone-50 border border-transparent'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${st.badge}`}
                      >
                        <UserCircle2 className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-900 text-sm truncate">
                          {u.full_name ?? 'Sin nombre'}
                        </span>
                        <span className="block text-xs text-slate-500 truncate">
                          {catalog?.name ?? u.role ?? 'Sin perfil'}
                          {typeof accessCount === 'number' ? ` · ${accessCount} módulos` : ''}
                        </span>
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          <section className="lg:col-span-8 rounded-2xl border border-stone-200 bg-white shadow-sm flex flex-col min-h-[480px] max-h-[calc(100vh-12rem)]">
            {!selectedUser ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm p-8">
                Selecciona un usuario de la lista.
              </div>
            ) : (
              <>
                <div className="px-6 py-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {selectedUser.full_name ?? 'Sin nombre'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {selectedUser.email ?? selectedUser.phone ?? selectedUser.id}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          (BASE_ROLE_STYLES[selectedUser.role ?? ''] ?? BASE_ROLE_STYLES.admin).badge
                        }`}
                      >
                        Cuenta: {BASE_ROLE_LABELS[selectedUser.role ?? ''] ?? selectedUser.role ?? '—'}
                      </span>
                      {selectedUser.catalog_roles[0] && (
                        <span className="text-xs text-slate-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                          Perfil: {selectedUser.catalog_roles[0].name}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedUser.role !== 'admin' && (
                    <div className="shrink-0">
                      <label className="text-xs font-medium text-slate-500 block mb-1">
                        Perfil de permisos
                      </label>
                      <select
                        className="rounded-lg border border-stone-200 px-3 py-2 text-sm min-w-[220px]"
                        value={selectedUser.catalog_roles[0]?.id ?? ''}
                        disabled={assigningUserId === selectedUser.id}
                        onChange={(e) => {
                          const roleId = e.target.value
                          if (roleId) void assignUserRole(selectedUser.id, roleId)
                        }}
                      >
                        <option value="">— Elegir perfil —</option>
                        {roles
                          .filter((r) => r.base_role !== 'admin')
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {selectedUser.role === 'admin' ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-6">
                      <p className="font-semibold text-emerald-950 mb-2">Acceso completo (administrador)</p>
                      <ul className="list-disc list-inside text-sm text-emerald-900 space-y-1">
                        {ADMIN_FIXED_ACCESS_LINES.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  ) : selectedUser.catalog_roles.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-6 text-sm text-amber-950">
                      Asigna un <strong>perfil de permisos</strong> arriba. Después podrás activar los
                      módulos que verá en la app.
                    </div>
                  ) : loadingUserPerms ? (
                    <p className="text-sm text-slate-500">Cargando módulos…</p>
                  ) : (
                    <>
                      <p className="text-sm text-slate-600 rounded-lg bg-slate-50 border border-stone-200 px-4 py-3">
                        Accesos guardados en <strong>este usuario</strong> únicamente. Cambiar el
                        perfil arriba vuelve a copiar la plantilla{' '}
                        {selectedUser.catalog_roles[0]?.name ? `(${selectedUser.catalog_roles[0].name})` : ''}{' '}
                        y reemplaza los toggles actuales.
                      </p>
                      {modules.map((mod) => {
                      const subs = mod.submodules
                      const activeCount = subs.filter((s) => userPermBySubmodule.get(s.id)).length
                      const allOn = subs.length > 0 && activeCount === subs.length
                      const icon = MODULE_ICONS[mod.slug] ?? '📁'
                      return (
                        <div
                          key={mod.id}
                          className="rounded-xl border border-stone-200 overflow-hidden"
                        >
                          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-stone-50 border-b border-stone-100">
                            <div className="flex items-center gap-2">
                              <span className="text-lg" aria-hidden>
                                {icon}
                              </span>
                              <span className="font-semibold text-slate-900">{mod.name}</span>
                              <span className="text-xs text-slate-500">
                                {activeCount}/{subs.length}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => void toggleUserModuleAccess(mod, !allOn)}
                              className="text-xs font-medium text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
                            >
                              {allOn ? 'Quitar todo' : 'Activar todo'}
                            </button>
                          </div>
                          <ul className="divide-y divide-stone-100">
                            {subs.map((s) => {
                              const on = userPermBySubmodule.get(s.id) ?? false
                              const busy = savingKey === `${selectedUser.id}:${s.id}`
                              return (
                                <li
                                  key={s.id}
                                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-stone-50/50"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">{s.name}</p>
                                    <p className="text-xs text-slate-400">{s.slug}</p>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void upsertUserPerm(s.id, !on)}
                                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                      on
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-stone-100 text-stone-500'
                                    }`}
                                    aria-pressed={on}
                                  >
                                    <ToggleRight
                                      className={`h-5 w-5 ${on ? 'text-emerald-600' : 'text-stone-400'}`}
                                    />
                                    {on ? 'Activo' : 'Inactivo'}
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )
                    })}
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
