"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Handshake,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Phone,
  Mail,
  Percent,
  Building2,
} from "lucide-react";
import { SegurosSidebar } from "@/components/layout/seguros-sidebar";
import { brokersService } from "@/services/brokers.service";
import type { Broker, BrokerInsert } from "@/types/brokers.types";
import { toast } from "sonner";

type FormState = Omit<BrokerInsert, "porcentaje_comision"> & {
  porcentaje_comision: number | null;
};
const initialForm: FormState = {
  nombre: "",
  telefono: "",
  email: "",
  empresa: "",
  porcentaje_comision: null,
  activo: true,
};

export default function BrokersPage() {
  const [list, setList] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Broker | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await brokersService.listar();
      setList(data);
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar brokers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const openEdit = (row: Broker) => {
    setEditing(row);
    setForm({
      nombre: row.nombre,
      telefono: row.telefono ?? "",
      email: row.email ?? "",
      empresa: row.empresa ?? "",
      porcentaje_comision: row.porcentaje_comision,
      activo: row.activo ?? true,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(initialForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const payload: BrokerInsert = {
        nombre: form.nombre.trim(),
        telefono: form.telefono?.trim() || null,
        email: form.email?.trim() || null,
        empresa: form.empresa?.trim() || null,
        porcentaje_comision: form.porcentaje_comision != null ? form.porcentaje_comision : null,
        activo: form.activo,
      };
      if (editing) {
        const { data, error } = await brokersService.actualizar(editing.id, payload);
        if (error) throw error;
        toast.success("Broker actualizado");
      } else {
        const { data, error } = await brokersService.crear(payload);
        if (error) throw error;
        toast.success("Broker creado");
      }
      closeModal();
      cargar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el broker "${nombre}"?`)) return;
    try {
      const { error } = await brokersService.eliminar(id);
      if (error) throw error;
      toast.success("Broker eliminado");
      cargar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al eliminar";
      toast.error(msg);
    }
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
                  <Handshake size={26} className="text-emerald-600" />
                  Brokers
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Gestión de brokers, comisiones y datos de contacto para seguros.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200/50"
              >
                <Plus size={18} />
                Nuevo broker
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="py-16 text-center text-slate-400">
                  <Loader2 size={32} className="animate-spin mx-auto mb-3 opacity-60" />
                  <p className="text-sm font-medium">Cargando brokers...</p>
                </div>
              ) : list.length === 0 ? (
                <div className="py-16 text-center bg-slate-50/50">
                  <Handshake size={40} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No hay brokers registrados</p>
                  <p className="text-xs text-slate-400 mt-1">Agrega el primero con el botón superior</p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
                  >
                    <Plus size={16} /> Nuevo broker
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Nombre</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Empresa</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Teléfono</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">% Comisión</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Estado</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right w-24">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((row) => (
                        <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900">{row.nombre}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{row.empresa || "—"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{row.telefono || "—"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[180px]">{row.email || "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-700">
                            {row.porcentaje_comision != null ? `${row.porcentaje_comision}%` : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.activo ? (
                              <span className="inline-flex text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Activo</span>
                            ) : (
                              <span className="inline-flex text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Inactivo</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(row)}
                                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
                                title="Editar"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(row.id, row.nombre)}
                                className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {list.length > 0 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
                  <strong className="text-slate-700">{list.length}</strong> broker{list.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modal formulario */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                {editing ? "Editar broker" : "Nuevo broker"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Building2 size={14} /> Datos del broker
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={form.nombre}
                      onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      placeholder="Ej. TECNISEGUROS"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Empresa</label>
                    <input
                      type="text"
                      value={form.empresa ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, empresa: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Nombre de la empresa"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1"><Phone size={12} /> Teléfono</label>
                    <input
                      type="text"
                      value={form.telefono ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Teléfono"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1"><Mail size={12} /> Email</label>
                    <input
                      type="email"
                      value={form.email ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="correo@broker.com"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1"><Percent size={14} /> % Comisión</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={form.porcentaje_comision ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, porcentaje_comision: e.target.value === "" ? null : Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Ej. 5.00"
                    />
                  </div>
                  <div className="flex items-center pt-8">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.activo}
                        onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Activo</span>
                    </label>
                  </div>
                </div>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {editing ? "Guardar cambios" : "Crear broker"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
