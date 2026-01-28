"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useUserProfile, AppointmentData } from '@/hooks/userProfile/useUserProfile';

// Layout & Components
import { ProfileLayout } from '@/components/layout/userProfile/ProfileLayout';
import { AppointmentCard } from '@/components/features/userProfile/AppointmentCard';

// UI Components
import { ProfileModal } from '@/components/ui/ProfileModal';
// Formularios
import { EditProfileForm } from '@/components/features/userProfile/EditProfileForm';
import { EditAppointmentForm } from '@/components/features/userProfile/EditAppointmentForm';

export default function ProfilePage() {
  const { 
    user, 
    appointments, 
    loading, 
    updateProfile, 
    updateAppointment, 
    cancelAppointment 
  } = useUserProfile();
  
  const [modalType, setModalType] = useState<'profile' | 'edit_appointment' | 'cancel_appointment' | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentData | null>(null);
  
  // Estado para controlar las pestañas de Compra y Venta
  const [activeTab, setActiveTab] = useState('Citas de Compra');

  // --- LÓGICA DE FILTRADO ---
  // Filtramos las citas según el 'type' que viene de tu base de datos ("compra" o "venta")
  const filteredAppointments = appointments.filter((cita) => {
    if (activeTab === 'Citas de Compra') {
      return cita.type.toLowerCase() === 'compra';
    }
    if (activeTab === 'Citas de Venta') {
      return cita.type.toLowerCase() === 'venta';
    }
    return true;
  });

  // --- HANDLERS ---
  const handleSaveProfile = async (data: { full_name: string; phone: string }) => {
    try {
      await updateProfile(data);
      setModalType(null);
    } catch (error) {
      console.error(error);
    }
  };

  const openEditAppointment = (id: number) => {
    const app = appointments.find(a => a.id === id);
    if (app) {
      setSelectedAppointment(app);
      setModalType('edit_appointment');
    }
  };

  const openCancelAppointment = (id: number) => {
    const app = appointments.find(a => a.id === id);
    if (app) {
      setSelectedAppointment(app);
      setModalType('cancel_appointment');
    }
  };

  const handleSaveAppointment = async (data: { date: string; notes: string }) => {
    if (!selectedAppointment) return;
    try {
      await updateAppointment(selectedAppointment.id, data);
      setModalType(null);
      setSelectedAppointment(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleConfirmCancel = async () => {
    if (!selectedAppointment) return;
    try {
      await cancelAppointment(selectedAppointment.id);
      setModalType(null);
      setSelectedAppointment(null);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-neutral-200 border-t-red-600 rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return null;

  return (
    <ProfileLayout>
      
      {/* --- HEADER COMPACTO --- */}
      <div className="max-w-7xl mx-auto px-4 pt-2">
        <div className="relative h-44 bg-gradient-to-br from-white via-slate-50 to-indigo-50 rounded-[32px] border border-gray-100 shadow-sm flex items-center px-10 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          <div className="flex items-center gap-8 z-10">
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-neutral-100 flex items-center justify-center text-3xl font-black text-neutral-300 overflow-hidden">
              {user.avatar_initials}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{user.full_name}</h1>
              <p className="text-gray-500 font-medium text-base">Gestiona tus citas y preferencias</p>
              
              <button 
                onClick={() => setModalType('profile')}
                className="mt-3 px-6 py-2 bg-neutral-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all active:scale-95 shadow-md shadow-black/5"
              >
                EDITAR PERFIL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- NAVEGACIÓN (TABS) --- */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="flex gap-10 border-b border-gray-100">
          {['Citas de Compra', 'Citas de Venta'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-bold transition-all relative ${
                activeTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* --- CONTENIDO DINÁMICO --- */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">{activeTab}</h2>
          
          {/* BOTÓN NUEVA CITA REDISEÑADO */}
          <Link 
            href="/buyCar" 
            className="group relative inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-red-200 active:scale-95 overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="text-lg leading-none">+</span>
            <span>Nueva Cita</span>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((cita) => (
              <AppointmentCard 
                key={cita.id} 
                appointment={cita} 
                onEdit={openEditAppointment}
                onCancel={openCancelAppointment}
              />
            ))
          ) : (
            /* ESTADO VACÍO MEJORADO */
            <div className="col-span-full py-16 text-center bg-gray-50/50 rounded-[24px] border-2 border-dashed border-gray-100 flex flex-col items-center gap-4">
               <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-2xl">📅</div>
               <div>
                  <p className="text-gray-400 font-bold">No tienes {activeTab.toLowerCase()} registradas.</p>
                  <p className="text-gray-300 text-sm mt-1">Tu historial aparecerá aquí automáticamente.</p>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* --- MODALES --- */}
      <ProfileModal isOpen={modalType === 'profile'} onClose={() => setModalType(null)} title="Editar Perfil">
        <EditProfileForm 
          initialData={{ full_name: user.full_name, phone: user.phone }}
          onSave={handleSaveProfile}
          onCancel={() => setModalType(null)}
        />
      </ProfileModal>

      <ProfileModal isOpen={modalType === 'edit_appointment' && !!selectedAppointment} onClose={() => setModalType(null)} title="Reprogramar Cita">
        {selectedAppointment && (
          <EditAppointmentForm 
            initialData={{ date: selectedAppointment.date, notes: selectedAppointment.notes }}
            onSave={handleSaveAppointment}
            onCancel={() => setModalType(null)}
          />
        )}
      </ProfileModal>

      <ProfileModal isOpen={modalType === 'cancel_appointment'} onClose={() => setModalType(null)} title="Confirmar Cancelación">
        <div className="p-4 space-y-6">
          <p className="text-gray-600 text-center text-sm">¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.</p>
          <div className="flex gap-4">
            <button onClick={() => setModalType(null)} className="flex-1 py-3 text-sm font-bold text-gray-400">Volver</button>
            <button onClick={handleConfirmCancel} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-100">Confirmar</button>
          </div>
        </div>
      </ProfileModal>
      
    </ProfileLayout>
  );
}