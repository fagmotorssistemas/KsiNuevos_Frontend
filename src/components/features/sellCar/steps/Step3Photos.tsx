'use client'

import React, { useState, ChangeEvent } from 'react'
import type { SellRequestData } from '@/hooks/Homeksi/sell-actions'
import { createClient } from '@/lib/supabase/client'

interface StepProps {
  data: Partial<SellRequestData>
  update: (data: Partial<SellRequestData>) => void
}

export const Step3Photos = ({ data, update }: StepProps) => {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const supabase = createClient()

  // Validar que el archivo sea una imagen válida
  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    const maxSize = 5 * 1024 * 1024 // 5MB
    
    if (!validTypes.includes(file.type)) {
      alert(`Archivo ${file.name} no es una imagen válida`)
      return false
    }
    
    if (file.size > maxSize) {
      alert(`Archivo ${file.name} es muy grande (máx 5MB)`)
      return false
    }
    
    return true
  }

  // Función para subir un solo archivo
  const uploadFileToSupabase = async (file: File, userId: string): Promise<string> => {
    try {
      // Validar archivo
      if (!validateFile(file)) {
        throw new Error('Archivo inválido')
      }

      // Sanear el nombre del archivo
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const cleanFileName = file.name
        .replace(/\.[^/.]+$/, '') // Remover extensión
        .replace(/[^a-zA-Z0-9]/g, '_') // Reemplazar caracteres especiales
        .substring(0, 20) // Limitar longitud
      
      // Crear nombre único
      const fileName = `${Date.now()}_${cleanFileName}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      console.log('📤 Subiendo archivo:', filePath)

      // Subir al bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('sell-car-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('❌ Error subiendo:', uploadError)
        throw uploadError
      }

      console.log('✅ Archivo subido:', uploadData)

      // Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from('sell-car-uploads')
        .getPublicUrl(filePath)

      const publicUrl = publicUrlData.publicUrl
      
      // Verificar que la URL sea válida
      if (!publicUrl || !publicUrl.includes('supabase.co')) {
        throw new Error('URL inválida generada')
      }

      console.log('🔗 URL pública:', publicUrl)
      return publicUrl

    } catch (error) {
      console.error('❌ Error en uploadFileToSupabase:', error)
      throw error
    }
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    setUploading(true)
    setUploadProgress(0)
    const files = Array.from(e.target.files)
    
    try {
      // Obtener usuario
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        alert("Tu sesión ha expirado. Por favor inicia sesión nuevamente.")
        return
      }

      console.log('👤 Usuario:', user.id)
      console.log(`📁 Subiendo ${files.length} archivo(s)...`)

      // Subir archivos uno por uno para mejor control
      const newUrls: string[] = []
      
      for (let i = 0; i < files.length; i++) {
        try {
          const url = await uploadFileToSupabase(files[i], user.id)
          newUrls.push(url)
          setUploadProgress(((i + 1) / files.length) * 100)
        } catch (error) {
          console.error(`Error subiendo ${files[i].name}:`, error)
          // Continuar con los demás archivos
        }
      }

      if (newUrls.length === 0) {
        alert('No se pudo subir ninguna imagen. Intenta de nuevo.')
        return
      }

      // 🔍 DEBUGGING: Verificar URLs antes de guardar
      console.log('🔍 URLs generadas:', newUrls)
      console.log('🔍 ¿Alguna contiene placehold?', newUrls.some((url: string) => url.includes('placehold')))
      
      // 🚨 VALIDACIÓN: Bloquear URLs inválidas
      if (newUrls.some((url: string) => url.includes('placehold'))) {
        console.error('🚨 ALERTA: Se detectó URL de placehold.co!')
        alert('ERROR: URL inválida detectada. No se guardará.')
        return
      }

      // Guardar URLs en el estado
      const currentPhotos = data.photos_urls || []
      const allPhotos = [...currentPhotos, ...newUrls]
      
      console.log('💾 Guardando URLs:', allPhotos)
      update({ photos_urls: allPhotos })

      if (newUrls.length < files.length) {
        alert(`Se subieron ${newUrls.length} de ${files.length} imágenes`)
      }

    } catch (error) {
      console.error('❌ Error en la carga masiva:', error)
      alert('Hubo un error al subir las imágenes. Por favor intenta de nuevo.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      e.target.value = ''
    }
  }

  const removePhoto = (index: number) => {
    const current = data.photos_urls || []
    const updated = current.filter((_, i) => i !== index)
    update({ photos_urls: updated })
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="text-center mb-6">
        <h4 className="text-xl font-bold text-gray-900">Fotos del Vehículo</h4>
        <p className="text-sm text-gray-500">
          Sube todas las fotos que tengas (Exterior e Interior)
        </p>
      </div>

      {/* Área de Carga */}
      <div className={`relative border-2 border-dashed border-gray-300 bg-gray-50 rounded-2xl p-8 text-center transition-colors group ${
        uploading ? 'opacity-50 cursor-wait' : 'hover:bg-gray-100 cursor-pointer'
      }`}>
        <input 
          type="file" 
          multiple 
          accept="image/jpeg,image/jpg,image/png,image/webp"
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-2xl group-hover:scale-110 transition-transform">
            {uploading ? '⏳' : '📸'}
          </div>
          <div>
            <p className="font-bold text-gray-700">
              {uploading 
                ? `Subiendo... ${Math.round(uploadProgress)}%` 
                : 'Toca para subir fotos'}
            </p>
            <p className="text-xs text-gray-400">JPG, PNG, WEBP (Máx 5MB c/u)</p>
          </div>
        </div>
      </div>

      {/* Grid de Previsualización */}
      <div className="mt-6 flex-grow overflow-y-auto">
        {data.photos_urls && data.photos_urls.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {data.photos_urls.map((photoUrl, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={photoUrl} 
                  alt={`Foto ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Error cargando imagen:', photoUrl)
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999"%3EError%3C/text%3E%3C/svg%3E'
                  }}
                />
                <button 
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-gray-300 italic text-sm">
            {uploading ? "Procesando imágenes..." : "No has seleccionado fotos aún"}
          </div>
        )}
      </div>

      <p className="text-xs text-center text-gray-400 mt-2">
        * Las fotos se guardan de forma segura en Supabase Storage
      </p>
    </div>
  )
}