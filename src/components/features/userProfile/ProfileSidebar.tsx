import Link from 'next/link';
import React from 'react';

interface ProfileSidebarProps {
  stats: {
    activeAppointments: number;
    viewedCars: number;
  }
}

export const ProfileSidebar = ({ stats }: ProfileSidebarProps) => {
  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Resumen</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Citas Activas</span>
            <span className="font-bold text-gray-900">{stats.activeAppointments}</span>
          </div>
        </div>
      </div>

      {/* CTA Venta */}
      <div className="bg-neutral-900 rounded-xl p-6 text-white shadow-lg">
        <h4 className="font-bold mb-2">¿Quieres vender tu auto?</h4>
        <p className="text-neutral-400 text-sm mb-4">Recibe una oferta inmediata.</p>
        <Link href="/sellCar">
          <button className="w-full py-2 bg-white text-black hover:bg-gray-200 rounded-lg text-sm font-bold uppercase tracking-wide transition-colors">
            Avaluar mi auto
          </button>
        </Link>
      </div>
    </div>
  );
};