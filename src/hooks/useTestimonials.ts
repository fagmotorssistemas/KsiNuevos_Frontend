import { useState, useEffect } from 'react';
// Importación corregida apuntando a tu cliente existente
import { createClient } from '@/lib/supabase/client'; 

export const useTestimonials = () => {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Buscamos en tu tabla de perfiles usando el ID de la sesión
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!error) setUserProfile(profile);
        }
      } catch (err) {
        console.error("Error cargando sesión:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionAndProfile();
  }, []);

  const submitTestimonial = async (comment: string, rating: number) => {
    if (!userProfile) return;
    setStatus('submitting');

    const { error } = await supabase
      .from('web_testimonials')
      .insert({
        user_id: userProfile.id,
        customer_name: userProfile.full_name,
        comment,
        rating,
        display_on_home: false // Requiere moderación manual por defecto
      });

    if (error) {
      console.error("Error al insertar testimonio:", error);
      setStatus('error');
    } else {
      setStatus('success');
    }
  };

  return { userProfile, status, loading, submitTestimonial, setStatus };
};