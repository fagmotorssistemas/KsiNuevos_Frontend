"use client";

import { useState } from "react";
import { X, MapPin, ClipboardList, User } from "lucide-react";
import type { ShowroomVisit, ShowroomVisitGestion } from "../constants";
import { getCreditLabel } from "../constants";
import { VisitResumenTab } from "./VisitResumenTab";
import { VisitGestionTab } from "./VisitGestionTab";

interface VisitDetailModalProps {
  visit: ShowroomVisit;
  onClose: () => void;
  onEdit: (visit: ShowroomVisit) => void;
  onVisitUpdated?: () => void;
}

type TabId = "resumen" | "seguimiento";

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? "border-slate-800 text-slate-800 bg-slate-50/50"
          : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        <Icon className={`h-4 w-4 ${active ? "text-slate-800" : "text-slate-400"}`} />
        {label}
      </div>
    </button>
  );
}

export function VisitDetailModal({
  visit,
  onClose,
  onEdit,
  onVisitUpdated,
}: VisitDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("seguimiento");
  const [lastGestion, setLastGestion] = useState<ShowroomVisitGestion | undefined>(
    visit.showroom_visit_gestiones?.[0]
  );

  const creditInfo = getCreditLabel(visit.credit_status);

  const handleGestionAdded = (g: ShowroomVisitGestion) => {
    setLastGestion(g);
    onVisitUpdated?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden ring-1 ring-slate-900/5">
        <div className="shrink-0 flex items-start justify-between p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-12 w-12 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-lg shrink-0">
              {visit.client_name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900 truncate">{visit.client_name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-slate-500">
                {visit.phone && <span>{visit.phone}</span>}
                <span
                  className={`text-xs px-2 py-0.5 rounded-md border font-medium ${creditInfo.color}`}
                >
                  {creditInfo.label}
                </span>
              </div>
              {lastGestion?.profiles?.full_name && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Última gestión por{" "}
                  <span className="font-semibold text-slate-700">
                    {lastGestion.profiles.full_name}
                  </span>
                  <span className="text-slate-400">
                    · {new Date(lastGestion.created_at).toLocaleString("es-EC")}
                  </span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 flex border-b border-slate-100">
          <TabButton
            active={activeTab === "resumen"}
            onClick={() => setActiveTab("resumen")}
            icon={MapPin}
            label="Resumen"
          />
          <TabButton
            active={activeTab === "seguimiento"}
            onClick={() => setActiveTab("seguimiento")}
            icon={ClipboardList}
            label="Seguimiento"
          />
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {activeTab === "resumen" ? (
            <VisitResumenTab
              visit={visit}
              onEdit={() => onEdit(visit)}
              onVisitUpdated={() => onVisitUpdated?.()}
            />
          ) : (
            <VisitGestionTab visit={visit} onGestionAdded={handleGestionAdded} />
          )}
        </div>
      </div>
    </div>
  );
}
