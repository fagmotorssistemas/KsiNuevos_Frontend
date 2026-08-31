import { NextResponse } from 'next/server'
import { SATJE_ACTIVE_STATUSES, requireSatjeAccess } from '@/lib/satje-access'
import {
  SatjeApiError,
  satjeConsultaMissing,
  satjeCreateConsulta,
  satjeStoredStatus,
} from '@/lib/satje'
import { parseEcuadorPlate } from '@/lib/inventario/normalizePlate'

export const maxDuration = 30

function optionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text || null
}

export async function POST(req: Request) {
  const access = await requireSatjeAccess()
  if ('response' in access) return access.response
  const { supabase, user } = access

  let body: { nombre?: unknown; cedula?: unknown; placa?: unknown; ruc?: unknown } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const nombre = optionalText(body.nombre)
  const cedula = optionalText(body.cedula)
  const placa = optionalText(body.placa)
  const ruc = optionalText(body.ruc)

  if (!nombre) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }
  if (!cedula) {
    return NextResponse.json({ error: 'La cédula es obligatoria' }, { status: 400 })
  }
  if (!/^\d{10}$/.test(cedula)) {
    return NextResponse.json({ error: 'La cédula debe tener 10 dígitos' }, { status: 400 })
  }
  if (ruc && !/^\d{13}$/.test(ruc)) {
    return NextResponse.json({ error: 'El RUC debe tener 13 dígitos' }, { status: 400 })
  }
  const placaNorm = placa ? parseEcuadorPlate(placa) : null
  if (placa && !placaNorm) {
    return NextResponse.json(
      {
        error:
          'Placa inválida. Autos: 3 letras y 3 o 4 números. Motos: 2 letras y 3 o 4 números. Sin guion.',
      },
      { status: 400 }
    )
  }

  const { data: active } = await supabase
    .from('satje_consultas')
    .select('id, status')
    .eq('user_id', user.id)
    .in('status', [...SATJE_ACTIVE_STATUSES])
    .maybeSingle()

  if (active) {
    const missing = await satjeConsultaMissing(active.id)

    if (!missing) {
      return NextResponse.json(
        {
          error: 'Ya tienes una consulta SATJE en curso',
          id: active.id,
          estado: active.status,
        },
        { status: 409 }
      )
    }

    const { error: staleError } = await supabase
      .from('satje_consultas')
      .update({ status: 'error' })
      .eq('id', active.id)

    if (staleError) {
      return NextResponse.json(
        { error: 'No se pudo cerrar la consulta anterior' },
        { status: 500 }
      )
    }
  }

  try {
    const created = await satjeCreateConsulta({
      nombre,
      cedula: cedula ?? '',
      placa: placaNorm ?? '',
      ruc: ruc ?? '',
    })
    const { error: insertError } = await supabase.from('satje_consultas').insert({
      id: created.id,
      user_id: user.id,
      nombre,
      cedula,
      placa: placaNorm,
      ruc,
      status: satjeStoredStatus(String(created.estado)),
    })

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: again } = await supabase
          .from('satje_consultas')
          .select('id, status')
          .eq('user_id', user.id)
          .in('status', [...SATJE_ACTIVE_STATUSES])
          .maybeSingle()
        if (again && (await satjeConsultaMissing(again.id))) {
          await supabase
            .from('satje_consultas')
            .update({ status: 'error', updated_at: new Date().toISOString() })
            .eq('id', again.id)
            .eq('user_id', user.id)
          const retry = await supabase.from('satje_consultas').insert({
            id: created.id,
            user_id: user.id,
            nombre,
            cedula,
            placa: placaNorm,
            ruc,
            status: satjeStoredStatus(String(created.estado)),
          })
          if (!retry.error) {
            return NextResponse.json({
              id: created.id,
              estado: created.estado,
              mensaje: created.mensaje,
              captchaUrl: created.captchaUrl,
              captchaActual: created.captchaActual,
              captchasTotal: created.captchasTotal,
              etapa: created.etapa,
            })
          }
        }
        if (again) {
          return NextResponse.json(
            { error: 'Ya tienes una consulta SATJE en curso', id: again.id, estado: again.status },
            { status: 409 }
          )
        }
      }
      return NextResponse.json({ error: 'No se pudo registrar la consulta' }, { status: 500 })
    }

    return NextResponse.json({
      id: created.id,
      estado: created.estado,
      mensaje: created.mensaje,
      captchaUrl: created.captchaUrl,
      captchaActual: created.captchaActual,
      captchasTotal: created.captchasTotal,
      etapa: created.etapa,
    })
  } catch (error) {
    if (error instanceof SatjeApiError) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus >= 400 ? error.httpStatus : 502 })
    }
    const message = error instanceof Error ? error.message : 'No se pudo crear la consulta SATJE'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
