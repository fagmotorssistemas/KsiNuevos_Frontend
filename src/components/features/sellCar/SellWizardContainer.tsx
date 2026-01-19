'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation' 
import { createSellRequest, type SellRequestData } from '@/hooks/Homeksi/sell-actions'

// Imports de los 4 Pasos
import { Step1VehicleInfo } from './steps/Step1VehicleInfo'
import { Step2Condition } from './steps/Step2Condition'
import { Step3Photos } from './steps/Step3Photos'
import { Step4Inspection } from './steps/Step4Inspection'

interface SellWizardProps {
  initialData: Partial<SellRequestData>
  isOpen: boolean
  onClose: () => void
}

export const SellWizardContainer = ({ initialData, isOpen, onClose }: SellWizardProps) => {
  const router = useRouter() 
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<Partial<SellRequestData>>(initialData)
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const updateFormData = (newData: Partial<SellRequestData>) => {
    setFormData(prev => ({ ...prev, ...newData }))
  }

  const handleFinalSubmit = async () => {
    if (!formData.appointmentDate) return;

    setIsLoading(true)
    const result = await createSellRequest(formData as SellRequestData)
    setIsLoading(false)

    if (result.success) {
      // Redirección Exitosa
      onClose() 
      router.push('/perfil') 
    } else {
      alert(result.error)
    }
  }

  // Lógica de Validación (Habilitar botón Siguiente)
  const canGoNext = () => {
      switch(step) {
          case 1: 
            // CORRECCIÓN: Ahora validamos explícitamente Marca, Modelo y Año.
            // Si estos datos faltan (por error del Hero o usuario), no deja avanzar.
            return !!(
                formData.brand && 
                formData.model && 
                formData.year &&
                formData.mileage && 
                formData.color && 
                formData.transmission && 
                formData.plate_last_digit
            );
          case 2: 
            // Validamos que tenga precio
            return !!(formData.client_asking_price && formData.client_asking_price > 0);
          case 3: 
            // Fotos son opcionales para avanzar
            return true; 
          case 4: 
            // Validamos que haya seleccionado fecha
            return !!formData.appointmentDate;
          default: return false;
      }
  }

  // Títulos dinámicos según el paso
  const getStepTitle = () => {
      if (step === 1) return "Datos del Vehículo";
      if (step === 2) return "Estado y Precio";
      if (step === 3) return "Fotos (Opcional)";
      if (step === 4) return "Agendar Inspección";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] md:h-auto md:max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg text-gray-900">{getStepTitle()}</h3>
            <p className="text-xs text-gray-400 font-medium">
                {formData.brand} {formData.model} • Paso {step} de 4
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:text-black flex items-center justify-center transition-colors">✕</button>
        </div>

        {/* Barra de Progreso (Base 4 pasos) */}
        <div className="h-1 bg-gray-100 w-full flex-shrink-0">
            <div 
                className="h-full bg-red-600 transition-all duration-500 ease-out" 
                style={{ width: `${(step / 4) * 100}%` }}
            ></div>
        </div>

        {/* Contenido Dinámico */}
        <div className="flex-grow overflow-y-auto relative bg-white">
            {step === 1 && <Step1VehicleInfo data={formData} update={updateFormData} />}
            {step === 2 && <Step2Condition data={formData} update={updateFormData} />}
            {step === 3 && <Step3Photos data={formData} update={updateFormData} />}
            {step === 4 && <Step4Inspection data={formData} update={updateFormData} />}
        </div>

        {/* Footer de Navegación */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center flex-shrink-0">
            
            {/* Botón Atrás */}
            {step > 1 ? (
                <button 
                    onClick={() => setStep(s => s - 1)} 
                    className="text-gray-500 font-bold px-4 hover:text-gray-800 transition-colors"
                    disabled={isLoading}
                >
                    Atrás
                </button>
            ) : (
                <div className="w-10"></div>
            )}
            
            {/* Botón Siguiente / Finalizar */}
            {step < 4 ? (
                 <button 
                    onClick={() => setStep(s => s + 1)} 
                    disabled={!canGoNext()}
                    className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg ${
                        canGoNext() 
                        ? 'bg-black text-white hover:bg-gray-800 hover:shadow-gray-200' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                    }`}
                 >
                    Siguiente
                 </button>
            ) : (
                <button 
                    onClick={handleFinalSubmit}
                    disabled={isLoading || !formData.appointmentDate}
                    className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center gap-2"
                >
                    {isLoading ? 'Enviando...' : 'Confirmar Inspección'}
                </button>
            )}
        </div>

      </div>
    </div>
  )
}