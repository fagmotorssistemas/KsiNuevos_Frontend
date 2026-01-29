'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation' 
import { createSellRequest, type SellRequestData } from '@/hooks/Homeksi/sell-actions'
import { KsButton } from '@/components/ui/Homeksi/KsButton' // Asegúrate de que la ruta sea correcta

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
  const [isSuccess, setIsSuccess] = useState(false) // <-- Nuevo estado de éxito

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
      setIsSuccess(true) // <-- Activamos la vista de éxito en lugar de redirigir
    } else {
      alert(result.error)
    }
  }

  const handleGoToAppointments = () => {
    onClose()
    router.push('/perfil')
  }

  const canGoNext = () => {
      switch(step) {
          case 1: 
            return !!(formData.brand && formData.model && formData.year && formData.mileage && formData.color && formData.transmission && formData.plate_last_digit);
          case 2: 
            return !!(formData.client_asking_price && formData.client_asking_price > 0);
          case 3: 
            return true; 
          case 4: 
            return !!formData.appointmentDate;
          default: return false;
      }
  }

  const getStepTitle = () => {
      if (step === 1) return "Datos del Vehículo";
      if (step === 2) return "Estado y Precio";
      if (step === 3) return "Fotos (Opcional)";
      if (step === 4) return "Agendar Inspección";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] md:h-auto md:max-h-[90vh]">
        
        {!isSuccess ? (
          <>
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

            {/* Barra de Progreso */}
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
                {step > 1 ? (
                    <button 
                        onClick={() => setStep(s => s - 1)} 
                        className="text-gray-500 font-bold px-4 hover:text-gray-800 transition-colors"
                        disabled={isLoading}
                    >
                        Atrás
                    </button>
                ) : <div className="w-10"></div>}
                
                {step < 4 ? (
                     <button 
                        onClick={() => setStep(s => s + 1)} 
                        disabled={!canGoNext()}
                        className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg ${
                            canGoNext() 
                            ? 'bg-black text-white hover:bg-gray-800' 
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
          </>
        ) : (
          /* VISTA DE ÉXITO INTEGRADA */
          <div className="p-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 className="text-3xl font-bold text-gray-900 mb-2">¡Solicitud Recibida!</h3>
            <p className="text-gray-600 mb-8 max-w-sm">
              Hemos registrado la inspección para tu <span className="font-semibold text-gray-900">{formData.brand} {formData.model}</span>. 
              Pronto un asesor se pondrá en contacto contigo.
            </p>

            <div className="flex flex-col w-full max-w-xs gap-3">
              <KsButton 
                onClick={handleGoToAppointments}
                variant="primary" 
                fullWidth 
                className="rounded-xl h-14 text-base font-bold"
              >
                Ir a mis solicitudes
              </KsButton>
              
              <button 
                onClick={onClose}
                className="text-gray-500 text-sm font-medium hover:text-gray-800 transition-colors py-2"
              >
                Cerrar ventana
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}