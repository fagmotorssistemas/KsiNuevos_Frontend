import { createClient } from '@/lib/supabase/client';

/** Cliente con sesión del navegador (requerido para RLS por rol). */
export const supabase = createClient();
export const API_URL = process.env.NEXT_PUBLIC_API_URL!;
