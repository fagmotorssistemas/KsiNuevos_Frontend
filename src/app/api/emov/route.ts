import { NextResponse } from 'next/server'
import { requireSatjeAccess } from '@/lib/satje-access'
import { emovRequest } from '@/lib/emov'
import { parseEcuadorPlate } from '@/lib/inventario/normalizePlate'

export const maxDuration = 30

export async function POST(request: Request) {
  const access = await requireSatjeAccess('EMOV')
  if ('response' in access) return access.response
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }
  const raw = body && typeof body === 'object' && 'placa' in body ? body.placa : null
  const placa = typeof raw === 'string' ? parseEcuadorPlate(raw) : null
  if (!placa) return NextResponse.json({ error: 'Escribe una placa válida.' }, { status: 400 })
  return emovRequest('/consultas', access.user.id, { tipo: 'placa_chasis_ramv', valor: placa })
}
