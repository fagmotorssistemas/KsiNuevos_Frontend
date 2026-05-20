-- Completa submódulos del módulo Admin (plantillas, monitoreo, auditoría, etc.)
-- y asegura que el rol admin-sistema tenga R/W/D sobre todo el catálogo (incluidos los nuevos).

INSERT INTO public.submodules (module_id, name, slug, sort_order)
SELECT m.id, v.name, v.slug, v.ord
FROM public.modules m
JOIN (VALUES
  ('admin', 'Gestión de usuarios', 'gestion-usuarios', 1),
  ('admin', 'Agentes / prompts IA', 'agentes-prompts-ia', 2),
  ('admin', 'Configuración', 'configuracion', 3),
  ('admin', 'Permisos y roles', 'permisos-roles', 4),
  ('admin', 'Plantillas de documentos', 'plantillas-documentos', 5),
  ('admin', 'Monitoreo y reportes (panel)', 'monitoreo-reportes', 6),
  ('admin', 'Auditoría módulos Taller / Seguros', 'auditoria-modulos', 7),
  ('admin', 'Incidentes y soporte', 'incidentes-soporte', 8),
  ('admin', 'Copias de seguridad / exportación', 'backup-exportacion', 9),
  ('admin', 'API y webhooks', 'api-webhooks', 10)
) AS v(ms, name, slug, ord) ON m.slug = v.ms
ON CONFLICT (module_id, slug) DO NOTHING;

INSERT INTO public.role_permissions (role_id, submodule_id, can_read, can_write, can_delete)
SELECT r.id, s.id, true, true, true
FROM public.roles r
CROSS JOIN public.submodules s
WHERE r.slug = 'admin-sistema'
ON CONFLICT (role_id, submodule_id) DO UPDATE SET
  can_read = EXCLUDED.can_read,
  can_write = EXCLUDED.can_write,
  can_delete = EXCLUDED.can_delete;
