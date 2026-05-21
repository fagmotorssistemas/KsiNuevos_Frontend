"use client";

import { useState } from "react";
import {
  Car,
  Clock,
  CreditCard,
  MapPin,
  Phone,
  Pencil,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/buttontable";
import { showroomService } from "@/services/showroom.service";
import type { ShowroomVisit, CreditStatus } from "../constants";
import { getSourceLabel, getCreditLabel } from "../constants";

interface VisitResumenTabProps {
  visit: ShowroomVisit;
  onEdit: () => void;
  onVisitUpdated?: (patch: Partial<ShowroomVisit>) => void;
}

const CREDIT_OPTIONS: { value: CreditStatus; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "aplica", label: "Aplica crédito" },
  { value: "no_aplica", label: "No aplica" },
  { value: "no_interesa", label: "Contado / No interesa" },
];

function formatTime(dateStr: string) {
  return new Intl.DateTimeFormat("es-EC", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateStr));
}

export function VisitResumenTab({ visit, onEdit, onVisitUpdated }: VisitResumenTabProps) {
  const sourceInfo = getSourceLabel(visit.source);
  const creditInfo = getCreditLabel(visit.credit_status);
  const [creditStatus, setCreditStatus] = useState<CreditStatus | null>(visit.credit_status);
  const [isSavingCredit, setIsSavingCredit] = useState(false);

  const handleCreditChange = async (value: CreditStatus) => {
    setCreditStatus(value);
    setIsSavingCredit(true);
    try {
      await showroomService.updateVisitFields(visit.id, { credit_status: value });
      onVisitUpdated?.({ credit_status: value });
    } catch (e) {
      console.error(e);
      setCreditStatus(visit.credit_status);
    } finally {
      setIsSavingCredit(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={onEdit} className="gap-2">
          <Pencil className="h-4 w-4" />
          Editar visita completa
        </Button>
      </div> */}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoBlock icon={Phone} label="Teléfono" value={visit.phone || "—"} />
        <InfoBlock
          icon={Clock}
          label="Horario"
          value={`${formatTime(visit.visit_start)}${visit.visit_end ? ` – ${formatTime(visit.visit_end)}` : " (en curso)"}`}
        />
        <InfoBlock icon={MapPin} label="Origen" value={sourceInfo.label} />
        <InfoBlock
          icon={Car}
          label="Vehículo"
          value={
            visit.inventoryoracle
              ? `${visit.inventoryoracle.brand} ${visit.inventoryoracle.model} '${visit.inventoryoracle.year}`
              : visit.manual_vehicle_description || "No especificado"
          }
        />
      </div>

      <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-800">Estado de crédito</span>
          {isSavingCredit && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
        </div>
        <div className="flex flex-wrap gap-2">
          {CREDIT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={isSavingCredit}
              onClick={() => handleCreditChange(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                creditStatus === opt.value
                  ? creditInfo.color
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <span
          className={`px-3 py-1 rounded-lg border ${visit.test_drive ? "bg-indigo-50 border-indigo-100 text-indigo-700" : "bg-slate-50 border-slate-100 text-slate-500"}`}
        >
          {visit.test_drive ? "Test drive realizado" : "Sin test drive"}
        </span>
        {visit.profiles?.full_name && (
          <span className="px-3 py-1 rounded-lg border bg-slate-50 border-slate-200 text-slate-600">
            Asesor: {visit.profiles.full_name}
          </span>
        )}
      </div>

      {visit.observation && (
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
            <FileText className="h-4 w-4" />
            Observación inicial
          </div>
          <p className="text-sm text-slate-600 italic">{visit.observation}</p>
        </div>
      )}
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 p-3 rounded-xl border border-slate-100 bg-white">
      <Icon className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
