import React from 'react';
// Importamos tus Navbars existentes
import { MainNavbar } from '@/components/layout/Homeksi/MainNavbar';
import { MainFooter } from '@/components/layout/Homeksi/MainFooter';

export const ProfileLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MainNavbar />
      {/* Padding ajustado para fixed header */}
      <main className="flex-grow px-4 sm:px-6 lg:px-8">
        {children}
      </main>
      <MainFooter />
    </div>
  );
};