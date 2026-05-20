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
