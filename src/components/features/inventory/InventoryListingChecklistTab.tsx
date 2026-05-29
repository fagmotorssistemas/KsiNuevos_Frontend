"use client";

import {
  CheckCircle2,
  Circle,
  FileText,
  Globe,
  LayoutGrid,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  type ListingChecklist,
  type ListingChecklistKey,
  countListingChecklistDone,
} from "@/types/inventory-listing-checklist";

const ITEMS: {
  key: ListingChecklistKey;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
}[] = [
  {
    key: "patio_tuerca",
    label: "Patio Tuerca",
    description: "Fotos y ficha publicadas en Patio Tuerca",
    icon: Store,
    accent: "border-orange-200 hover:border-orange-300",
    iconBg: "bg-orange-100 text-orange-600",
  },
  {
    key: "marketplace",
    label: "Marketplace",
    description: "Anuncio activo en marketplace / portales",
    icon: LayoutGrid,
    accent: "border-violet-200 hover:border-violet-300",
    iconBg: "bg-violet-100 text-violet-600",
  },
  {
    key: "pagina_web",
    label: "Página web",
    description: "Automático: foto principal o galería cargada",
    icon: Globe,
    accent: "border-blue-200 hover:border-blue-300",
    iconBg: "bg-blue-100 text-blue-600",
  },
  {
    key: "ficha_tecnica",
    label: "Ficha técnica",
    description: "Ficha técnica generada y disponible",
    icon: FileText,
    accent: "border-emerald-200 hover:border-emerald-300",
    iconBg: "bg-emerald-100 text-emerald-600",
  },
];

interface InventoryListingChecklistTabProps {
  checklist: ListingChecklist;
  canEdit: boolean;
  readOnlyKeys?: ListingChecklistKey[];
  onChange: (key: ListingChecklistKey, checked: boolean) => void;
}

export function InventoryListingChecklistTab({
  checklist,
  canEdit,
  readOnlyKeys = [],
  onChange,
}: InventoryListingChecklistTabProps) {
  const done = countListingChecklistDone(checklist);
  const total = ITEMS.length;
  const percent = Math.round((done / total) * 100);

  return (
    <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/40 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Avance de publicación</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Marca cada canal cuando el vehículo ya esté publicado
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-blue-600">
              {done}/{total}
            </span>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">
              completados
            </p>
          </div>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ITEMS.map((item) => {
          const checked = checklist[item.key];
          const Icon = item.icon;
          const readOnly = readOnlyKeys.includes(item.key);
          const itemCanEdit = canEdit && !readOnly;
          return (
            <label
              key={item.key}
              className={`relative flex gap-4 p-4 rounded-xl border-2 transition-all duration-200 ${
                checked
                  ? "bg-emerald-50/80 border-emerald-400 shadow-sm"
                  : `bg-white ${item.accent}`
              } ${itemCanEdit ? "cursor-pointer" : "cursor-default opacity-90"}`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                disabled={!itemCanEdit}
                onChange={(e) => onChange(item.key, e.target.checked)}
              />
              <div
                className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${item.iconBg}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <p className="text-sm font-bold text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{item.description}</p>
              </div>
              <div className="absolute top-4 right-4">
                {checked ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <Circle className="h-6 w-6 text-slate-300" />
                )}
              </div>
            </label>
          );
        })}
      </div>

      {done === total ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>Todos los canales están marcados como publicados.</span>
        </div>
      ) : (
        <p className="text-xs text-slate-400 text-center">
          {canEdit
            ? "Los cambios se guardan al pulsar «Guardar cambios»."
            : "Solo lectura: no tienes permiso para editar este checklist."}
        </p>
      )}
    </div>
  );
}
