"use client";

import React, { useState } from 'react';
import Link from 'next/link';
// Importamos AppointmentData para el tipado del estado
import { useUserProfile, AppointmentData } from '@/hooks/userProfile/useUserProfile';

// Layout & Components
import { ProfileLayout } from '@/components/layout/userProfile/ProfileLayout';
import { ProfileSidebar } from '@/components/features/userProfile/ProfileSidebar';
import { AppointmentCard } from '@/components/features/userProfile/AppointmentCard';

// UI Components
import { ProfileModal } from '@/components/ui/ProfileModal';
// Formularios
import { EditProfileForm } from '@/components/features/userProfile/EditProfileForm';
import { EditAppointmentForm } from '@/components/features/userProfile/EditAppointmentForm';

export default function ProfilePage() {
  // Destructuramos todas las funciones del hook
  const { 
    user, 
    stats, 
    appointments, 
    loading, 
    updateProfile, 
    updateAppointment, 
    cancelAppointment 
  } = useUserProfile();
  
  // --- GESTIÓN DE ESTADO DE MODALES ---
  // modalType nos dice qué modal mostrar: 'profile', 'edit_appointment' o 'cancel_appointment'
  const [modalType, setModalType] = useState<'profile' | 'edit_appointment' | 'cancel_appointment' | null>(null);
  
  // selectedAppointment guarda los datos de la cita que estamos tocando
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentData | null>(null);

  // --- HANDLERS: PERFIL ---
  const handleSaveProfile = async (data: { full_name: string; phone: string }) => {
    try {
      await updateProfile(data);
      setModalType(null); // Cerrar modal
      // Opcional: Toast de éxito
    } catch (error) {
      console.error(error);
      alert('Error al actualizar el perfil');
    }
  };

  // --- HANDLERS: ABRIR MODALES DE CITAS ---
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

  // --- HANDLERS: GUARDAR/CONFIRMAR CITAS ---
  const handleSaveAppointment = async (data: { date: string; notes: string }) => {
    if (!selectedAppointment) return;
    try {
      await updateAppointment(selectedAppointment.id, data);
      setModalType(null);
      setSelectedAppointment(null);
    } catch (error) {
      console.error(error);
      alert('Error al reprogramar la cita');
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
      alert('Error al cancelar la cita');
    }
  };

  // --- RENDERIZADO ---

  if (loading) {
    return (
      <ProfileLayout>
        <div className="max-w-6xl mx-auto py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-neutral-200 border-t-red-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm animate-pulse">Cargando tu perfil...</p>
        </div>
      </ProfileLayout>
    );
  }

  if (!user) return null;

  return (
    <ProfileLayout>
      
      {/* --- HEADER DEL PERFIL --- */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="h-40 bg-gradient-to-r from-neutral-900 to-neutral-800 rounded-3xl relative overflow-hidden shadow-sm">
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute bottom-0 left-0 p-8">
            <h1 className="text-2xl font-bold text-white tracking-tight">Hola, {user.full_name.split(' ')[0]}</h1>
            <p className="text-neutral-400 text-sm">Gestiona tus citas y preferencias</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto -mt-16 relative z-10 mb-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-white p-1 shadow-md">
              <div className="w-full h-full rounded-full bg-neutral-100 flex items-center justify-center text-3xl font-bold text-neutral-400 border-2 border-neutral-100">
                {user.avatar_initials}
              </div>
            </div>
            <div className="absolute bottom-1 right-1 bg-neutral-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white uppercase tracking-wider">
              {user.role}
            </div>
          </div>
          <div className="flex-1 text-center md:text-left space-y-2 pb-2">
            <h2 className="text-2xl font-bold text-gray-900">{user.full_name}</h2>
            <div className="flex flex-col md:flex-row items-center gap-y-2 gap-x-6 text-gray-600 text-sm">
              <span className="flex items-center gap-2">📧 {user.email}</span>
              <span className="flex items-center gap-2">📱 {user.phone}</span>
            </div>
          </div>
          
          <div className="pb-2">
            <button 
              onClick={() => setModalType('profile')} // Abrimos modal perfil
              className="px-5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-lg border border-gray-200 transition-colors text-xs uppercase tracking-wide"
            >
              Editar Datos
            </button>
          </div>
        </div>
      </div>

      {/* --- GRID DE CONTENIDO --- */}
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <ProfileSidebar stats={stats} />
          </div>
          
          {/* Lista de Citas */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Mis Citas Agendadas</h2>
              <Link href="/buyCar" className="text-xs font-bold text-red-600 hover:text-red-700 uppercase tracking-wide">
                + Nueva Cita
              </Link>
            </div>
            <div className="space-y-4">
              {appointments.length > 0 ? (
                appointments.map((cita) => (
                  <AppointmentCard 
                    key={cita.id} 
                    appointment={cita} 
                    onEdit={openEditAppointment}     // Pasamos handler
                    onCancel={openCancelAppointment} // Pasamos handler
                  />
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-500 mb-3">No tienes citas programadas aún.</p>
                  <Link href="/buyCar" className="text-indigo-600 text-sm font-bold hover:underline">
                    Ver catálogo de vehículos &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- SECCIÓN DE MODALES --- */}

      {/* 1. Modal Editar Perfil */}
      <ProfileModal 
        isOpen={modalType === 'profile'} 
        onClose={() => setModalType(null)}
        title="Editar Perfil"
      >
        <EditProfileForm 
          initialData={{ full_name: user.full_name, phone: user.phone }}
          onSave={handleSaveProfile}
          onCancel={() => setModalType(null)}
        />
      </ProfileModal>

      {/* 2. Modal Editar Cita */}
      <ProfileModal 
        isOpen={modalType === 'edit_appointment' && !!selectedAppointment} 
        onClose={() => setModalType(null)}
        title="Reprogramar Cita"
      >
        {selectedAppointment && (
          <EditAppointmentForm 
            initialData={{ date: selectedAppointment.date, notes: selectedAppointment.notes }}
            onSave={handleSaveAppointment}
            onCancel={() => setModalType(null)}
          />
        )}
      </ProfileModal>

      {/* 3. Modal Confirmar Cancelación */}
      <ProfileModal 
        isOpen={modalType === 'cancel_appointment'} 
        onClose={() => setModalType(null)}
        title="¿Cancelar Cita?"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            ¿Estás seguro que deseas cancelar esta cita? Esta acción no se puede deshacer y el espacio quedará disponible para otros clientes.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <button 
              onClick={() => setModalType(null)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-all"
            >
              No, volver
            </button>
            <button 
              onClick={handleConfirmCancel}
              className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm hover:shadow transition-all"
            >
              Sí, cancelar cita
            </button>
          </div>
        </div>
      </ProfileModal>
      
    </ProfileLayout>
  );
}