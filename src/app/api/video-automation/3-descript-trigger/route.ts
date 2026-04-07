import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const DESCRIPT_API_BASE = 'https://api.descript.com/v2'

export const maxDuration = 120

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
      .select('id, raw_video_url, ai_generated_prompt, status')
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      await updateJobFailed(supabase, job_id, `Job no encontrado: ${jobError?.message}`)
      return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 })
    }

    if (job.status !== 'sending_to_descript') {
      return NextResponse.json(
        { error: `Estado inválido para Descript: ${job.status}` },
        { status: 400 }
      )
    }

    if (!job.ai_generated_prompt) {
      await updateJobFailed(supabase, job_id, 'No hay prompt de IA generado')
      return NextResponse.json({ error: 'No hay prompt de IA' }, { status: 400 })
    }

    const descriptApiKey = process.env.DESCRIPT_API_KEY
    if (!descriptApiKey) {
      await updateJobFailed(supabase, job_id, 'DESCRIPT_API_KEY no configurada')
      return NextResponse.json({ error: 'Configuración de Descript faltante' }, { status: 500 })
    }

    const headers = {
      'Authorization': `Bearer ${descriptApiKey}`,
      'Content-Type': 'application/json',
    }

    // Step 1: Create a new Descript project
    const createProjectRes = await fetch(`${DESCRIPT_API_BASE}/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: `Auto-Edit Job ${job_id.substring(0, 8)}`,
      }),
    })

    if (!createProjectRes.ok) {
      const errBody = await createProjectRes.text()
      await updateJobFailed(supabase, job_id, `Descript create project failed: ${errBody}`)
      return NextResponse.json(
        { error: 'Error al crear proyecto en Descript', details: errBody },
        { status: 502 }
      )
    }

    const projectData = await createProjectRes.json()
    const descriptProjectId = projectData.id || projectData.project_id

    // Step 2: Import the video into the project
    const importRes = await fetch(`${DESCRIPT_API_BASE}/projects/${descriptProjectId}/media`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        url: job.raw_video_url,
        media_type: 'video',
      }),
    })

    if (!importRes.ok) {
      const errBody = await importRes.text()
      await updateJobFailed(supabase, job_id, `Descript import failed: ${errBody}`)
      return NextResponse.json(
        { error: 'Error al importar video en Descript', details: errBody },
        { status: 502 }
      )
    }

    // Step 3: Trigger the AI Agent (Underlord) with the Gemini-generated prompt
    const agentRes = await fetch(`${DESCRIPT_API_BASE}/projects/${descriptProjectId}/ai-actions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: job.ai_generated_prompt,
        actions: [
          'remove_filler_words',
          'studio_sound',
          'add_captions',
        ],
      }),
    })

    if (!agentRes.ok) {
      const errBody = await agentRes.text()
      await updateJobFailed(supabase, job_id, `Descript AI agent failed: ${errBody}`)
      return NextResponse.json(
        { error: 'Error al activar IA de Descript', details: errBody },
        { status: 502 }
      )
    }

    const descriptProjectUrl = `https://web.descript.com/project/${descriptProjectId}`

    const { error: updateError } = await supabase
      .from('video_automation_jobs')
      .update({
        descript_project_id: descriptProjectId,
        descript_project_url: descriptProjectUrl,
        status: 'processing_descript',
      })
      .eq('id', job_id)

    if (updateError) {
      await updateJobFailed(supabase, job_id, `Error al actualizar job: ${updateError.message}`)
      return NextResponse.json({ error: 'Error al guardar estado' }, { status: 500 })
    }

    return NextResponse.json({
      job_id,
      status: 'processing_descript',
      descript_project_id: descriptProjectId,
      descript_project_url: descriptProjectUrl,
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
