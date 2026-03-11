"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Store,
  Plus,
  Pencil,
  X,
  Loader2,
  User,
  Car,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { SegurosSidebar } from "@/components/layout/seguros-sidebar";
import { segurosPolizasService } from "@/services/seguros-polizas.service";
import { segurosService } from "@/services/seguros.service";
import { aseguradorasService } from "@/services/aseguradoras.service";
import type { SeguroPoliza, SeguroPolizaUpdate } from "@/types/seguros-polizas.types";
import type { Aseguradora } from "@/types/aseguradoras.types";
import type { SeguroVehicular } from "@/types/seguros.types";
import { toast } from "sonner";
import { formatDinero } from "@/utils/format";

const BROKERS = ["TECNISEGUROS", "AON", "NOVA", "ASESORES DE SEGUROS", "DIRECTO"];

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function SegurosVentasPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [list, setList] = useState<SeguroPoliza[]>([]);
  const [comprasDisponibles, setComprasDisponibles] = useState<SeguroPoliza[]>([]);
  const [aseguradoras, setAseguradoras] = useState<Aseguradora[]>([]);
  const [segurosCartera, setSegurosCartera] = useState<SeguroVehicular[]>([]);
  const [datosPorNota, setDatosPorNota] = useState<Map<string, { cliente: string; identificacion: string; vehiculo: string; placa: string }>>(new Map());
  const [notaSeleccionadaModal, setNotaSeleccionadaModal] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<SeguroPoliza | null>(null);
  const [polizaId, setPolizaId] = useState("");
  const [form, setForm] = useState({
    cliente_nombre: "",
    cliente_identificacion: "",
    cliente_telefono: "",
    cliente_email: "",
    vehiculo_descripcion: "",
    vehiculo_placa: "",
    fecha_venta: "",
    precio_venta: 0,
    nota_venta: "",
    broker: "",
    observaciones_venta: "",
  });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [ventas, compras, aseg, cartera] = await Promise.all([
        segurosPolizasService.listarVentas(),
        segurosPolizasService.listarCompras(true),
        aseguradorasService.listarActivas(),
        segurosService.obtenerSeguros(),
      ]);
      setList(ventas);
      setComprasDisponibles(compras);
      setAseguradoras(aseg);
      setSegurosCartera(cartera);
      const map = new Map<string, { cliente: string; identificacion: string; vehiculo: string; placa: string }>();
      cartera.forEach((s) => {
        if (s.referencia) {
          map.set(s.referencia.trim(), {
            cliente: s.cliente?.nombre ?? "",
            identificacion: s.cliente?.identificacion ?? "",
            vehiculo: s.bienAsegurado?.descripcion ?? "",
            placa: s.bienAsegurado?.placa ?? "",
          });
        }
      });
      setDatosPorNota(map);
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar ventas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Abrir modal con nota preseleccionada cuando se llega desde Cartera (Vender a particular)
  useEffect(() => {
    if (loading) return;
    const nota = searchParams.get("nota");
    if (nota?.trim()) {
      setNotaSeleccionadaModal(nota.trim());
      setModalOpen(true);
      router.replace("/seguros/ventas", { scroll: false });
    }
  }, [loading, searchParams, router]);

  // Al seleccionar contrato/nota (misma lista que Cartera), rellenar cliente y vehículo
  useEffect(() => {
    if (editing || !modalOpen || !notaSeleccionadaModal.trim()) return;
    const nota = notaSeleccionadaModal.trim();
    const datos = datosPorNota.get(nota);
    if (datos) {
      setForm((f) => ({
        ...f,
        nota_venta: nota,
        cliente_nombre: datos.cliente,
        cliente_identificacion: datos.identificacion,
        vehiculo_descripcion: datos.vehiculo,
        vehiculo_placa: datos.placa,
      }));
    } else {
      setForm((f) => ({ ...f, nota_venta: nota }));
    }
  }, [notaSeleccionadaModal, modalOpen, datosPorNota, editing]);

  const openCreate = () => {
    setEditing(null);
    setPolizaId("");
    setNotaSeleccionadaModal("");
    setForm({
      cliente_nombre: "",
      cliente_identificacion: "",
      cliente_telefono: "",
      cliente_email: "",
      vehiculo_descripcion: "",
      vehiculo_placa: "",
      fecha_venta: new Date().toISOString().slice(0, 10),
      precio_venta: 0,
      nota_venta: "",
      broker: "",
      observaciones_venta: "",
    });
    setModalOpen(true);
  };

  const openEdit = (row: SeguroPoliza) => {
    setEditing(row);
    setPolizaId(row.id);
    const nota = (row.nota_venta ?? "").trim();
    const datosCartera = nota ? datosPorNota.get(nota) : null;
    setForm({
      cliente_nombre: datosCartera?.cliente ?? row.cliente_nombre ?? "",
      cliente_identificacion: datosCartera?.identificacion ?? row.cliente_identificacion ?? "",
      cliente_telefono: row.cliente_telefono ?? "",
      cliente_email: row.cliente_email ?? "",
      vehiculo_descripcion: datosCartera?.vehiculo ?? row.vehiculo_descripcion ?? "",
      vehiculo_placa: datosCartera?.placa ?? row.vehiculo_placa ?? "",
      fecha_venta: row.fecha_venta ? row.fecha_venta.slice(0, 10) : "",
      precio_venta: row.precio_venta ?? 0,
      nota_venta: row.nota_venta ?? "",
      broker: row.broker ?? "",
      observaciones_venta: row.observaciones_venta ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setPolizaId("");
    setNotaSeleccionadaModal("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editing ? editing.id : polizaId;
    if (!id) {
      toast.error("Selecciona una compra para registrar la venta");
      return;
    }
    if (form.precio_venta <= 0 && !editing) {
      toast.error("Indica el precio de venta al cliente");
      return;
    }
    setSaving(true);
    try {
      const payload: SeguroPolizaUpdate = {
        cliente_nombre: form.cliente_nombre.trim() || null,
        cliente_identificacion: form.cliente_identificacion.trim() || null,
        cliente_telefono: form.cliente_telefono.trim() || null,
        cliente_email: form.cliente_email.trim() || null,
        vehiculo_descripcion: form.vehiculo_descripcion.trim() || null,
        vehiculo_placa: form.vehiculo_placa.trim() || null,
        fecha_venta: form.fecha_venta.trim() || null,
        precio_venta: form.precio_venta,
        nota_venta: form.nota_venta.trim() || null,
        broker: form.broker.trim() || null,
        observaciones_venta: form.observaciones_venta.trim() || null,
        vendido: true,
      };
      const { data, error } = await segurosPolizasService.actualizar(id, payload);
      if (error) throw error;
      toast.success(editing ? "Venta actualizada" : "Venta registrada");
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

  const totalCosto = list.reduce((a, p) => a + (p.costo_compra ?? 0), 0);
  const totalVenta = list.reduce((a, p) => a + (p.precio_venta ?? 0), 0);
  const margenTotal = totalVenta - totalCosto;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SegurosSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Store size={26} className="text-emerald-600" />
                  Reventa de seguros
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Fichas de lo que revendemos al cliente (precio venta, cliente, vehículo).
                </p>
              </div>
              <button
                type="button"
                onClick={openCreate}
                disabled={comprasDisponibles.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
                Registrar venta
              </button>
            </div>

            {comprasDisponibles.length === 0 && !loading && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                No hay compras disponibles para vender. Registra primero una compra en <strong>Compras a aseguradoras</strong>.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase">Total costo compra</p>
                <p className="text-xl font-black text-slate-800 mt-1">{formatDinero(totalCosto)}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase">Total precio venta</p>
                <p className="text-xl font-black text-emerald-600 mt-1">{formatDinero(totalVenta)}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase">Margen</p>
                <p className="text-xl font-black text-slate-800 mt-1">{formatDinero(margenTotal)}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="py-16 text-center text-slate-400">
                  <Loader2 size={32} className="animate-spin mx-auto mb-3 opacity-60" />
                  <p className="text-sm font-medium">Cargando ventas...</p>
                </div>
              ) : list.length === 0 ? (
                <div className="py-16 text-center bg-slate-50/50">
                  <Store size={40} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No hay ventas registradas</p>
                  <p className="text-xs text-slate-400 mt-1">Registra una venta desde una compra disponible</p>
                  <button type="button" onClick={openCreate} disabled={comprasDisponibles.length === 0} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
                    <Plus size={16} /> Registrar venta
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          Cliente / Nota
                        </th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          Vehículo
                        </th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Fecha venta</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Costo</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Precio venta</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Margen</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right w-20">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((row) => {
                        const margen = (row.precio_venta ?? 0) - (row.costo_compra ?? 0);
                        const nota = (row.nota_venta ?? "").trim();
                        const datosCartera = nota ? datosPorNota.get(nota) : null;
                        const clienteDisplay = datosCartera?.cliente || row.cliente_nombre || "—";
                        const vehiculoDisplay = datosCartera?.vehiculo || row.vehiculo_descripcion || "—";
                        const placaDisplay = datosCartera?.placa || row.vehiculo_placa || "—";
                        return (
                          <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-900 text-sm truncate max-w-[180px]">
                                  {clienteDisplay}
                                </span>
                                <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                                  <FileText size={10} />
                                  {row.nota_venta || "—"}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-0.5 text-sm">
                                <span className="font-semibold text-slate-800">{vehiculoDisplay}</span>
                                <span className="text-xs text-slate-500 font-mono">{placaDisplay}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{formatDate(row.fecha_venta)}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{formatDinero(row.costo_compra ?? 0)}</td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatDinero(row.precio_venta ?? 0)}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800">{formatDinero(margen)}</td>
                            <td className="px-4 py-3 text-right">
                              <button type="button" onClick={() => openEdit(row)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-600" title="Editar">
                                <Pencil size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {list.length > 0 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                  <span><strong className="text-slate-700">{list.length}</strong> venta{list.length !== 1 ? "s" : ""}</span>
                  <span>Margen total: <strong className="text-emerald-600">{formatDinero(margenTotal)}</strong></span>
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
                {editing ? "Editar venta" : "Registrar venta (reventa al cliente)"}
              </h2>
              <button type="button" onClick={closeModal} className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {!editing && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Compra a vender</label>
                    <select value={polizaId} onChange={(e) => setPolizaId(e.target.value)} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none">
                      <option value="">— Seleccionar compra disponible —</option>
                      {comprasDisponibles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.referencia || p.numero_certificado || p.id.slice(0, 8)} — {formatDinero(p.costo_compra)} — {p.plan_tipo || "Sin plan"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Contrato / Nota de venta (igual que en Cartera)</label>
                    <select value={notaSeleccionadaModal} onChange={(e) => setNotaSeleccionadaModal(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none">
                      <option value="">— Seleccionar contrato para llenar cliente y vehículo —</option>
                      {segurosCartera.map((s) => (
                        <option key={s.id} value={s.referencia}>
                          {s.referencia} — {s.cliente?.nombre ?? "Sin nombre"}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1"><User size={12} /> Cliente</label>
                <input type="text" value={form.cliente_nombre} readOnly className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 bg-slate-50 cursor-not-allowed" placeholder="Nombre completo (se llena al elegir compra)" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">RUC / CI</label>
                  <input type="text" value={form.cliente_identificacion} readOnly className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-mono bg-slate-50 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono</label>
                  <input type="text" value={form.cliente_telefono} readOnly className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 bg-slate-50 cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1"><Car size={12} /> Vehículo</label>
                <input type="text" value={form.vehiculo_descripcion} readOnly className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 bg-slate-50 cursor-not-allowed mb-2" placeholder="Marca, modelo (se llena al elegir compra)" />
                <input type="text" value={form.vehiculo_placa} readOnly className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-mono bg-slate-50 cursor-not-allowed" placeholder="Placa" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Fecha venta</label>
                  <input type="date" value={form.fecha_venta} onChange={(e) => setForm((f) => ({ ...f, fecha_venta: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1"><DollarSign size={12} /> Precio venta al cliente</label>
                  <input type="number" step="0.01" min="0" value={form.precio_venta || ""} onChange={(e) => setForm((f) => ({ ...f, precio_venta: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0.00" required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1"><FileText size={12} /> Nota de venta</label>
                  <input type="text" value={form.nota_venta} onChange={(e) => setForm((f) => ({ ...f, nota_venta: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="NV-001-..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Broker</label>
                  <select value={form.broker} onChange={(e) => setForm((f) => ({ ...f, broker: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="">—</option>
                    {BROKERS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Observaciones venta</label>
                <textarea value={form.observaciones_venta} onChange={(e) => setForm((f) => ({ ...f, observaciones_venta: e.target.value }))} rows={2} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
              </div>
            </form>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-100">Cancelar</button>
              <button type="submit" onClick={handleSubmit} disabled={saving} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {editing ? "Guardar cambios" : "Registrar venta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SegurosVentasPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-slate-50">
        <SegurosSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
        </div>
      </div>
    }>
      <SegurosVentasPageContent />
    </Suspense>
  );
}
