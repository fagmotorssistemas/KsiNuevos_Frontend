import type Anthropic from '@anthropic-ai/sdk'
import { getClaudeClient, resolveReelsModel, serverSideFallback } from './claude-client'

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

/** Texto corto con formato fijo: no necesita pensar mucho. */
const CAPTION_EFFORT = 'low' as const

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

/** Texto de la publicación de Instagram y Facebook del Reel, con Claude (mismo modelo que el montaje). */
export async function generateCaption(vehicle: VehicleCaptionInput): Promise<string> {
  const model = resolveReelsModel()
  const response = await getClaudeClient('Claude escribe el texto de las publicaciones').beta.messages.create({
    model,
    max_tokens: 16000,
    ...serverSideFallback(model),
    output_config: { effort: CAPTION_EFFORT },
    messages: [{ role: 'user', content: buildPrompt(vehicle) }],
  })

  if (response.stop_reason === 'refusal') {
    throw new Error(`Claude rechazó escribir la publicación (${response.stop_details?.category ?? 'sin categoría'}).`)
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('La publicación de Claude se cortó por largo.')
  }
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
  if (!text) throw new Error('Claude devolvió la publicación vacía')
  console.log(
    `[Caption][Claude] ${response.model}: ${response.usage.input_tokens} tokens entrada, ${response.usage.output_tokens} salida`
  )
  return text.replace(/^["']|["']$/g, '').trim()
}
