import { GoogleGenerativeAI } from '@google/generative-ai'
import type { NoticieroVehicle } from './types'
import { getNoticieroEnv } from './env'

const MODEL = 'gemini-flash-latest'

function getModel() {
  const genAI = new GoogleGenerativeAI(getNoticieroEnv('GEMINI_API_KEY'))
  return genAI.getGenerativeModel({ model: MODEL })
}

function cleanGeminiText(text: string): string {
  return text.replace(/^["']|["']$/g, '').trim()
}

function str(v: unknown, fallback = 'N/A'): string {
  if (v == null || v === '') return fallback
  return String(v).trim()
}

export function buildVehicleBannerTitle(vehicle: NoticieroVehicle): string {
  const price =
    vehicle.price != null && vehicle.price !== ''
      ? `$${Number(vehicle.price).toLocaleString('es-EC', { maximumFractionDigits: 0 })}`
      : 'Consultar'
  return `${str(vehicle.brand)} ${str(vehicle.model)} ${str(vehicle.year)} • ${str(vehicle.transmission)} • ${price}`
}

function buildVehicleScriptPrompt(vehicle: NoticieroVehicle): string {
  return `Eres el guionista de KSI Nuevos News, un noticiero de un concesionario de autos ubicado en Avenida España y Sevilla, a pocos metros del terminal, en Ecuador. Genera un guión de máximo 25 segundos (aproximadamente 60-70 palabras) para una presentadora de noticias llamada Violante. El guión debe ser energético, profesional y emocionante como un noticiero real. El guión debe hablar sobre este vehículo: Marca: ${str(vehicle.brand)}, Modelo: ${str(vehicle.model)}, Año: ${str(vehicle.year)}, Color: ${str(vehicle.color)}, Versión: ${str(vehicle.version)}, Precio: $${str(vehicle.price)}, Transmisión: ${str(vehicle.transmission)}, Combustible: ${str(vehicle.fuel_type)}, Motor: ${str(vehicle.engine_displacement)}, Tracción: ${str(vehicle.drive_type)}, Pasajeros: ${str(vehicle.passenger_capacity)}, Tipo: ${str(vehicle.type_body)}. Estructura del guión: 1. Apertura impactante tipo KSI Nuevos News interrumpe... 2. Descripción emocionante del vehículo con sus specs más relevantes 3. Mencionar el precio 4. Cierre con dirección: Visítanos en Avenida España y Sevilla 5. Firma: Esto fue KSI Nuevos News. Devuelve SOLO el texto del guión, sin indicaciones de escena, sin comillas, sin explicaciones adicionales.`
}

function buildCustomScriptPrompt(topic: string): string {
  return `Eres el guionista de KSI Nuevos News, un noticiero de un concesionario de autos ubicado en Avenida España y Sevilla, a pocos metros del terminal, en Ecuador. Genera un guión de máximo 25 segundos (aproximadamente 60-70 palabras) para una presentadora de noticias llamada Violante. El guión debe ser energético, profesional y emocionante como un noticiero real. El tema del clip es el siguiente: ${topic}. Estructura del guión: 1. Apertura impactante tipo KSI Nuevos News informa... 2. Desarrollo del tema de forma emocionante 3. Llamado a la acción 4. Cierre con dirección: Visítanos en Avenida España y Sevilla 5. Firma: Esto fue KSI Nuevos News. Devuelve SOLO el texto del guión, sin indicaciones de escena, sin comillas, sin explicaciones adicionales.`
}

export async function generateNoticieroScript(
  mode: 'vehicle' | 'custom',
  vehicle?: NoticieroVehicle,
  customTopic?: string
): Promise<{ script: string; bannerTitle: string }> {
  const model = getModel()

  if (mode === 'vehicle') {
    if (!vehicle) throw new Error('Se requiere vehículo para generar el guión')
    const prompt = buildVehicleScriptPrompt(vehicle)
    console.log('[noticiero/gemini] Generando guión para vehículo:', vehicle.brand, vehicle.model)
    const result = await model.generateContent(prompt)
    const script = cleanGeminiText(result.response.text())
    if (!script) throw new Error('Gemini devolvió un guión vacío')
    return { script, bannerTitle: buildVehicleBannerTitle(vehicle) }
  }

  const topic = customTopic?.trim()
  if (!topic) throw new Error('El tema personalizado es requerido')
  const prompt = buildCustomScriptPrompt(topic)
  console.log('[noticiero/gemini] Generando guión para tema personalizado')
  const result = await model.generateContent(prompt)
  const script = cleanGeminiText(result.response.text())
  if (!script) throw new Error('Gemini devolvió un guión vacío')

  const titlePrompt = `Resume el siguiente tema de noticiero automotriz en un título de máximo 6 palabras EN MAYÚSCULAS, sin comillas ni explicación: ${topic}`
  const titleResult = await model.generateContent(titlePrompt)
  const bannerTitle = cleanGeminiText(titleResult.response.text()).toUpperCase()
  if (!bannerTitle) throw new Error('Gemini no generó título para el banner')

  return { script, bannerTitle }
}

export async function generateCustomBannerTitle(customTopic: string): Promise<string> {
  const model = getModel()
  const titlePrompt = `Resume el siguiente tema de noticiero automotriz en un título de máximo 6 palabras EN MAYÚSCULAS, sin comillas ni explicación: ${customTopic}`
  const titleResult = await model.generateContent(titlePrompt)
  const bannerTitle = cleanGeminiText(titleResult.response.text()).toUpperCase()
  if (!bannerTitle) throw new Error('Gemini no generó título para el banner')
  return bannerTitle
}
