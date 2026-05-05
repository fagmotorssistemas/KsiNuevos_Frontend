import { GoogleGenerativeAI } from '@google/generative-ai'

export interface VehicleCaptionInput {
  marca: string
  modelo: string
  version: string
  año: string | number
  motor: string
  transmision: string
  traccion: string
  tipo: string
}

const MODEL = 'gemini-2.0-flash'

function buildPrompt(v: VehicleCaptionInput): string {
  return `Genera un caption para Instagram y Facebook para la venta de un vehículo seminuevo con las siguientes características:

Marca: ${v.marca}
Modelo: ${v.modelo}
Versión: ${v.version}
Año: ${v.año}
Motor: ${v.motor}
Transmisión: ${v.transmision}
Tracción: ${v.traccion}
Tipo de vehículo: ${v.tipo}

Sigue EXACTAMENTE este formato (responde SOLO el caption, sin explicaciones adicionales):

[Marca] [Modelo] [Versión] [Año] combina [características principales adaptadas al tipo de vehículo] para quienes buscan [perfil del comprador ideal]. 💥 [Frase atractiva y corta].

🚘 Motor [motor], transmisión [transmisión], versión [tracción], con excelente desempeño, manejo confortable y equipamiento ideal para ciudad o carretera.

📍Disponible en KSINUEVOS – Cuenca, seminueva certificada.
📍 Dirección principal: Av. España 6-73 y Sevilla, Cuenca, Ecuador
📍 Segunda entrada: Av. Gil Ramírez y Sevilla, Cuenca, Ecuador

👇🏻Ver Mapa
https://maps.app.goo.gl/ukJnbKb5kXvtewXX8

🚗 [Frase de cierre que resalte los 3 valores clave del vehículo].

📲 Agenda tu test drive 👉 wa.me/593983335555

#[Marca][Modelo] #[Modelo][Año] #[Marca]Ecuador #[TipoVehiculo]Cuenca #KSINUEVOS #[TipoVehiculo]Familiar #VehiculosSeminuevos #AutosUsadosCuenca #CompraVentaAutos #ConcesionarioCuenca #AutosEcuador #CuencaEcuador #[TipoVehiculo]Lifestyle #[Marca][Modelo]Cuenca

Responde ÚNICAMENTE con el caption formateado, sin comillas, sin explicación previa ni posterior.`
}

/**
 * Genera caption con Gemini (misma dependencia que el análisis V2).
 */
export async function generateCaption(vehicle: VehicleCaptionInput): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY no configurada')

  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({ model: MODEL })
  const result = await model.generateContent(buildPrompt(vehicle))
  const text = result.response.text().trim()
  if (!text) throw new Error('Gemini devolvió caption vacío')
  return text.replace(/^["']|["']$/g, '').trim()
}
