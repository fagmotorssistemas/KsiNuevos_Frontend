# Aplicar RBAC en Supabase (obligatorio para /admin/permisos)

## Diagnóstico

Si en **Permisos** no ves roles ni módulos, en el proyecto remoto **no existen** las tablas `modules`, `roles`, `submodules`, `profile_roles`, etc. Eso se confirma con error HTTP 404 en la API REST.

Los usuarios vienen de `profiles`; también necesitas la migración `20260520140000_admin_rbac_dashboard.sql` para que un admin pueda listar a todo el equipo.

## Opción A — CLI (recomendado)

```bash
npx supabase login
cd ruta/al/KsiNuevos_Frontend
npx supabase link --project-ref enfqumrstqefbxtwsslq
npx supabase db push
```

## Opción B — SQL Editor

1. [Supabase SQL Editor](https://supabase.com/dashboard/project/enfqumrstqefbxtwsslq/sql/new)
2. Ejecuta **en este orden** cada archivo de `supabase/migrations/`:
   - `20260514120000_rbac_modules_roles_permissions.sql`
   - `20260515100000_rbac_admin_submodules_complete.sql`
   - `20260520120000_rbac_access_on_off.sql`
   - `20260520130000_sync_profile_role_on_profile_update.sql`
   - `20260520140000_admin_rbac_dashboard.sql`

3. Recarga `/admin/permisos` y pulsa **Actualizar**.

## Comprobar

En SQL Editor:

```sql
SELECT count(*) FROM public.roles;
SELECT count(*) FROM public.modules;
SELECT count(*) FROM public.profile_roles;
```

Deberías ver ~10 roles, 8 módulos y una fila en `profile_roles` por cada usuario staff.

## Agregar una ruta nueva (aparece en Permisos)

1. Edita `src/lib/permissions/rbacCatalog.ts`.
2. En `RBAC_SUBMODULE_DEFINITIONS`, crea un submódulo nuevo o añade la ruta a uno existente:

```ts
{
  moduleSlug: 'ventas',
  slug: 'mi-nueva-pantalla',
  name: 'Mi nueva pantalla',
  sortOrder: 7,
  routePrefixes: ['/mi-ruta'],
},
```

3. Abre **Admin → Permisos** (o pulsa **Actualizar**): se ejecuta la sincronización con Supabase y el submódulo aparece en la matriz de permisos.
4. Asigna acceso al rol o usuario que corresponda.

El middleware usa los mismos `routePrefixes` vía `getProtectedRoutePrefixes()`; no hace falta duplicar rutas en `middleware.ts`.

Solo deben existir en el catálogo submódulos con pantalla o ruta real. Los que venían de la migración inicial como “admin futuro” (p. ej. `api-webhooks`, `backup-exportacion`) se eliminan al sincronizar si ya no están en `rbacCatalog.ts`.

**“Inactivo”** en el panel significa que el rol seleccionado no tiene ese submódulo activado (toggle apagado), no que falte la pantalla en el código.
