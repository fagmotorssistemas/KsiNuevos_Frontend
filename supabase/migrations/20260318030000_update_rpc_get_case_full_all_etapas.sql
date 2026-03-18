-- Update rpc_get_case_full to return all etapas relevant to the case's events
create or replace function public.rpc_get_case_full(p_case_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'case', (select to_jsonb(c) from public.cases c where c.id = p_case_id),
    'events', (select coalesce(jsonb_agg(to_jsonb(e) order by e.fecha desc), '[]'::jsonb)
               from public.case_events e where e.case_id = p_case_id),
    'tasks_pending', (select coalesce(jsonb_agg(to_jsonb(t) order by t.fecha_limite asc), '[]'::jsonb)
                      from public.case_tasks t
                      where t.case_id = p_case_id and t.estado in ('pendiente','vencido')),
    'status_history', (select coalesce(jsonb_agg(to_jsonb(h) order by h.fecha desc), '[]'::jsonb)
                       from public.case_status_history h where h.case_id = p_case_id),
    'etapas', (select coalesce(jsonb_agg(to_jsonb(p) order by p.tipo_proceso, p.orden asc), '[]'::jsonb)
               from public.proceso_etapas p 
               where p.id in (select etapa_id from public.case_events where case_id = p_case_id)
                  or p.tipo_proceso = (select tipo_proceso from public.cases where id = p_case_id))
  );
$$;
