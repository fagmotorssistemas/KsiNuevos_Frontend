-- Restaurar accesos del rol finanzas-estandar (p. ej. si quedaron todos en false desde el panel)

UPDATE public.role_permissions rp
SET can_read = true, can_write = true, can_delete = true
FROM public.roles r
WHERE rp.role_id = r.id
  AND r.slug = 'finanzas-estandar'
  AND rp.can_read = false;
