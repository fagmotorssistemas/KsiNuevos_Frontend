-- Nuevo estado de asesoría: resolvieron y el cliente no aplica a financiamiento.

ALTER TYPE public.estado_financiamiento ADD VALUE IF NOT EXISTS 'resuelto_no_aplica';
