'use client';
import React, { useEffect, useState } from 'react';
import { Star, Quote, CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export const TestimonialsSection = () => {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchTestimonials = async () => {
      const { data } = await supabase
        .from('web_testimonials')
        .select('*')
        .eq('display_on_home', true)
        .order('created_at', { ascending: false });
      if (data) setTestimonials(data);
      setLoading(false);
    };
    fetchTestimonials();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-600" size={40} /></div>;

  return (
    <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto bg-white" id="testimonios">
      {/* ... Tu Header original con "Confianza K-si Nuevos" ... */}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
        {testimonials.map((test) => (
          <div key={test.id} className="group relative bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col">
            <div className="absolute top-8 right-8 text-gray-100 group-hover:text-red-50 transition-colors duration-500">
              <Quote size={64} fill="currentColor" />
            </div>

            <div className="flex gap-1 mb-6 relative z-10">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} fill={i < test.rating ? "#fbbf24" : "none"} className={i < test.rating ? "text-amber-400" : "text-gray-200"} />
              ))}
            </div>

            <p className="text-gray-600 text-lg leading-relaxed mb-8 relative z-10 flex-grow font-medium">
              "{test.comment}"
            </p>

            <div className="flex items-center relative z-10 mt-auto">
              <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm mr-4 group-hover:bg-red-600 transition-colors">
                {test.customer_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">{test.customer_name}</h4>
                <div className="flex items-center mt-0.5">
                  <CheckCircle2 size={14} className="text-green-500 mr-1.5" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente Verificado</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};