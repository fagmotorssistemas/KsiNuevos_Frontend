import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  buildVehicleHeadlineSync,
  isBannerTitleValid,
  normalizeBannerTitle,
} from './banner-title'
import type { NoticieroVehicle } from './types'
import { buildVehicleScriptFacts } from './vehicle-script-facts'
import { getNoticieroEnv } from './env'

const MODEL = 'gemini-flash-latest'

/** Marca hablada en el guión (pronunciación natural del avatar). */
const BRAND_SPOKEN = 'CASI NUEVOS'
const NEWS_SEGMENT = 'Casi Nuevos News'

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

export { buildVehicleBannerTitle, buildVehicleHeadlineSync } from './banner-title'

async function generateHeadlineWithGemini(prompt: string): Promise<string> {
  const model = getModel()
  const result = await model.generateContent(prompt)
  const title = normalizeBannerTitle(cleanGeminiText(result.response.text()))
  if (!isBannerTitleValid(title)) {
    throw new Error('Gemini devolvió un titular inválido')
  }
  return title
}

export async function generateVehicleHeadline(vehicle: NoticieroVehicle): Promise<string> {
  const fallback = buildVehicleHeadlineSync(vehicle)
  const prompt = `Eres editor de un noticiero automotriz de ${BRAND_SPOKEN} en Ecuador.
Genera UN SOLO titular para la franja inferior del video (lower-third).
Reglas:
- Máximo 8 palabras, TODO EN MAYÚSCULAS
- Solo marca comercial, modelo limpio y año (opcional versión corta si es comercial, ej. ALLURE)
- SIN precio, SIN transmisión, SIN motor, SIN códigos técnicos (Act, Ba6, 5p, 4x2, 1.6, etc.)
- NUNCA uses "KSI"; la marca es CASI NUEVOS solo si hace falta una palabra suelta, no en el titular del vehículo

Datos del inventario:
- Marca: ${str(vehicle.brand)}
- Modelo (texto crudo BD): ${str(vehicle.model)}
- Versión: ${str(vehicle.version, '')}
- Año: ${str(vehicle.year)}
- Color: ${str(vehicle.color, '')}

Ejemplo de salida buena: PEUGEOT 3008 2022
Ejemplo de salida mala: PEUGEOT 3008N ACT 16E BA6 AC 1.6 5P 4X2 TA (2022)

Devuelve SOLO el titular, sin comillas ni explicación.`

  try {
    return await generateHeadlineWithGemini(prompt)
  } catch (err) {
    console.warn('[noticiero/gemini] Titular vehículo con fallback:', err)
    return fallback
  }
}

export async function generateCustomBannerTitle(customTopic: string): Promise<string> {
  const topic = customTopic.trim()
  if (!topic) throw new Error('El tema personalizado es requerido')

  const prompt = `Resume el siguiente tema de noticiero automotriz de ${BRAND_SPOKEN} en un titular de máximo 8 palabras EN MAYÚSCULAS.
Sin comillas, sin precios, sin explicación. Tema: ${topic}`

  return generateHeadlineWithGemini(prompt)
}

function buildVehicleScriptPrompt(vehicle: NoticieroVehicle): string {
  const facts = buildVehicleScriptFacts(vehicle)

  return `Eres el guionista de ${NEWS_SEGMENT}, un noticiero de un concesionario de autos llamado ${BRAND_SPOKEN}, ubicado en Avenida España y Sevilla, a pocos metros del terminal, en Ecuador. Genera un guión de máximo 25 segundos (aproximadamente 60-70 palabras) para una presentadora de noticias llamada Violante. El guión debe ser energético, profesional y emocionante como un noticiero real.

IMPORTANTE: En el guión NUNCA menciones el precio del vehículo ni cantidades de dinero. El precio solo va en el banner visual, no se dice en voz alta.

DATOS DEL VEHÍCULO (usa SOLO lo que aparece abajo; no inventes especificaciones):
${facts.promptBlock}

REGLAS PARA LAS ESPECIFICACIONES EN VOZ:
- Usa el "Modelo comercial" tal cual (ej. Tahoe Híbrida), no leas códigos del inventario (5p, 6.0l, ta, 4x4, etc.).
- Si hay "Motor (decir en voz exactamente)", usa esa frase tal cual (ej. "con motor seis punto cero"). NUNCA digas "seis litros", "motor de 6 litros", "motor tres mil" ni inventes cilindrada.
- Si NO hay motor en los datos, NO menciones cilindrada ni motor.
- Menciona tracción y transmisión solo si aparecen en los datos (ej. cuatro por cuatro, automática).
- Máximo 2 especificaciones técnicas además de color y año, para no saturar el guión.

Estructura del guión:
1. Apertura impactante tipo "${NEWS_SEGMENT} interrumpe..."
2. Descripción emocionante del vehículo con sus especificaciones más relevantes (sin precio)
3. Llamado a la acción para visitar el concesionario
4. Cierre con dirección: Visítanos en Avenida España y Sevilla
5. Firma: Esto fue ${NEWS_SEGMENT}

REGLAS DE MARCA: Di siempre "${BRAND_SPOKEN}" (como suena "casi nuevos"). NUNCA escribas "KSI", "KSI Nuevos" ni variantes.

Devuelve SOLO el texto del guión, sin indicaciones de escena, sin comillas, sin explicaciones adicionales.`
}

function buildCustomScriptPrompt(topic: string): string {
  return `Eres el guionista de ${NEWS_SEGMENT}, un noticiero de un concesionario de autos llamado ${BRAND_SPOKEN}, ubicado en Avenida España y Sevilla, a pocos metros del terminal, en Ecuador. Genera un guión de máximo 25 segundos (aproximadamente 60-70 palabras) para una presentadora de noticias llamada Violante. El guión debe ser energético, profesional y emocionante como un noticiero real.

IMPORTANTE: En el guión NUNCA menciones precios ni cantidades de dinero.

El tema del clip es el siguiente: ${topic}

Estructura del guión:
1. Apertura impactante tipo "${NEWS_SEGMENT} informa..."
2. Desarrollo del tema de forma emocionante
3. Llamado a la acción
4. Cierre con dirección: Visítanos en Avenida España y Sevilla
5. Firma: Esto fue ${NEWS_SEGMENT}

REGLAS DE MARCA: Di siempre "${BRAND_SPOKEN}". NUNCA escribas "KSI", "KSI Nuevos" ni variantes.

Devuelve SOLO el texto del guión, sin indicaciones de escena, sin comillas, sin explicaciones adicionales.`
}

export async function generateNoticieroScript(
  mode: 'vehicle' | 'custom',
  vehicle?: NoticieroVehicle,
  customTopic?: string,
  bannerTitleOverride?: string
): Promise<{ script: string; bannerTitle: string }> {
  const model = getModel()
  const override = bannerTitleOverride?.trim()
    ? normalizeBannerTitle(bannerTitleOverride)
    : null

  if (mode === 'vehicle') {
    if (!vehicle) throw new Error('Se requiere vehículo para generar el guión')
    const prompt = buildVehicleScriptPrompt(vehicle)
    console.log('[noticiero/gemini] Generando guión para vehículo:', vehicle.brand, vehicle.model)
    const result = await model.generateContent(prompt)
    const script = cleanGeminiText(result.response.text())
    if (!script) throw new Error('Gemini devolvió un guión vacío')

    const bannerTitle =
      override && isBannerTitleValid(override)
        ? override
        : await generateVehicleHeadline(vehicle)

    return { script, bannerTitle }
  }

  const topic = customTopic?.trim()
  if (!topic) throw new Error('El tema personalizado es requerido')
  const prompt = buildCustomScriptPrompt(topic)
  console.log('[noticiero/gemini] Generando guión para tema personalizado')
  const result = await model.generateContent(prompt)
  const script = cleanGeminiText(result.response.text())
  if (!script) throw new Error('Gemini devolvió un guión vacío')

  const bannerTitle =
    override && isBannerTitleValid(override) ? override : await generateCustomBannerTitle(topic)

  return { script, bannerTitle }
}
