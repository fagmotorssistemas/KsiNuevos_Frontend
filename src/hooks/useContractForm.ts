import { useState, FormEvent } from 'react';

export const useContractForm = () => {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: FormEvent, action: () => Promise<void>) => {
    e.preventDefault();
    setStatus('submitting');
    
    try {
      await action();
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
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