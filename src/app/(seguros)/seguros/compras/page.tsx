"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  Plus,
  Pencil,
  X,
  Loader2,
  Building2,
  FileText,
  Calendar,
  DollarSign,
  Tag,
} from "lucide-react";
import { SegurosSidebar } from "@/components/layout/seguros-sidebar";
import { segurosPolizasService } from "@/services/seguros-polizas.service";
import { aseguradorasService } from "@/services/aseguradoras.service";
import type { SeguroPoliza, SeguroPolizaInsert } from "@/types/seguros-polizas.types";
import type { Aseguradora } from "@/types/aseguradoras.types";
import { toast } from "sonner";
import { formatDinero } from "@/utils/format";

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function SegurosComprasPage() {
  const [list, setList] = useState<SeguroPoliza[]>([]);
  const [aseguradoras, setAseguradoras] = useState<Aseguradora[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<SeguroPoliza | null>(null);
  const [soloNoVendidas, setSoloNoVendidas] = useState(false);
  const [form, setForm] = useState({
    referencia: "",
    numero_certificado: "",
    aseguradora_id: "",
    fecha_compra: "",
    costo_compra: 0,
    factura_aseguradora: "",
    vigencia_desde: "",
    vigencia_hasta: "",
    plan_tipo: "",
    observaciones_compra: "",
  });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [polizas, aseg] = await Promise.all([
        segurosPolizasService.listarCompras(soloNoVendidas),
        aseguradorasService.listarActivas(),
      ]);
      setList(polizas);
      setAseguradoras(aseg);
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar compras");
    } finally {
      setLoading(false);
    }
  }, [soloNoVendidas]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      referencia: "",
      numero_certificado: "",
      aseguradora_id: "",
      fecha_compra: "",
      costo_compra: 0,
      factura_aseguradora: "",
      vigencia_desde: "",
      vigencia_hasta: "",
      plan_tipo: "",
      observaciones_compra: "",
    });
    setModalOpen(true);
  };

  const openEdit = (row: SeguroPoliza) => {
    setEditing(row);
    setForm({
      referencia: row.referencia ?? "",
      numero_certificado: row.numero_certificado ?? "",
      aseguradora_id: row.aseguradora_id ?? "",
      fecha_compra: row.fecha_compra ? row.fecha_compra.slice(0, 10) : "",
      costo_compra: row.costo_compra ?? 0,
      factura_aseguradora: row.factura_aseguradora ?? "",
      vigencia_desde: row.vigencia_desde ? row.vigencia_desde.slice(0, 10) : "",
      vigencia_hasta: row.vigencia_hasta ? row.vigencia_hasta.slice(0, 10) : "",
      plan_tipo: row.plan_tipo ?? "",
      observaciones_compra: row.observaciones_compra ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: SeguroPolizaInsert = {
        referencia: form.referencia.trim() || null,
        numero_certificado: form.numero_certificado.trim() || null,
        aseguradora_id: form.aseguradora_id.trim() || null,
        fecha_compra: form.fecha_compra.trim() || null,
        costo_compra: form.costo_compra,
        factura_aseguradora: form.factura_aseguradora.trim() || null,
        vigencia_desde: form.vigencia_desde.trim() || null,
        vigencia_hasta: form.vigencia_hasta.trim() || null,
        plan_tipo: form.plan_tipo.trim() || null,
        observaciones_compra: form.observaciones_compra.trim() || null,
        precio_venta: 0,
        vendido: false,
      };
      if (editing) {
        const { data, error } = await segurosPolizasService.actualizar(editing.id, payload);
        if (error) throw error;
        toast.success("Compra actualizada");
      } else {
        const { data, error } = await segurosPolizasService.crear(payload);
        if (error) throw error;
        toast.success("Compra registrada");
      }
      closeModal();
      cargar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const getAseguradoraNombre = (id: string | null) => {
    if (!id) return "—";
    return aseguradoras.find((a) => a.id === id)?.nombre ?? id.slice(0, 8);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SegurosSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <ShoppingCart size={26} className="text-emerald-600" />
                  Compras a aseguradoras
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Fichas de lo que compramos a la aseguradora (costo, certificado, vigencia).
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={soloNoVendidas}
                    onChange={(e) => setSoloNoVendidas(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                  Solo no vendidas
                </label>
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm"
                >
                  <Plus size={18} />
                  Nueva compra
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="py-16 text-center text-slate-400">
                  <Loader2 size={32} className="animate-spin mx-auto mb-3 opacity-60" />
                  <p className="text-sm font-medium">Cargando compras...</p>
                </div>
              ) : list.length === 0 ? (
                <div className="py-16 text-center bg-slate-50/50">
                  <ShoppingCart size={40} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No hay compras registradas</p>
                  <p className="text-xs text-slate-400 mt-1">Registra la primera ficha de compra a una aseguradora</p>
                  <button type="button" onClick={openCreate} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700">
                    <Plus size={16} /> Nueva compra
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Ref / Certificado</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Aseguradora</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Fecha compra</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Costo</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Vigencia</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Plan</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Estado</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right w-20">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((row) => (
                        <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-mono text-sm text-slate-800">{row.referencia || row.numero_certificado || "—"}</div>
                            {row.numero_certificado && row.referencia && (
                              <div className="text-xs text-slate-500">{row.numero_certificado}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">{getAseguradoraNombre(row.aseguradora_id)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{formatDate(row.fecha_compra)}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatDinero(row.costo_compra)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {row.vigencia_desde || row.vigencia_hasta ? (
                              <span>{formatDate(row.vigencia_desde)} → {formatDate(row.vigencia_hasta)}</span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{row.plan_tipo || "—"}</td>
                          <td className="px-4 py-3 text-center">
                            {row.vendido ? (
                              <span className="inline-flex text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Vendido</span>
                            ) : (
                              <span className="inline-flex text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Disponible</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => openEdit(row)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-600" title="Editar">
                              <Pencil size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {list.length > 0 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
                  <strong className="text-slate-700">{list.length}</strong> registro{list.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                {editing ? "Editar compra" : "Nueva compra a aseguradora"}
              </h2>
              <button type="button" onClick={closeModal} className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Referencia interna</label>
                  <input type="text" value={form.referencia} onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Ej. ORD-001" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nº Certificado</label>
                  <input type="text" value={form.numero_certificado} onChange={(e) => setForm((f) => ({ ...f, numero_certificado: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Nº certificado" />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1"><Building2 size={12} /> Aseguradora</label>
                <select value={form.aseguradora_id} onChange={(e) => setForm((f) => ({ ...f, aseguradora_id: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="">— Seleccionar —</option>
                  {aseguradoras.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Fecha compra</label>
                  <input type="date" value={form.fecha_compra} onChange={(e) => setForm((f) => ({ ...f, fecha_compra: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1"><DollarSign size={12} /> Costo compra</label>
                  <input type="number" step="0.01" min="0" value={form.costo_compra || ""} onChange={(e) => setForm((f) => ({ ...f, costo_compra: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0.00" required />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1"><FileText size={12} /> Factura aseguradora</label>
                <input type="text" value={form.factura_aseguradora} onChange={(e) => setForm((f) => ({ ...f, factura_aseguradora: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Nº factura" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Vigencia desde</label>
                  <input type="date" value={form.vigencia_desde} onChange={(e) => setForm((f) => ({ ...f, vigencia_desde: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Vigencia hasta</label>
                  <input type="date" value={form.vigencia_hasta} onChange={(e) => setForm((f) => ({ ...f, vigencia_hasta: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1"><Tag size={12} /> Plan / tipo</label>
                <input type="text" value={form.plan_tipo} onChange={(e) => setForm((f) => ({ ...f, plan_tipo: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Ej. Todo riesgo 1 año" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Observaciones compra</label>
                <textarea value={form.observaciones_compra} onChange={(e) => setForm((f) => ({ ...f, observaciones_compra: e.target.value }))} rows={2} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" placeholder="Notas" />
              </div>
            </form>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-100">Cancelar</button>
              <button type="submit" onClick={handleSubmit} disabled={saving} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {editing ? "Guardar cambios" : "Registrar compra"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
