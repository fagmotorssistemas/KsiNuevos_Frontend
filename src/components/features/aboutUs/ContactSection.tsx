'use client'; 

import React, { useState, useEffect } from 'react';
import { Mail, Phone, ShieldCheck, MessageSquare, Star, Send, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export const ContactSection = ({ isTestimonialMode = false }) => {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  
  const supabase = createClient();

  useEffect(() => {
    if (isTestimonialMode) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.from('profiles').select('*').eq('id', user.id).single()
            .then(({ data }) => setUserProfile(data));
        }
      });
    }
  }, [isTestimonialMode]);

  const handleTestimonialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    
    setStatus('submitting');
    const { error } = await supabase.from('web_testimonials').insert({
      user_id: userProfile.id,
      customer_name: userProfile.full_name,
      comment: comment,
      rating: rating,
      display_on_home: false
    });

    if (!error) {
      setStatus('success');
      setComment('');
    } else {
      setStatus('error');
    }
  };

  return (
    <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto" id={isTestimonialMode ? "dejar-testimonio" : "contacto"}>
      <div className="bg-white rounded-3xl p-8 md:p-16 shadow-2xl shadow-gray-100 border border-gray-100">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Columna Izquierda: Info */}
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-100 text-red-600 mb-6">
              {isTestimonialMode ? <Star size={24} /> : <MessageSquare size={24} />}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
              {isTestimonialMode ? "Comparte tu experiencia" : "Hablemos sobre tu próximo auto"}
            </h2>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              {isTestimonialMode 
                ? "Tu opinión es fundamental para nosotros. Ayuda a otros clientes a tomar la mejor decisión."
                : "Nuestro equipo de expertos está listo para asesorarte en la compra o venta de tu vehículo."}
            </p>
            
            {/* Solo mostramos contacto si NO es modo testimonio */}
            {!isTestimonialMode && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-gray-700">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-red-600"><Phone size={20} /></div>
                  <span className="font-semibold">+593 99 999 9999</span>
                </div>
                <div className="flex items-center gap-4 text-gray-700">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-red-600"><Mail size={20} /></div>
                  <span className="font-semibold">ventas@ksinuevos.com</span>
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Formulario */}
          <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
            {status === 'success' ? (
              <div className="text-center py-10">
                <CheckCircle2 className="mx-auto text-green-500 mb-4" size={48} />
                <h3 className="text-xl font-bold mb-2">¡Gracias por tu mensaje!</h3>
                <p className="text-gray-600">Procesaremos tu solicitud a la brevedad.</p>
              </div>
            ) : isTestimonialMode && !userProfile ? (
              <div className="text-center py-10">
                <p className="text-gray-600 mb-6">Inicia sesión para dejarnos un testimonio.</p>
                <a href="/login" className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-red-600 transition-all">Iniciar Sesión</a>
              </div>
            ) : (
              <form onSubmit={isTestimonialMode ? handleTestimonialSubmit : undefined} className="space-y-6">
                {isTestimonialMode && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Calificación</label>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} onClick={() => setRating(s)} className={`cursor-pointer ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    {isTestimonialMode ? "Tu Reseña" : "Tu Mensaje"}
                  </label>
                  <textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required 
                    rows={5} 
                    placeholder={isTestimonialMode ? "Escribe aquí tu experiencia..." : "Hola, me gustaría saber más sobre..."} 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  />
                </div>
                <button 
                  disabled={status === 'submitting'}
                  type="submit" 
                  className="w-full bg-red-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-70"
                >
                  {status === 'submitting' ? 'Enviando...' : 'Publicar'}
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};