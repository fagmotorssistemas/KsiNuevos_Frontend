-- RPCs intermedios sustituidos por fetch_leads_board_temperature_page (un solo viaje).
-- El front ya no los invoca; se eliminan para evitar sobrecargas confusas en PostgREST.

DROP FUNCTION IF EXISTS public.leads_board_temperature_snapshot(
  public.lead_temperature,
  date,
  int,
  int,
  uuid,
  text,
  boolean
);

DROP FUNCTION IF EXISTS public.paginated_lead_ids_for_temperature_filter(
  public.lead_temperature,
  date,
  int,
  int,
  uuid,
  text,
  boolean
);

DROP FUNCTION IF EXISTS public.count_responded_for_temperature_filter(
  public.lead_temperature,
  date,
  uuid,
  text,
  boolean
);

DROP FUNCTION IF EXISTS public.count_leads_for_temperature_filter(
  public.lead_temperature,
  date,
  uuid,
  text,
  boolean
);
