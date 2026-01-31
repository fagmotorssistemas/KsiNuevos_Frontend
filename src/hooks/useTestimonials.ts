import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client'; 
import { TestimonialWithRelations } from '@/types/testimonials';

export const useTestimonials = () => {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testimonials, setTestimonials] = useState<TestimonialWithRelations[]>([]);
  
  const supabase = createClient();

  // Cargar sesión del usuario actual
  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Buscamos en la tabla de perfiles usando el ID de la sesión
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

  // FUNCIÓN PARA ADMINISTRADOR: Obtener todos los testimonios con relaciones
  const fetchAllTestimonials = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('web_testimonials')
        .select(`
          *,
          profiles (full_name),
          inventory (brand, model)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTestimonials((data as unknown as TestimonialWithRelations[]) || []);
    } catch (err) {
      console.error("Error cargando testimonios:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // FUNCIÓN PARA CLIENTE: Enviar un nuevo testimonio
  const submitTestimonial = async (comment: string, rating: number, inventoryId?: string) => {
    if (!userProfile) return;
    setStatus('submitting');

    const { error } = await supabase
      .from('web_testimonials')
      .insert({
        user_id: userProfile.id,
        customer_name: userProfile.full_name,
        comment,
        rating,
        inventory_reference_id: inventoryId || null,
        display_on_home: false // Moderación manual por defecto
      });

    if (error) {
      console.error("Error al insertar testimonio:", error);
      setStatus('error');
    } else {
      setStatus('success');
      await fetchAllTestimonials(); // Refrescar lista automáticamente
    }
  };

  /**
   * ACCIONES DE MODERACIÓN (Nuevas)
   */

  // PUBLICAR O QUITAR (Cambiar estado true/false)
  const updateTestimonialStatus = async (id: number, isVisible: boolean) => {
    try {
      const { error } = await supabase
        .from('web_testimonials')
        .update({ display_on_home: isVisible })
        .eq('id', id);

      if (error) throw error;
      
      // Actualización optimista o refresco total
      await fetchAllTestimonials();
      return { success: true };
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      return { success: false, error: err };
    }
  };

  // ELIMINAR TESTIMONIO
  const deleteTestimonial = async (id: number) => {
    try {
      const { error } = await supabase
        .from('web_testimonials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchAllTestimonials();
      return { success: true };
    } catch (err) {
      console.error("Error al eliminar testimonio:", err);
      return { success: false, error: err };
    }
  };

  return { 
    userProfile, 
    status, 
    loading, 
    testimonials,
    submitTestimonial, 
    fetchAllTestimonials,
    updateTestimonialStatus, // Nueva función
    deleteTestimonial,       // Nueva función
    setStatus 
  };
};