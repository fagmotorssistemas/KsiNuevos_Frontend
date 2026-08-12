import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  SKIP_MOTIVOS,
  type SkipMotivo,
} from "@/components/features/accounting/wallet/formalStepAccess";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; stepKey: string }> },
) {
  const { id, stepKey } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const motivo = String(body?.motivo || "") as SkipMotivo;
  const detalle_texto =
    body?.detalle_texto != null ? String(body.detalle_texto) : null;
  const skippedSteps: string[] = Array.isArray(body?.skippedSteps)
    ? body.skippedSteps.map(String)
    : [];

  if (!SKIP_MOTIVOS.includes(motivo)) {
    return NextResponse.json({ error: "Motivo inválido" }, { status: 400 });
  }
  if (motivo === "otro" && !String(detalle_texto || "").trim()) {
    return NextResponse.json(
      { error: "detalle_texto obligatorio si motivo=otro" },
      { status: 400 },
    );
  }
  if (!skippedSteps.length) {
    return NextResponse.json(
      { error: "skippedSteps vacío" },
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

  const rows = skippedSteps.map((step_saltado) => ({
    case_id: id,
    step_saltado,
    step_ejecutado: stepKey,
    motivo,
    detalle_texto:
      motivo === "otro"
        ? String(detalle_texto).trim()
        : detalle_texto?.trim() || null,
    usuario_id: user.id,
  }));

  const { error } = await (supabase as any).from("case_step_skips").insert(rows);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
