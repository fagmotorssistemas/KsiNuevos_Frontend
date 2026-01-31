'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from "next/cache"
import type { Database } from "@/types/supabase"
import { assignmentEngine } from "@/services/assignmentEngine"; // Importamos el motor corregido

export type SellRequestData = {
  brand: string;
  model: string;
  year: number;
  mileage: number;
  transmission: string;
  color: string;
  plate_first_letter: string;
  plate_last_digit: string;
  description: string;
  has_crashes: boolean;
  papers_ok: boolean;
  unique_owner: boolean;
  state_rating: number;
  client_asking_price: number;
  photos_urls?: string[]; 
  appointmentDate: string; 
}

export async function createSellRequest(data: SellRequestData) {
  const cookieStore = await cookies()
  
  // Cliente de servidor compatible con Server Actions
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) return { error: "Debes iniciar sesión." }

  // 1. Insertar la solicitud de venta
  const { data: newRequest, error: sellError } = await supabase
    .from('web_sell_requests')
    .insert({
      user_id: user.id,
      brand: data.brand,
      model: data.model,
      year: data.year,
      mileage: data.mileage,
      transmission: data.transmission,
      color: data.color,
      plate_first_letter: data.plate_first_letter,
      plate_last_digit: data.plate_last_digit,
      description: data.description,
      has_crashes: data.has_crashes,
      papers_ok: data.papers_ok,
      unique_owner: data.unique_owner,
      state_rating: data.state_rating,
      client_asking_price: data.client_asking_price,
      photos_urls: data.photos_urls || [], 
      status: 'pendiente'
    })
    .select()
    .single()

  if (sellError) {
    console.error("Error solicitud:", sellError.message)
    return { error: `Error al guardar: ${sellError.message}` }
  }

  // 2. Si hay fecha, crear la cita usando el motor de asignación
  if (data.appointmentDate) {
      // INYECCIÓN DE DEPENDENCIA: Pasamos el cliente 'supabase' al motor
      const sellerId = await assignmentEngine.determineResponsible(supabase, user.id);

      const { error: apptError } = await supabase
        .from('web_appointments')
        .insert({
            client_user_id: user.id,
            type: 'venta',
            status: 'pendiente',
            appointment_date: data.appointmentDate,
            sell_request_id: newRequest.id,
            responsible_id: sellerId, // Asignación consistente
            notes: `Inspección: ${data.brand} ${data.model} (Placa ${data.plate_first_letter}-${data.plate_last_digit})`
        })
      
      if (apptError) console.error("Error cita:", apptError.message)
  }

  revalidatePath('/perfil');
  return { success: true, requestId: newRequest.id }
}