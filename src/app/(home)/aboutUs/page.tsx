import React from 'react';
import { HeroSection } from '@/components/features/aboutUs/HeroSection';
import { ValuesSection } from '@/components/features/aboutUs/ValuesSection';
import { LocationSection } from '@/components/features/aboutUs/LocationSection';
import { TestimonialsSection } from '@/components/features/aboutUs/TestimonialsSection';
import { BlogSection } from '@/components/features/aboutUs/BlogSection';
import { ContactSection } from '@/components/features/aboutUs/ContactSection';

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-red-100 selection:text-red-900">
      <HeroSection />
      <ValuesSection />
      <LocationSection />
      <TestimonialsSection />
      <BlogSection />
      <ContactSection />
    </div>
  );
}