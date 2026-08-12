import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/legal-cases/reports/skips?desde=ISO&hasta=ISO
 * Agrupa saltos por usuario_id y motivo.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const desde = url.searchParams.get("desde");
  const hasta = url.searchParams.get("hasta");
  if (!desde || !hasta) {
    return NextResponse.json(
      { error: "Parámetros desde y hasta son obligatorios" },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data, error } = await (supabase as any)
    .from("case_step_skips")
    .select("usuario_id, motivo")
    .gte("created_at", desde)
    .lte("created_at", hasta);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const key = `${row.usuario_id}::${row.motivo}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const userIds = [...new Set((data ?? []).map((r: any) => r.usuario_id))];
  const actors = new Map<string, { full_name: string | null; role: string | null }>();
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("id", userIds as string[]);
    for (const p of profiles ?? []) {
      actors.set(p.id, { full_name: p.full_name ?? null, role: p.role ?? null });
    }
  }

  const rows = [...counts.entries()].map(([key, total]) => {
    const [usuario_id, motivo] = key.split("::");
    const a = actors.get(usuario_id);
    return {
      usuario_id,
      motivo,
      total,
      full_name: a?.full_name ?? null,
      role: a?.role ?? null,
    };
  });

  return NextResponse.json({ rows });
}
