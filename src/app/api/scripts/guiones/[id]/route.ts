import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireMarketingSession } from '@/lib/videos/api-marketing-auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMarketingSession(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!id?.trim()) {
    return NextResponse.json({ message: 'ID de guión requerido' }, { status: 400 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ message: 'JSON inválido' }, { status: 400 })
  }

  const guionEscenas = body.guion_escenas
  if (!Array.isArray(guionEscenas)) {
    return NextResponse.json({ message: 'guion_escenas debe ser un arreglo' }, { status: 400 })
  }

  let supabase
  try {
    supabase = createServiceRoleClient()
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error de configuración del servidor'
    return NextResponse.json({ message }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('video_scripts')
    .update({ guion_escenas: guionEscenas })
    .eq('id', id)
    .select('id, guion_escenas')
    .single()

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ message: 'Guión no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ script: data })
}
