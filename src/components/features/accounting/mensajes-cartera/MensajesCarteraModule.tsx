"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  MessageSquareOff,
  RefreshCw,
  Search,
  AlertTriangle,
  Users,
  MessageCircle,
  Ban,
  Phone,
  CalendarDays,
} from "lucide-react";
import { carteraMensajesService } from "@/services/carteraMensajes.service";
import type { CarteraClienteMensajeRow } from "@/types/carteraMensajes.types";

type FilterMode = "all" | "enviar" | "excluidos";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  try {
    const value = d.includes("T") ? d : `${d}T12:00:00`;
    return new Date(value).toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function initials(name: string | null) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

export function MensajesCarteraModule() {
  const [rows, setRows] = useState<CarteraClienteMensajeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [reasonDrafts, setReasonDrafts] = useState<Record<number, string>>({});
  const [reasonErrors, setReasonErrors] = useState<Record<number, boolean>>({});
  const reasonInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await carteraMensajesService.list();
      setRows(data);
      const drafts: Record<number, string> = {};
      for (const row of data) {
        drafts[row.id] = row.razon_no_envio ?? "";
      }
      setReasonDrafts(drafts);
      setReasonErrors({});
    } catch (e) {
      console.error(e);
      toast.error(getErrorMessage(e, "No se pudo cargar clientes de cartera"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => {
    const excluidos = rows.filter((r) => r.numero_cambiado);
    const enviar = rows.filter((r) => !r.numero_cambiado);
    return {
      total: rows.length,
      enviar: enviar.length,
      excluidos: excluidos.length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterMode === "enviar" && r.numero_cambiado) return false;
      if (filterMode === "excluidos" && !r.numero_cambiado) return false;
      if (!q) return true;
      const haystack = [r.nombre, r.telefono, r.cliente_id, r.razon_no_envio]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search, filterMode]);

  const applyEnvio = async (
    row: CarteraClienteMensajeRow,
    enviar: boolean,
    razon?: string,
  ) => {
    const numero_cambiado = !enviar;
    const razon_no_envio = numero_cambiado
      ? (razon ?? reasonDrafts[row.id] ?? "").trim()
      : null;

    if (numero_cambiado && !razon_no_envio) {
      setReasonErrors((prev) => ({ ...prev, [row.id]: true }));
      reasonInputRefs.current[row.id]?.focus();
      toast.error("La razón de exclusión es obligatoria");
      return;
    }

    setSavingId(row.id);
    try {
      const updated = await carteraMensajesService.updateEnvio(row.id, {
        numero_cambiado,
        razon_no_envio,
      });
      setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
      setReasonDrafts((prev) => ({
        ...prev,
        [row.id]: updated.razon_no_envio ?? "",
      }));
      setReasonErrors((prev) => ({ ...prev, [row.id]: false }));
      toast.success(
        enviar
          ? "Cliente habilitado para mensajes de cartera"
          : "Cliente excluido de mensajes de cartera",
      );
    } catch (e) {
      console.error(e);
      toast.error(getErrorMessage(e, "No se pudo actualizar el cliente"));
    } finally {
      setSavingId(null);
    }
  };

  const saveReason = async (row: CarteraClienteMensajeRow) => {
    if (!row.numero_cambiado) return;
    const razon = (reasonDrafts[row.id] ?? "").trim();
    if (!razon) {
      setReasonErrors((prev) => ({ ...prev, [row.id]: true }));
      reasonInputRefs.current[row.id]?.focus();
      toast.error("La razón de exclusión es obligatoria");
      return;
    }
    if (razon === (row.razon_no_envio ?? "").trim()) return;
    await applyEnvio(row, false, razon);
  };

  const kpiCards = [
    {
      id: "all" as const,
      label: "Total",
      value: kpis.total,
      sub: "En cobranza automática",
      icon: Users,
      idle: "border-slate-200 bg-white hover:bg-slate-50",
      active: "border-slate-300 bg-slate-50 ring-2 ring-slate-300/70",
      iconWrap: "bg-slate-100 text-slate-600",
      valueClass: "text-slate-900",
    },
    {
      id: "enviar" as const,
      label: "Reciben mensaje",
      value: kpis.enviar,
      sub: "Automatización activa",
      icon: MessageCircle,
      idle: "border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50",
      active: "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200",
      iconWrap: "bg-emerald-100 text-emerald-700",
      valueClass: "text-emerald-800",
    },
    {
      id: "excluidos" as const,
      label: "Excluidos",
      value: kpis.excluidos,
      sub: "Sin envío automático",
      icon: Ban,
      idle: "border-amber-100 bg-amber-50/50 hover:bg-amber-50",
      active: "border-amber-300 bg-amber-50 ring-2 ring-amber-200",
      iconWrap: "bg-amber-100 text-amber-700",
      valueClass: "text-amber-800",
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm shadow-red-200">
              <MessageSquareOff size={18} />
            </span>
            Mensajes de cartera
            {loading && (
              <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
            )}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-500">
            Activa o pausa la cobranza automática. Si la pausas, indica la razón.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const active = filterMode === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setFilterMode(card.id)}
              aria-pressed={active}
              className={`rounded-xl border px-4 py-4 text-left shadow-sm transition-all ${
                active ? card.active : card.idle
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {card.label}
                  </p>
                  <p className={`mt-1 text-3xl font-bold tabular-nums ${card.valueClass}`}>
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
                </div>
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${card.iconWrap}`}
                >
                  <Icon size={18} />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Clientes en cobranza
            </h2>
            <p className="text-xs text-slate-500">
              {filtered.length} de {rows.length} registros
            </p>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nombre, teléfono, ID o razón…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={20} />
            Cargando clientes…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-2 px-4 text-center text-slate-500">
            <AlertTriangle size={22} className="text-amber-500" />
            <p className="text-sm font-medium text-slate-700">
              {rows.length === 0
                ? "No hay clientes en cobranza automática"
                : "Sin resultados para este filtro"}
            </p>
            {rows.length === 0 && (
              <p className="max-w-sm text-xs text-slate-400">
                Si acabas de activar el permiso, cierra sesión y vuelve a entrar,
                o pulsa reintentar.
              </p>
            )}
            {rows.length === 0 && (
              <button
                type="button"
                onClick={load}
                className="mt-1 text-sm font-medium text-red-600 hover:underline"
              >
                Reintentar carga
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Deuda</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Envío</th>
                  <th className="min-w-[240px] px-5 py-3">
                    Razón de exclusión{" "}
                    <span className="normal-case tracking-normal text-red-500">
                      *
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => {
                  const enviar = !row.numero_cambiado;
                  const busy = savingId === row.id;
                  const reasonInvalid = Boolean(reasonErrors[row.id]);
                  const reasonValue = reasonDrafts[row.id] ?? "";
                  const vencimiento = formatDate(row.fecha_vencimiento);

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors hover:bg-slate-50/70 ${
                        row.numero_cambiado ? "bg-amber-50/30" : "bg-white"
                      }`}
                    >
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              row.numero_cambiado
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-900 text-white"
                            }`}
                          >
                            {initials(row.nombre)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {row.nombre || "Sin nombre"}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                              {row.cliente_id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-middle">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Phone size={13} className="shrink-0 text-slate-400" />
                            <span className="text-sm">
                              {row.telefono || "—"}
                            </span>
                          </div>
                          {vencimiento && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <CalendarDays size={12} className="shrink-0" />
                              Vence {vencimiento}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-middle">
                        <span className="font-semibold tabular-nums text-slate-900">
                          {formatMoney(Number(row.deuda) || 0)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex w-fit rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-700">
                            {row.estado || "—"}
                          </span>
                          {row.etapa_cobranza && (
                            <span className="text-[11px] text-slate-400">
                              {row.etapa_cobranza.replaceAll("_", " ")}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-middle">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={enviar}
                          aria-label={
                            enviar
                              ? "Desactivar envío de mensaje"
                              : "Activar envío de mensaje"
                          }
                          disabled={busy}
                          onClick={() => {
                            if (enviar) {
                              const razon = reasonValue.trim();
                              if (!razon) {
                                setReasonErrors((prev) => ({
                                  ...prev,
                                  [row.id]: true,
                                }));
                                reasonInputRefs.current[row.id]?.focus();
                                toast.error(
                                  "La razón de exclusión es obligatoria para desactivar el envío",
                                );
                                return;
                              }
                              void applyEnvio(row, false, razon);
                            } else {
                              void applyEnvio(row, true);
                            }
                          }}
                          className="group flex items-center gap-2.5 disabled:opacity-50"
                        >
                          <span
                            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                              enviar ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                                enviar ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              enviar ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {busy ? "…" : enviar ? "Sí" : "No"}
                          </span>
                        </button>
                      </td>

                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex flex-col gap-1">
                          <input
                            ref={(el) => {
                              reasonInputRefs.current[row.id] = el;
                            }}
                            value={reasonValue}
                            required
                            aria-required="true"
                            aria-invalid={reasonInvalid}
                            onChange={(e) => {
                              const next = e.target.value;
                              setReasonDrafts((prev) => ({
                                ...prev,
                                [row.id]: next,
                              }));
                              if (next.trim()) {
                                setReasonErrors((prev) => ({
                                  ...prev,
                                  [row.id]: false,
                                }));
                              }
                            }}
                            onBlur={() => {
                              if (row.numero_cambiado) void saveReason(row);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && row.numero_cambiado) {
                                e.currentTarget.blur();
                              }
                            }}
                            disabled={busy}
                            placeholder="Número cambiado, contacto sin actualizar…"
                            className={`h-9 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:ring-2 disabled:opacity-50 ${
                              reasonInvalid
                                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                                : "border-slate-200 focus:border-red-300 focus:ring-red-100"
                            }`}
                          />
                          {reasonInvalid ? (
                            <p className="text-[11px] font-medium text-red-600">
                              Obligatorio para excluir
                            </p>
                          ) : row.numero_cambiado && row.razon_no_envio ? (
                            <p className="text-[11px] text-amber-700">
                              Sin cobranza automática
                            </p>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
