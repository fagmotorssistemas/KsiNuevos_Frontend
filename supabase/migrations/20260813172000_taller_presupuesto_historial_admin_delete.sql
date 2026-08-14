-- Solo admin puede borrar filas del historial de presupuesto de taller.

DROP POLICY IF EXISTS taller_presupuesto_historial_delete ON public.taller_presupuesto_historial;

CREATE POLICY taller_presupuesto_historial_delete
  ON public.taller_presupuesto_historial
  FOR DELETE TO authenticated
  USING (public.is_profile_admin());

GRANT DELETE ON public.taller_presupuesto_historial TO authenticated;
