import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Real Descript API base — confirmed from https://docs.descriptapi.com
const DESCRIPT_API_BASE = 'https://descriptapi.com/v1'

// Allow up to 5 minutes: import polling + agent trigger can take time for large videos
export const maxDuration = 300

// Poll a Descript job until it stops (success or failure)
async function pollDescriptJob(
  jobId: string,
  headers: Record<string, string>,
  maxWaitMs = 180_000,
  intervalMs = 5_000
): Promise<{
  job_id: string
  job_state: string
  project_id?: string
  project_url?: string
  result?: { status: string; agent_response?: string; [key: string]: unknown }
}> {
  const deadline = Date.now() + maxWaitMs

  while (Date.now() < deadline) {
    const res = await fetch(`${DESCRIPT_API_BASE}/jobs/${jobId}`, { headers })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Descript job poll failed (${res.status}): ${body}`)
    }

    const data = await res.json()

    if (data.job_state === 'stopped' || data.job_state === 'cancelled' || data.job_state === 'failed') {
      return data
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Descript job ${jobId} did not finish within ${maxWaitMs / 1000}s timeout`)
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

    // Read job + vehicle data from DB
    const { data: job, error: jobError } = await supabase
      .from('video_automation_jobs')
      .select(`
        id,
        raw_video_url,
        ai_generated_prompt,
        status,
        vehicle_id,
        inventoryoracle!inner (
          brand,
          model,
          year
        )
      `)
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

    const vehicle = job.inventoryoracle as unknown as {
      brand: string
      model: string
      year: number
    }

    const projectName = `KSI - ${vehicle.brand} ${vehicle.model} ${vehicle.year} - ${job_id.substring(0, 8)}`

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Import video and create project in a single API call
    // Docs: POST https://descriptapi.com/v1/jobs/import/project_media
    // ─────────────────────────────────────────────────────────────────────────
    const importRes = await fetch(`${DESCRIPT_API_BASE}/jobs/import/project_media`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        project_name: projectName,
        add_media: {
          'video.mp4': {
            url: job.raw_video_url,
          },
        },
        add_compositions: [
          {
            name: 'Main Composition',
            clips: [{ media: 'video.mp4' }],
          },
        ],
      }),
    })

    if (!importRes.ok) {
      const errBody = await importRes.text()
      await updateJobFailed(supabase, job_id, `Descript import failed (${importRes.status}): ${errBody}`)
      return NextResponse.json(
        { error: 'Error al importar video en Descript', details: errBody },
        { status: 502 }
      )
    }

    const importData = await importRes.json()
    const importJobId: string = importData.job_id
    const descriptProjectId: string = importData.project_id
    const descriptProjectUrl: string = importData.project_url

    // Save project info immediately so it's visible in the dashboard while we wait
    await supabase
      .from('video_automation_jobs')
      .update({
        descript_project_id: descriptProjectId,
        descript_project_url: descriptProjectUrl,
      })
      .eq('id', job_id)

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Poll until the import job finishes (job_state === "stopped")
    // Docs: GET https://descriptapi.com/v1/jobs/{job_id}
    // ─────────────────────────────────────────────────────────────────────────
    let importResult
    try {
      importResult = await pollDescriptJob(importJobId, headers, 180_000, 5_000)
    } catch (pollErr: unknown) {
      const msg = pollErr instanceof Error ? pollErr.message : String(pollErr)
      await updateJobFailed(supabase, job_id, `Import polling timeout/error: ${msg}`)
      return NextResponse.json({ error: 'Timeout esperando que Descript procese el video', details: msg }, { status: 504 })
    }

    if (importResult.job_state !== 'stopped' || importResult.result?.status !== 'success') {
      const msg = `Import terminó con estado: ${importResult.job_state} / result: ${JSON.stringify(importResult.result)}`
      await updateJobFailed(supabase, job_id, msg)
      return NextResponse.json({ error: 'La importación en Descript falló', details: msg }, { status: 502 })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Trigger Agent Underlord with the Gemini-generated prompt
    // Docs: POST https://descriptapi.com/v1/jobs/agent
    // ─────────────────────────────────────────────────────────────────────────
    const agentRes = await fetch(`${DESCRIPT_API_BASE}/jobs/agent`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        project_id: descriptProjectId,
        prompt: job.ai_generated_prompt,
      }),
    })

    if (!agentRes.ok) {
      const errBody = await agentRes.text()
      await updateJobFailed(supabase, job_id, `Descript agent failed (${agentRes.status}): ${errBody}`)
      return NextResponse.json(
        { error: 'Error al activar el agente Underlord de Descript', details: errBody },
        { status: 502 }
      )
    }

    const agentData = await agentRes.json()
    const agentJobId: string = agentData.job_id

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Update DB — status → processing_descript
    // The agent works asynchronously in Descript; the vendor reviews it manually.
    // ─────────────────────────────────────────────────────────────────────────
    const { error: updateError } = await supabase
      .from('video_automation_jobs')
      .update({
        descript_project_id: descriptProjectId,
        descript_project_url: descriptProjectUrl,
        status: 'processing_descript',
        // Store agent job ID in error_log temporarily for debugging (non-critical)
        error_log: null,
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
      descript_agent_job_id: agentJobId,
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
