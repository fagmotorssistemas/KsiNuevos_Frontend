import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildCreditProformaPdf,
  proformaPdfFileName,
  type ProformaPdfInput,
} from "@/lib/financing/generate-proforma-pdf";

const BATCH_SIZE = 25;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const service = getServiceClient();
  if (!service) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor" },
      { status: 500 }
    );
  }

  let body: { limit?: number; ids?: string[] } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const limit = Math.min(Math.max(Number(body.limit) || BATCH_SIZE, 1), 100);

  let query = service
    .from("credit_proformas")
    .select(
      "id, client_name, client_id, client_phone, client_address, vehicle_description, vehicle_price, down_payment_amount, term_months, interest_rate, monthly_payment, created_at, pdf_url"
    )
    .order("created_at", { ascending: false });

  if (body.ids?.length) {
    query = query.in("id", body.ids);
  } else {
    query = query.or("pdf_url.is.null,pdf_url.eq.").limit(limit);
  }

  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const targets = (rows || []).filter((r) => !r.pdf_url) as ProformaPdfInput[];
  const results: Array<{ id: string; ok: boolean; error?: string; pdf_url?: string }> = [];

  for (const row of targets) {
    try {
      const pdfBuffer = buildCreditProformaPdf(row);
      const fileName = proformaPdfFileName(row);
      const bytes = new Uint8Array(pdfBuffer);

      const { error: uploadError } = await service.storage
        .from("proformas")
        .upload(fileName, bytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        results.push({ id: row.id, ok: false, error: uploadError.message });
        continue;
      }

      const {
        data: { publicUrl },
      } = service.storage.from("proformas").getPublicUrl(fileName);

      const { error: updateError } = await service
        .from("credit_proformas")
        .update({ pdf_url: publicUrl })
        .eq("id", row.id);

      if (updateError) {
        results.push({ id: row.id, ok: false, error: updateError.message });
        continue;
      }

      results.push({ id: row.id, ok: true, pdf_url: publicUrl });
    } catch (err) {
      results.push({
        id: row.id,
        ok: false,
        error: err instanceof Error ? err.message : "Error generando PDF",
      });
    }
  }

  const ok = results.filter((r) => r.ok).length;
  const failed = results.length - ok;

  return NextResponse.json({
    processed: results.length,
    ok,
    failed,
    remainingHint:
      !body.ids && targets.length >= limit
        ? "Pueden quedar más; vuelve a ejecutar."
        : null,
    results,
  });
}
