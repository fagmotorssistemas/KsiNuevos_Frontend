/**
 * One-shot: genera PDF para credit_proformas sin pdf_url y los sube a Storage.
 * Uso: npx tsx scripts/backfill-proforma-pdfs.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { jsPDF } from "jspdf";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

type Row = {
  id: string;
  client_name: string;
  client_id: string | null;
  client_phone: string | null;
  client_address: string | null;
  vehicle_description: string | null;
  vehicle_price: number | null;
  down_payment_amount: number | null;
  term_months: number | null;
  interest_rate: number | null;
  monthly_payment: number | null;
  created_at: string | null;
};

function money(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function text(value: string | null | undefined, fallback = "—"): string {
  const v = (value ?? "").trim();
  return v || fallback;
}

function buildPdf(row: Row): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = 22;

  const price = Number(row.vehicle_price ?? 0);
  const entrada = Number(row.down_payment_amount ?? 0);
  const saldo = Math.max(price - entrada, 0);
  const pct = price > 0 ? (entrada / price) * 100 : 0;
  const emitted = row.created_at
    ? new Date(row.created_at).toLocaleDateString("es-EC", { dateStyle: "long" })
    : new Date().toLocaleDateString("es-EC", { dateStyle: "long" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text("PROFORMA DE FINANCIAMIENTO", margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Ksi-Nuevos | Financiamiento Directo", margin, y);
  doc.text(`Fecha: ${emitted}`, pageW - margin, y, { align: "right" });
  y += 6;

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("DATOS DEL SOLICITANTE", margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const [label, value] of [
    ["Cliente", text(row.client_name)],
    ["Cédula / RUC", text(row.client_id)],
    ["Teléfono", text(row.client_phone)],
    ["Dirección", text(row.client_address)],
  ] as const) {
    doc.setTextColor(100, 116, 139);
    doc.text(label, margin, y);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(value, margin + 40, y);
    doc.setFont("helvetica", "normal");
    y += 6;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("VEHÍCULO DE INTERÉS", margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Descripción", margin, y);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  const vehicleLines = doc.splitTextToSize(
    text(row.vehicle_description, "Vehículo no especificado").toUpperCase(),
    pageW - margin * 2 - 40
  );
  doc.text(vehicleLines, margin + 40, y);
  y += Math.max(6, vehicleLines.length * 5) + 4;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("DETALLE FINANCIERO", margin, y);
  y += 8;

  doc.setFontSize(10);
  for (const [label, value, emphasize] of [
    ["Precio del vehículo", money(price), false],
    [`Entrada (${pct.toFixed(0)}%)`, `- ${money(entrada)}`, false],
    ["Saldo a financiar", money(saldo), true],
    ["Plazo", `${row.term_months ?? "—"} meses`, false],
    [
      "Tasa de interés mensual",
      row.interest_rate != null ? `${row.interest_rate}%` : "—",
      false,
    ],
    ["Cuota mensual estimada", money(row.monthly_payment), true],
  ] as const) {
    doc.setFont("helvetica", emphasize ? "bold" : "normal");
    doc.setTextColor(emphasize ? 15 : 71, emphasize ? 23 : 85, emphasize ? 42 : 105);
    doc.text(label, margin, y);
    doc.text(value, pageW - margin, y, { align: "right" });
    y += 7;
  }

  y += 10;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    doc.splitTextToSize(
      "Documento regenerado automáticamente a partir de los datos archivados de la proforma. Valores referenciales sujetos a verificación y aprobación crediticia.",
      pageW - margin * 2
    ),
    margin,
    y
  );

  y = doc.internal.pageSize.getHeight() - 16;
  doc.setFontSize(8);
  doc.text(`ID proforma: ${row.id}`, margin, y);

  return Buffer.from(doc.output("arraybuffer"));
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await supabase
    .from("credit_proformas")
    .select(
      "id, client_name, client_id, client_phone, client_address, vehicle_description, vehicle_price, down_payment_amount, term_months, interest_rate, monthly_payment, created_at, pdf_url"
    )
    .or("pdf_url.is.null,pdf_url.eq.")
    .order("created_at", { ascending: true });

  if (error) throw error;

  const targets = (rows || []).filter((r) => !r.pdf_url) as Row[];
  console.log(`Proformas sin PDF: ${targets.length}`);

  let ok = 0;
  let failed = 0;

  for (const row of targets) {
    try {
      const pdf = buildPdf(row);
      const clean =
        (row.client_name || "cliente").replace(/[^a-zA-Z0-9]/g, "").slice(0, 40) ||
        "cliente";
      const fileName = `backfill_${row.id}_${clean}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("proformas")
        .upload(fileName, pdf, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("proformas").getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("credit_proformas")
        .update({ pdf_url: publicUrl })
        .eq("id", row.id);
      if (updateError) throw updateError;

      ok++;
      if (ok % 20 === 0 || ok === targets.length) {
        console.log(`OK ${ok}/${targets.length}`);
      }
    } catch (err) {
      failed++;
      console.error(`FAIL ${row.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`Listo. ok=${ok} failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
