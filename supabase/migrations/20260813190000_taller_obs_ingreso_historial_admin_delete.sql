-- Solo admin puede borrar filas del historial de observaciones de ingreso.

DROP POLICY IF EXISTS taller_obs_ingreso_historial_delete ON public.taller_observaciones_ingreso_historial;

CREATE POLICY taller_obs_ingreso_historial_delete
  ON public.taller_observaciones_ingreso_historial
  FOR DELETE TO authenticated
  USING (public.is_profile_admin());

GRANT DELETE ON public.taller_observaciones_ingreso_historial TO authenticated;
