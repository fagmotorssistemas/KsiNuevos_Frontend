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

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    const priceFormatted = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(vehicle.price || 0)

    const prompt = `You are a master automotive video editor. Watch this raw video carefully. The car featured is a ${vehicle.brand} ${vehicle.model} ${vehicle.year}${vehicle.version ? ` ${vehicle.version}` : ''}${vehicle.color ? `, color ${vehicle.color}` : ''}${vehicle.transmission ? `, transmisión ${vehicle.transmission}` : ''}, priced at ${priceFormatted} with ${vehicle.mileage?.toLocaleString() || 0} km. Write a strict editing prompt (max 3 sentences) for an automated Descript Underlord Agent. Instructions to include: 1) Remove all filler words and long pauses. 2) Apply Studio Sound. 3) Select the most visually engaging 3 seconds as the hook. 4) Add dynamic, bold yellow captions (Alex Hormozi style) center-screen, ensuring you highlight the brand, model, year, and price in the captions based on the audio.`

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
