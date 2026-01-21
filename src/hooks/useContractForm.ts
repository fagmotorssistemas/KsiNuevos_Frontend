import { useState, FormEvent } from 'react';

export const useContactForm = () => {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    
    // Simulación de llamada a API o Supabase
    setTimeout(() => {
      setStatus('success');
    }, 1500);
  };

  const resetForm = () => {
    setStatus('idle');
  };

  return {
    status,
    handleSubmit,
    resetForm
  };
};