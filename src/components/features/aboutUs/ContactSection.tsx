'use client'; 

import React from 'react';
import { Mail, Phone, ShieldCheck, MessageSquare } from 'lucide-react';
// Importación corregida (con 'r' en Contract)
import { useContractForm } from '../../../hooks/useContractForm';

export const ContactSection = () => {
  const { status, handleSubmit, resetForm } = useContractForm();

  // 1. Definimos la acción de envío (aquí iría tu llamada a la API real)
  const handleSendAction = async () => {
    // Simulamos una espera de 2 segundos como si enviara un correo
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log("Mensaje enviado con éxito");
  };

  return (
    <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto" id="contacto">
      <div className="bg-white rounded-3xl p-8 md:p-16 shadow-2xl shadow-gray-100 border border-gray-100">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
          {/* Contact Info */}
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-100 text-red-600 mb-6">
              <MessageSquare size={24} />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">Hablemos sobre tu auto</h2>
            <p className="text-gray-500 text-lg mb-10 leading-relaxed">
              ¿Tienes alguna pregunta específica?.
            </p>

            <div className="space-y-8">
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0 mr-4 text-gray-900">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Llámanos</p>
                  <p className="text-lg font-medium text-gray-900">0983335555</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-gray-50 p-8 rounded-2xl">
            {status === 'success' ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Recibido!</h3>
                <p className="text-gray-600 mb-6">Tu mensaje ha sido enviado correctamente.</p>
                <button 
                  onClick={resetForm}
                  className="text-red-600 font-bold hover:text-red-700 transition-colors text-sm"
                >
                  Enviar nuevo mensaje
                </button>
              </div>
            ) : (
              // 2. CORRECCIÓN AQUÍ: Pasamos el evento 'e' Y la función 'handleSendAction'
              <form onSubmit={(e) => handleSubmit(e, handleSendAction)} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Tu Mensaje</label>
                  <textarea 
                    required 
                    rows={5} 
                    placeholder="Hola, me gustaría saber más sobre..." 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-none shadow-sm"
                  ></textarea>
                </div>
                
                <div className="flex items-center justify-between">
                  <button 
                    disabled={status === 'submitting'}
                    type="submit" 
                    className="bg-red-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-red-700 active:bg-red-800 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {status === 'submitting' ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};