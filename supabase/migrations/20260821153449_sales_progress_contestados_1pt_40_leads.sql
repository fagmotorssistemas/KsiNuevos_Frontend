-- Contestados: 40 leads al día × 1 pt (sigue siendo 40 pts de tope del día).

UPDATE public.sales_progress_weights
SET points = 1,
    daily_cap_points = 40,
    label = 'Leads contestados (resumen)'
WHERE category = 'lead_status_change';
