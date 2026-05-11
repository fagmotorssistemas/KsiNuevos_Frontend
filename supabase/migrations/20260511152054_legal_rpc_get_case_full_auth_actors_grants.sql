-- Gestión legal: rpc_get_case_full con auth, mapa actors y permisos mínimos.
-- Alineado con migración aplicada en proyecto remoto (finanzas ya en is_legal_staff en BD).

CREATE OR REPLACE FUNCTION public.rpc_get_case_full(p_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_legal_staff() THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'case', (SELECT to_jsonb(c) FROM public.cases c WHERE c.id = p_case_id),
    'events', (SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.fecha DESC), '[]'::jsonb)
               FROM public.case_events e WHERE e.case_id = p_case_id),
    'tasks_pending', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.fecha_limite ASC), '[]'::jsonb)
                      FROM public.case_tasks t
                      WHERE t.case_id = p_case_id AND t.estado IN ('pendiente','vencido')),
    'status_history', (SELECT COALESCE(jsonb_agg(to_jsonb(h) ORDER BY h.fecha DESC), '[]'::jsonb)
                       FROM public.case_status_history h WHERE h.case_id = p_case_id),
    'etapas', (SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.tipo_proceso, p.orden ASC), '[]'::jsonb)
               FROM public.proceso_etapas p
               WHERE p.id IN (SELECT etapa_id FROM public.case_events WHERE case_id = p_case_id)
                  OR p.tipo_proceso = (SELECT tipo_proceso FROM public.cases WHERE id = p_case_id)),
    'actors', (
      SELECT COALESCE(
        jsonb_object_agg(prof.id::text, jsonb_build_object('full_name', prof.full_name, 'role', prof.role::text)),
        '{}'::jsonb
      )
      FROM public.profiles prof
      WHERE prof.id IN (
        SELECT DISTINCT usuario_id FROM public.case_events
        WHERE case_id = p_case_id AND usuario_id IS NOT NULL
        UNION
        SELECT DISTINCT usuario_id FROM public.case_status_history
        WHERE case_id = p_case_id AND usuario_id IS NOT NULL
      )
    )
  ) INTO result;

  RETURN result;
END;
$function$;

COMMENT ON FUNCTION public.rpc_get_case_full(uuid) IS
  'Expediente legal JSON: requiere is_legal_staff(); incluye actors (full_name, role) para bitácora.';

REVOKE ALL ON FUNCTION public.rpc_get_case_full(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_case_full(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_case_full(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_case_full(uuid) TO service_role;
