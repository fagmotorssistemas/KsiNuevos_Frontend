-- Aplazamiento del modal "EL CLIENTE SOLICITA LLAMADA" (máximo 2 veces).

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS llamada_posponer_hasta timestamptz,
  ADD COLUMN IF NOT EXISTS llamada_posponer_razon text,
  ADD COLUMN IF NOT EXISTS llamada_posponer_veces integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.leads.quiere_llamada IS 'El cliente solicitó que lo llamen.';
COMMENT ON COLUMN public.leads.llamada_posponer_hasta IS 'Hasta cuándo se aplazó el modal de solicitud de llamada.';
COMMENT ON COLUMN public.leads.llamada_posponer_razon IS 'Motivo por el que no se llama ahora.';
COMMENT ON COLUMN public.leads.llamada_posponer_veces IS 'Cuántas veces se aplazó (máximo 2).';

CREATE INDEX IF NOT EXISTS leads_quiere_llamada_pending_idx
  ON public.leads (assigned_to, llamada_posponer_hasta)
  WHERE quiere_llamada IS TRUE;
