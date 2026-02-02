import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// --- HELPER ACTUALIZADO: Procesar Imágenes ---
const getFirstImage = (urls: string[] | null) => {
  if (Array.isArray(urls) && urls.length > 0) {
    return urls[0]; 
  }
  return '/placeholder-car.png'; 
};

// --- INTERFACES ---

export interface UserData {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  avatar_initials: string;
}

export interface StatsData {
  activeAppointments: number;
  viewedCars: number;
}

export interface AppointmentData {
  id: number;
  type: string;
  status: string;
  date: string;
  notes: string | null;
  inventory: {
    id: string;
    brand: string;
    model: string;
    year: number;
    image: string;
  } | null;
  sell_request: {
    id: number;
    brand: string;
    model: string;
    year: number;
    image: string;
  } | null;
}

export const useUserProfile = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<StatsData>({ activeAppointments: 0, viewedCars: 0 });
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  const router = useRouter();

  // --- 1. CARGA DE DATOS ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        router.push('/login');
        return;
      }

      const [profileRes, appsRes, favsRes] = await Promise.all([
        // A. Perfil
        supabase.from('profiles').select('*').eq('id', authUser.id).single(),
        
        // B. Citas
        supabase.from('web_appointments')
          .select(`
            id, type, status, appointment_date, notes,
            inventory:inventory_id ( id, brand, model, year, img_main_url ),
            sell_request:sell_request_id ( id, brand, model, year, photos_urls )
          `) 
          .eq('client_user_id', authUser.id)
          .order('appointment_date', { ascending: false }),
          
        // C. Favoritos (Stats)
        supabase.from('web_favorites').select('id', { count: 'exact' }).eq('user_id', authUser.id)
      ]);

      const profileData = profileRes.data;
      if (profileData) {
        setUser({
          id: authUser.id,
          full_name: profileData.full_name,
          email: authUser.email || '',
          phone: profileData.phone,
          role: profileData.role,
          avatar_initials: profileData.full_name.substring(0, 2).toUpperCase()
        });
      }

      const rawApps = appsRes.data || [];
      const formattedApps: AppointmentData[] = rawApps.map((app: any) => ({
        id: app.id,
        type: app.type,
        status: app.status || 'pendiente',
        date: app.appointment_date,
        notes: app.notes,
        
        inventory: app.inventory ? {
          id: app.inventory.id,
          brand: app.inventory.brand,
          model: app.inventory.model,
          year: app.inventory.year,
          image: app.inventory.img_main_url || '/placeholder.png'
        } : null,

        sell_request: app.sell_request ? {
          id: app.sell_request.id,
          brand: app.sell_request.brand,
          model: app.sell_request.model,
          year: app.sell_request.year,
          image: getFirstImage(app.sell_request.photos_urls) 
        } : null
      }));
      
      setAppointments(formattedApps);
      
      setStats({
        activeAppointments: formattedApps.filter(a => ['pendiente', 'confirmada'].includes(a.status)).length,
        viewedCars: favsRes.count || 0
      });

    } catch (error) {
      console.error("Error cargando perfil:", error);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- 2. ACTUALIZAR PERFIL ---
  const updateProfile = async (newData: { full_name: string; phone: string }) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: newData.full_name,
        phone: newData.phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) throw error;

    setUser(prev => prev ? {
      ...prev,
      full_name: newData.full_name,
      phone: newData.phone,
      avatar_initials: newData.full_name.substring(0, 2).toUpperCase()
    } : null);
  };

  // --- 3. CANCELAR CITA (CORREGIDO) ---
  const cancelAppointment = async (appointmentId: number) => {
    const { error } = await supabase
      .from('web_appointments')
      // CORRECCIÓN: Se cambió 'cancelada' por 'cancelado' para coincidir con el esquema de la DB
      .update({ status: 'cancelado', updated_at: new Date().toISOString() })
      .eq('id', appointmentId);

    if (error) throw error;

    // Actualizar estado local con el valor correcto
    setAppointments(prev => prev.map(app => 
      app.id === appointmentId ? { ...app, status: 'cancelado' } : app
    ));
    
    setStats(prev => ({
      ...prev,
      activeAppointments: Math.max(0, prev.activeAppointments - 1)
    }));
  };

  // --- 4. REPROGRAMAR CITA ---
  const updateAppointment = async (appointmentId: number, newData: { date: string; notes: string }) => {
    const { error } = await supabase
      .from('web_appointments')
      .update({ 
        appointment_date: newData.date,
        notes: newData.notes,
        status: 'pendiente', 
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (error) throw error;

    setAppointments(prev => prev.map(app => 
      app.id === appointmentId 
        ? { ...app, date: newData.date, notes: newData.notes, status: 'pendiente' } 
        : app
    ));
  };

  return { 
    user, 
    stats, 
    appointments, 
    loading, 
    updateProfile, 
    cancelAppointment, 
    updateAppointment,
    refreshData: fetchData 
  };
};