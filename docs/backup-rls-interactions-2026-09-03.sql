-- BACKUP de políticas RLS de interactions antes del cambio (2026-09-03)
-- Para revertir, ejecutar DROP de la nueva y CREATE de esta original.

-- 1) Política original (el problema: WITH CHECK es NULL)
CREATE POLICY "Acceso a Interacciones"
ON public.interactions
FOR ALL
TO public
USING (
  is_admin_or_marketing()
  OR EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = interactions.lead_id
      AND leads.assigned_to = auth.uid()
  )
);
-- Nota: WITH CHECK era NULL (no definido), lo cual impedía INSERT a vendedores.

-- 2) n8n_insert_interactions (sin cambios)
CREATE POLICY "n8n_insert_interactions"
ON public.interactions
FOR INSERT
TO service_role
WITH CHECK (true);

-- 3) n8n_select_interactions (sin cambios)
CREATE POLICY "n8n_select_interactions"
ON public.interactions
FOR SELECT
TO service_role
USING (true);

-- 4) n8n_update_interactions (sin cambios)
CREATE POLICY "n8n_update_interactions"
ON public.interactions
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Interacción eliminada (para referencia):
-- id=11941, lead_id=24336 (Raquel Patiño), type='llamada',
-- content='SE ENVIA AUDIO AL CLIENTE CON UBICACION Y CONTACTO.',
-- result='completado', responsible_id='e22b3999-1bae-4ffa-abb0-cdc299250eba' (Juan Diego/admin),
-- created_at='2026-09-03 15:05:25.747526+00'
