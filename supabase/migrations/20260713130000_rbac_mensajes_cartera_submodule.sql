-- Submódulo Mensajes de cartera en Finanzas (catálogo RBAC)

INSERT INTO public.submodules (module_id, name, slug, sort_order)
SELECT m.id, 'Mensajes de cartera', 'mensajes-cartera', 3
FROM public.modules m
WHERE m.slug = 'finanzas'
ON CONFLICT (module_id, slug) DO UPDATE
SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

UPDATE public.submodules s
SET sort_order = v.sort_order
FROM (VALUES
  ('cartera-clientes', 1),
  ('cartera-manual', 2),
  ('mensajes-cartera', 3),
  ('cuotas-pb', 4),
  ('contratos-pb', 5),
  ('asesoria-financiamiento', 6),
  ('notas-de-ventas', 7),
  ('dashboard-finanzas', 8),
  ('empleados-finanzas', 9),
  ('tesoreria', 10),
  ('reporte-ventas', 11),
  ('movimientos-financiamiento', 12),
  ('cobros', 13),
  ('pagos', 14),
  ('inventario-finanzas', 15),
  ('comprobantes', 16),
  ('billing-finanzas', 17),
  ('seguros-cartera', 18)
) AS v(slug, sort_order)
JOIN public.modules m ON m.slug = 'finanzas'
WHERE s.module_id = m.id AND s.slug = v.slug;

INSERT INTO public.role_permissions (role_id, submodule_id, can_read, can_write, can_delete)
SELECT r.id, s.id, true, true, true
FROM public.roles r
CROSS JOIN public.submodules s
JOIN public.modules m ON m.id = s.module_id AND m.slug = 'finanzas'
WHERE s.slug = 'mensajes-cartera'
  AND r.slug IN ('admin-sistema', 'finanzas-estandar', 'contable-estandar')
ON CONFLICT (role_id, submodule_id) DO UPDATE
SET can_read = true, can_write = true, can_delete = true;
