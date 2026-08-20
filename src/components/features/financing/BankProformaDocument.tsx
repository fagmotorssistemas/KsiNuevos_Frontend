"use client";

import type { InventoryCarRow } from "@/components/features/financing/FinancingUtils";

export const BANK_PROFORMA_COMPANY = {
  legalName: "FagMotors · KSI Nuevos",
  address: "Av. España 6-73 y Sevilla",
  city: "Cuenca",
  phone: "+593 98 333 5555",
} as const;

export type BankProformaClient = {
  name: string;
  idNumber: string;
  phone: string;
  address: string;
};

export type BankProformaAdvisor = {
  name: string;
  title: string;
  phone: string;
};

const ADVISOR_TITLE_BY_ROLE: Record<string, string> = {
  vendedor: "Asesor comercial",
  admin: "Jefe comercial",
  finanzas: "Asesor financiero",
  contable: "Contable",
  marketing: "Marketing",
  abogado: "Asesor legal",
  abogada: "Asesora legal",
  taller: "Taller",
};

function advisorTitleFromRole(role: string | null | undefined): string {
  const key = (role ?? "").toLowerCase().trim();
  if (!key) return "Asesor comercial";
  return ADVISOR_TITLE_BY_ROLE[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

function formatAdvisorPhone(phone: string | null | undefined): string {
  const raw = (phone ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return raw;
}

/** Firma del pie: datos del usuario en sesión (profiles). */
export function advisorFromProfile(
  profile: { full_name?: string | null; phone?: string | null; role?: string | null } | null
): BankProformaAdvisor {
  return {
    name: (profile?.full_name ?? "").trim() || "ASESOR",
    title: advisorTitleFromRole(profile?.role),
    phone: formatAdvisorPhone(profile?.phone),
  };
}

type BankProformaDocumentProps = {
  dateLabel: string;
  client: BankProformaClient;
  vehicle: InventoryCarRow | null;
  price: number;
  photoUrl: string | null;
  advisor: BankProformaAdvisor;
  addressedTo?: string;
  optionalNote?: string;
};

function formatPrice(value: number) {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  return `$${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(safe)}`;
}

function formatMileage(km: number | null | undefined) {
  const n = Number.isFinite(Number(km)) ? Math.round(Number(km)) : 0;
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(n)}Kilómetros`;
}

function formatDisplacement(raw: string | null | undefined) {
  const v = (raw ?? "").trim();
  if (!v) return "";
  if (/cc|cm\s?3|lts?|litros?/i.test(v)) return v;
  return `${v} cc`;
}

function dash(value: string | null | undefined) {
  const v = (value ?? "").trim();
  return v || "";
}

export function buildVehicleTitle(vehicle: InventoryCarRow | null) {
  if (!vehicle) return "";
  return `${vehicle.brand || ""} ${vehicle.model || ""}`.trim().toUpperCase();
}

export function buildVehicleSubtitle(vehicle: InventoryCarRow | null) {
  if (!vehicle) return "";
  return [vehicle.version, vehicle.year].filter(Boolean).join(" ").toUpperCase();
}

export function buildVehicleConcept(vehicle: InventoryCarRow | null) {
  if (!vehicle) return "";
  return [
    vehicle.brand,
    vehicle.model,
    vehicle.version,
    vehicle.fuel_type,
    vehicle.year,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

function DataRow({
  label,
  value,
  large = false,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-x-2 items-baseline leading-snug">
      <span className="text-[12px] text-gray-900">{label}</span>
      <span
        className={`text-gray-900 min-h-[1.25rem] ${
          large ? "text-[18px] font-bold leading-tight" : "text-[13px] font-medium"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function BankProformaDocument({
  dateLabel,
  client,
  vehicle,
  price,
  photoUrl,
  advisor,
  addressedTo = "",
  optionalNote = "",
}: BankProformaDocumentProps) {
  const title = buildVehicleTitle(vehicle);
  const subtitle = buildVehicleSubtitle(vehicle);
  const concept = buildVehicleConcept(vehicle);
  const fuel = dash(vehicle?.fuel_type).toUpperCase();
  const mileage = formatMileage(vehicle?.mileage);
  const displacement = formatDisplacement(vehicle?.engine_displacement);
  const color = dash(vehicle?.color).toUpperCase();
  const vehicleType = dash(vehicle?.type_body || vehicle?.type).toUpperCase();
  const originCountry = dash(vehicle?.country_origin).toUpperCase();
  const heading = addressedTo.trim();
  const note = optionalNote.trim();

  return (
    <article className="bank-proforma-sheet relative bg-white text-gray-900 overflow-hidden font-sans w-[210mm] min-h-[297mm]">
      <svg
        className="absolute top-0 right-0 w-[58%] h-28 text-red-50 pointer-events-none"
        viewBox="0 0 520 120"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path fill="currentColor" d="M40,120 C160,18 300,8 520,48 L520,0 L0,0 L0,88 C10,110 22,120 40,120 Z" />
      </svg>

      <div className="relative z-10 px-[14mm] pt-[12mm] pb-[22mm] min-h-[297mm] flex flex-col">
        <header className="flex items-start justify-between gap-6 mb-8">
          <p className="text-[13px] pt-1 text-gray-900">
            <span className="font-semibold">Fecha:</span> {dateLabel}
          </p>
          <div className="pt-1">
            <img
              src="/logol.png"
              alt="KSI Nuevos"
              className="ml-auto object-contain w-[200px] h-[48px]"
            />
          </div>
        </header>

        {heading || note ? (
          <div className="mb-4">
            {heading ? (
              <h2 className="text-[20px] font-bold text-gray-900 leading-snug whitespace-pre-wrap">
                {heading}
              </h2>
            ) : null}
            {note ? (
              <p className={`text-[13px] font-normal text-gray-900 whitespace-pre-wrap leading-snug ${heading ? "mt-1" : ""}`}>
                {note}
              </p>
            ) : null}
          </div>
        ) : null}

        <section className="grid grid-cols-2 gap-10 mb-8">
          <div>
            <h2 className="text-[13px] font-bold tracking-wide mb-2 text-gray-900">DATOS DEL CLIENTE</h2>
            <div className="space-y-0.5">
              <DataRow label="Nombre" value={dash(client.name)} large />
              <DataRow label="Cedula" value={dash(client.idNumber)} />
              <DataRow label="Teléfono" value={dash(client.phone)} />
              <DataRow label="Dirección" value={dash(client.address)} />
            </div>
          </div>
          <div>
            <h2 className="text-[13px] font-bold tracking-wide mb-2 text-gray-900">DATOS DE LA EMPRESA</h2>
            <div className="space-y-0.5">
              <DataRow label="Nombre" value={BANK_PROFORMA_COMPANY.legalName} />
              <DataRow label="Dirección" value={BANK_PROFORMA_COMPANY.address} />
              <DataRow label="Ciudad" value={BANK_PROFORMA_COMPANY.city} />
              <DataRow label="Teléfono" value={BANK_PROFORMA_COMPANY.phone} />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-[1.15fr_1fr] gap-6 items-start mb-8">
          <div className="bg-white">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={title || "Vehículo"}
                className="w-full h-[200px] object-cover object-center"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-[200px] bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 text-sm">
                Seleccione un vehículo
              </div>
            )}
          </div>
          <div className="pt-4">
            <h3 className="text-[26px] font-extrabold leading-tight tracking-tight uppercase text-gray-900">
              {title || ""}
            </h3>
            {subtitle ? (
              <p className="text-[15px] font-bold mt-1 leading-snug uppercase text-gray-900">{subtitle}</p>
            ) : null}
            {fuel ? <p className="text-[14px] mt-1 uppercase text-gray-900">{fuel}</p> : null}
            <p className="text-[14px] mt-0.5 text-gray-900">{vehicle ? mileage : ""}</p>
            {displacement ? (
              <p className="text-[14px] mt-0.5 text-gray-900">{displacement}</p>
            ) : null}
            {color ? <p className="text-[14px] mt-0.5 text-gray-900">{color}</p> : null}
            {vehicleType ? <p className="text-[14px] mt-0.5 text-gray-900">{vehicleType}</p> : null}
            {originCountry ? <p className="text-[14px] mt-0.5 text-gray-900">{originCountry}</p> : null}
          </div>
        </section>

        <section className="mb-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="text-left font-semibold py-2 px-3 w-[52%]">Concepto</th>
                <th className="text-center font-semibold py-2 px-3 w-[12%]">Cantidad</th>
                <th className="text-right font-semibold py-2 px-3 w-[18%]">Precio</th>
                <th className="text-right font-semibold py-2 px-3 w-[18%]">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3 px-3 align-top uppercase text-gray-900">{concept}</td>
                <td className="py-3 px-3 text-center align-top text-gray-900">1</td>
                <td className="py-3 px-3 text-right align-top text-gray-900">{formatPrice(price)}</td>
                <td className="py-3 px-3 text-right align-top text-gray-900">{formatPrice(price)}</td>
              </tr>
            </tbody>
          </table>
          <div className="h-px bg-red-600 mt-8" />
        </section>

        <footer className="mt-10 flex justify-center pb-4">
          <div className="w-[300px] text-center">
            <p className="text-[16px] font-extrabold uppercase tracking-wide text-gray-900">
              {advisor.name || "ASESOR"}
            </p>
            {advisor.title ? (
              <p className="text-[14px] font-medium text-gray-900 mt-0.5">{advisor.title}</p>
            ) : null}
            <p className="text-[14px] font-medium text-red-600 mt-0.5">{advisor.phone || ""}</p>
          </div>
        </footer>
      </div>

      <svg
        className="absolute bottom-0 left-0 w-full h-[52px] text-red-600 pointer-events-none"
        viewBox="0 0 800 80"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="currentColor"
          d="M0,38 C90,8 160,62 260,28 C360,-4 430,58 530,30 C630,4 720,48 800,22 L800,80 L0,80 Z"
        />
      </svg>
    </article>
  );
}
