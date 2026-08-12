import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  completedTiposFromEvents,
  getSkippedPreviousSteps,
} from "@/components/features/accounting/wallet/formalStepAccess";
import { inferPoderEspecialFromEvents } from "@/components/features/accounting/wallet/legalGestionCatalogs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string; stepKey: string }> },
) {
  const { id, stepKey } = await ctx.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("rpc_get_case_full", {
    p_case_id: id,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const events = (data as any)?.events ?? [];
  const poder = inferPoderEspecialFromEvents(events);
  const skippedSteps = getSkippedPreviousSteps(
    stepKey,
    completedTiposFromEvents(events),
    poder,
  );

  if (skippedSteps.length === 0) {
    return NextResponse.json({ needsWarning: false });
  }
  return NextResponse.json({ needsWarning: true, skippedSteps });
}
