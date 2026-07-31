import { jsPDF } from "jspdf";

export type ProformaPdfInput = {
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

/** Genera un PDF A4 a partir de los datos guardados en credit_proformas. */
export function buildCreditProformaPdf(row: ProformaPdfInput): ArrayBuffer {
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

  // Cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("DATOS DEL SOLICITANTE", margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const clientLines: Array<[string, string]> = [
    ["Cliente", text(row.client_name)],
    ["Cédula / RUC", text(row.client_id)],
    ["Teléfono", text(row.client_phone)],
    ["Dirección", text(row.client_address)],
  ];
  for (const [label, value] of clientLines) {
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

  const rows: Array<[string, string, boolean?]> = [
    ["Precio del vehículo", money(price)],
    [`Entrada (${pct.toFixed(0)}%)`, `- ${money(entrada)}`],
    ["Saldo a financiar", money(saldo), true],
    ["Plazo", `${row.term_months ?? "—"} meses`],
    ["Tasa de interés mensual", row.interest_rate != null ? `${row.interest_rate}%` : "—"],
    ["Cuota mensual estimada", money(row.monthly_payment), true],
  ];

  doc.setFontSize(10);
  for (const [label, value, emphasize] of rows) {
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
  const note = doc.splitTextToSize(
    "Documento regenerado automáticamente a partir de los datos archivados de la proforma. Valores referenciales sujetos a verificación y aprobación crediticia.",
    pageW - margin * 2
  );
  doc.text(note, margin, y);

  y = doc.internal.pageSize.getHeight() - 16;
  doc.setFontSize(8);
  doc.text(`ID proforma: ${row.id}`, margin, y);

  return doc.output("arraybuffer");
}

export function proformaPdfFileName(row: Pick<ProformaPdfInput, "id" | "client_name">): string {
  const clean = (row.client_name || "cliente").replace(/[^a-zA-Z0-9]/g, "").slice(0, 40) || "cliente";
  return `backfill_${row.id}_${clean}.pdf`;
}
