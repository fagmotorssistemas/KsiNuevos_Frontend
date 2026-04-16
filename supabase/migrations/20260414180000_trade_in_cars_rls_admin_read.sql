-- trade_in_cars: admin ve todos los trade-ins; vendedor solo los de sus leads asignados.
-- Ya aplicado en producción (KsiNuevos_Web) vía MCP; mantener migraciones alineadas.

DROP POLICY IF EXISTS "Ver trade-ins de mis leads" ON public.trade_in_cars;

CREATE POLICY "Ver trade-ins de mis leads"
ON public.trade_in_cars
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'::public.user_role_enum
  )
  OR EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.id = trade_in_cars.lead_id
      AND l.assigned_to = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'::public.user_role_enum
  )
  OR EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.id = trade_in_cars.lead_id
      AND l.assigned_to = auth.uid()
  )
);
