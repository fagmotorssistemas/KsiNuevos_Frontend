-- El historial duplicaba el resumen ejecutivo. El score solo cuenta leads contestados.

UPDATE public.sales_progress_weights
SET active = false
WHERE category = 'lead_interaction';
