'use server'

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers"; 

export async function createBuyingAppointment(formData: FormData) {
  // 1. Configuración usando tus variables de entorno
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // 2. Cliente manual (Sin persistencia automática)
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    }
  });

  // 3. BUSCANDO LA COOKIE
  const cookieStore = await cookies(); 
  
  // A. Extraemos ID del proyecto de la URL para armar el nombre de la cookie
  let projectId = '';
  try {
    const urlParts = supabaseUrl.split('//')[1].split('.');
    projectId = urlParts[0]; 
  } catch (e) {
    console.log("No se pudo extraer el Project ID");
  }

  const standardCookieName = `sb-${projectId}-auth-token`;
  let authCookie = cookieStore.get(standardCookieName);

  // Fallback: Buscar cualquier cookie de supabase si falla la estándar
  if (!authCookie) {
    const allCookies = cookieStore.getAll();
    authCookie = allCookies.find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
  }

  // 4. INYECTAR SESIÓN (CON CORRECCIÓN DE BASE64)
  if (authCookie) {
      try {
        let cookieValue = authCookie.value;

        // --- SOLUCIÓN AL ERROR "SyntaxError: Unexpected token 'b'" ---
        // Supabase ahora guarda las cookies con el prefijo "base64-". 
        // Debemos limpiarlo antes de convertir a JSON.
        
        if (cookieValue.startsWith('base64-')) {
            // Quitamos el prefijo "base64-" y decodificamos
            const rawBase64 = cookieValue.slice(7);
            cookieValue = Buffer.from(rawBase64, 'base64').toString('utf-8');
        } 
        else if (cookieValue.includes('%')) {
            // Soporte para formato antiguo URL-encoded
            cookieValue = decodeURIComponent(cookieValue);
        }

        const sessionData = JSON.parse(cookieValue);
        
        // Pasamos los tokens al cliente manual
        const { error } = await supabase.auth.setSession({
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token
        });
        
        if (error) console.log("Advertencia setSession:", error.message);
        
      } catch (e) {
        console.log("❌ Error crítico al leer cookie:", e);
      }
  } else {
    console.log("⚠️ No se encontró cookie de sesión en el navegador.");
  }

  // 5. VERIFICAR USUARIO
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (!user || userError) {
    console.error("Fallo getUser():", userError?.message || "Usuario nulo");
    return { error: "No pudimos validar tu sesión. Por favor recarga la página." }
  }

  // 6. PROCESAR DATOS
  const inventoryId = formData.get('inventoryId') as string;
  const dateStr = formData.get('date') as string;
  const notes = formData.get('notes') as string;

  if (!inventoryId || !dateStr) {
      return { error: "Faltan datos de la cita." };
  }

  // 7. INSERTAR EN BD
  const { error } = await supabase
    .from('web_appointments')
    .insert({
      client_user_id: user.id,
      inventory_id: inventoryId,
      appointment_date: new Date(dateStr).toISOString(),
      type: 'compra',
      status: 'pendiente',
      notes: notes || ''
    });

  if (error) {
    console.error("Error BD:", error);
    return { error: "Hubo un error al guardar tu cita." };
  }

  revalidatePath('/home');
  return { success: true };
}