import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const maxDuration = 300

async function waitForFileProcessing(
  fileManager: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  fileName: string,
  genAI: GoogleGenerativeAI
) {
  const fm = genAI as unknown as { fileManager: { getFile: (name: string) => Promise<{ state: string; name: string; uri: string }> } }

  let file = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${process.env.GEMINI_API_KEY}`
  ).then(r => r.json())

  while (file.state === 'PROCESSING') {
    await new Promise(resolve => setTimeout(resolve, 5000))
    file = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${process.env.GEMINI_API_KEY}`
    ).then(r => r.json())
  }

  if (file.state === 'FAILED') {
    throw new Error('Gemini File API: el procesamiento del video falló')
  }

  return file
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { job_id } = body

    if (!job_id) {
      return NextResponse.json({ error: 'job_id es requerido' }, { status: 400 })
    }

    const { data: job, error: jobError } = await supabase
      .from('video_automation_jobs')
      .select(`
        id,
        raw_video_url,
        status,
        vehicle_id,
        target_duration_seconds,
        inventoryoracle!inner (
          brand,
          model,
          year,
          price,
          mileage,
          color,
          transmission,
          fuel_type,
          version
        )
      `)
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      await updateJobFailed(supabase, job_id, `Job no encontrado: ${jobError?.message}`)
      return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 })
    }

    if (job.status !== 'analyzing_gemini') {
      return NextResponse.json(
        { error: `Estado inválido para análisis: ${job.status}` },
        { status: 400 }
      )
    }

    const vehicle = job.inventoryoracle as unknown as {
      brand: string
      model: string
      year: number
      price: number
      mileage: number
      color: string | null
      transmission: string | null
      fuel_type: string | null
      version: string | null
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

    const videoResponse = await fetch(job.raw_video_url)
    if (!videoResponse.ok) {
      await updateJobFailed(supabase, job_id, 'No se pudo descargar el video crudo')
      return NextResponse.json({ error: 'No se pudo descargar el video' }, { status: 500 })
    }

    const videoBuffer = await videoResponse.arrayBuffer()
    const videoBase64 = Buffer.from(videoBuffer).toString('base64')

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const priceFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(vehicle.price || 0)

    const targetDuration: number = (job as unknown as { target_duration_seconds?: number }).target_duration_seconds ?? 40

    const durationFormatted = targetDuration >= 60
      ? `${Math.floor(targetDuration / 60)} minute${Math.floor(targetDuration / 60) > 1 ? 's' : ''}`
      : `${targetDuration} seconds`

    const hookDuration = targetDuration <= 25 ? 2 : 3
    const mainContentDuration = targetDuration - hookDuration - (targetDuration >= 40 ? 3 : 2)

    const toleranceLow = targetDuration - 5
    const toleranceHigh = targetDuration + 5

    const prompt = `You are a master automotive video editor specializing in social media content for car dealerships. Watch this raw video carefully and analyze every second of it. The car featured is a ${vehicle.brand} ${vehicle.model} ${vehicle.year}${vehicle.version ? ` ${vehicle.version}` : ''}${vehicle.color ? `, color ${vehicle.color}` : ''}${vehicle.transmission ? `, ${vehicle.transmission} transmission` : ''}${vehicle.fuel_type ? `, ${vehicle.fuel_type}` : ''}, priced at ${priceFormatted} with ${vehicle.mileage?.toLocaleString() || 0} km on the odometer.

DURATION GOAL: Aim for approximately ${durationFormatted} (${targetDuration} seconds). The acceptable range is ${toleranceLow}–${toleranceHigh} seconds — do not sacrifice a great moment or create an awkward cut just to hit an exact number. Natural, clean editing comes first; hitting close to the target comes second. Structure the video as: Hook (${hookDuration}s) → Best highlights of the car and seller pitch (${mainContentDuration}s) → Call to action if mentioned (up to ${targetDuration >= 40 ? 3 : 2}s).

Write a comprehensive, highly detailed editing prompt for an automated Descript Underlord Agent. Be as specific and thorough as necessary. The prompt must include explicit instructions for each of the following areas:

1. DURATION & PACING: Aim for ${durationFormatted} total, acceptable range ${toleranceLow}–${toleranceHigh}s. Keep only the best, most engaging moments. Remove dead air, slow-walking segments, and repeated information. Every second must earn its place. The final cut should feel energetic and fast-paced, perfect for TikTok and Instagram Reels.

2. CLEANUP: Remove every filler word (uh, um, like, you know, etc.), all pauses longer than 0.5 seconds, and any repeated phrases. Cut any sections where the seller loses their train of thought or says something redundant.

3. AUDIO ENHANCEMENT: Apply Studio Sound to the full audio track to eliminate background noise, normalize volume levels, and add professional warmth and clarity to the voice. If there is significant wind noise, crowd noise, or echo, make sure Studio Sound is applied aggressively.

4. HOOK SELECTION: Identify the single most visually and emotionally engaging ${hookDuration}-second clip from the entire video — ideally the car's best angle, a feature demonstration, or the seller's most enthusiastic moment. Place it first (0:00–0:0${hookDuration}). The hook must instantly grab attention.

5. TRANSITIONS: Between each cut, add a smooth and fast transition — preferably a quick crossfade (0.2–0.3 seconds) or a push/slide transition that feels dynamic without being distracting. Avoid hard jump cuts. The transitions should make the video feel polished and professional, not cheap. Choose the transition style that best fits the energy of each cut.

6. SOUND EFFECTS & AUDIO ACCENTS: Add subtle but impactful sound effects to enhance the viewer experience. Suggestions: a short "whoosh" sound on each transition between clips, a brief "ding" or "pop" accent when a key text caption appears on screen (especially when the price ${priceFormatted} or the model "${vehicle.brand} ${vehicle.model}" is shown), and a low background music bed (upbeat, energetic, dealership-appropriate) if Descript's library has a suitable track. Keep the sound effects subtle — they should enhance, not overpower the seller's voice.

7. CAPTIONS: Add dynamic, bold captions in Alex Hormozi style — large font, centered on screen, high contrast (yellow text with dark outline or shadow). Captions must follow the spoken audio word-for-word. Visually emphasize these key data points whenever mentioned: brand "${vehicle.brand}", model "${vehicle.model}", year ${vehicle.year}, and price ${priceFormatted} — make them pop with larger text or a different accent color.

Based on what you actually see and hear in the video, add any additional specific cutting decisions or notes that would maximize the impact for social media.`

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'video/mp4',
          data: videoBase64,
        },
      },
      { text: prompt },
    ])

    const aiPrompt = result.response.text()

    if (!aiPrompt) {
      await updateJobFailed(supabase, job_id, 'Gemini no devolvió un prompt válido')
      return NextResponse.json({ error: 'Gemini no generó respuesta' }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from('video_automation_jobs')
      .update({
        ai_generated_prompt: aiPrompt,
        status: 'sending_to_descript',
      })
      .eq('id', job_id)

    if (updateError) {
      await updateJobFailed(supabase, job_id, `Error al guardar prompt: ${updateError.message}`)
      return NextResponse.json({ error: 'Error al guardar prompt' }, { status: 500 })
    }

    return NextResponse.json({
      job_id,
      status: 'sending_to_descript',
      ai_generated_prompt: aiPrompt,
      vehicle_info: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function updateJobFailed(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  jobId: string,
  errorMessage: string
) {
  await supabase
    .from('video_automation_jobs')
    .update({ status: 'failed', error_log: errorMessage })
    .eq('id', jobId)
}
