"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Building2,
  User,
  Percent,
  MapPin,
  Phone,
  Mail,
  FileText,
} from "lucide-react";
import { SegurosSidebar } from "@/components/layout/seguros-sidebar";
import { aseguradorasService } from "@/services/aseguradoras.service";
import type { Aseguradora, AseguradoraInsert } from "@/types/aseguradoras.types";
import { toast } from "sonner";

type FormState = Omit<AseguradoraInsert, "porcentaje_base_seguro"> & {
  porcentaje_base_seguro: number | null;
};
const initialForm: FormState = {
  nombre: "",
  ruc: "",
  telefono: "",
  email: "",
  direccion: "",
  contacto_nombre: "",
  contacto_telefono: "",
  contacto_email: "",
  porcentaje_base_seguro: null,
  trabaja_con_gps: false,
  activa: true,
  observaciones: "",
};

export default function AseguradorasPage() {
  const [list, setList] = useState<Aseguradora[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Aseguradora | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await aseguradorasService.listar();
      setList(data);
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar aseguradoras");
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

  const openEdit = (row: Aseguradora) => {
    setEditing(row);
    setForm({
      nombre: row.nombre,
      ruc: row.ruc ?? "",
      telefono: row.telefono ?? "",
      email: row.email ?? "",
      direccion: row.direccion ?? "",
      contacto_nombre: row.contacto_nombre ?? "",
      contacto_telefono: row.contacto_telefono ?? "",
      contacto_email: row.contacto_email ?? "",
      porcentaje_base_seguro: row.porcentaje_base_seguro,
      trabaja_con_gps: row.trabaja_con_gps,
      activa: row.activa,
      observaciones: row.observaciones ?? "",
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
      const payload: AseguradoraInsert = {
        nombre: form.nombre.trim(),
        ruc: form.ruc?.trim() || null,
        telefono: form.telefono?.trim() || null,
        email: form.email?.trim() || null,
        direccion: form.direccion?.trim() || null,
        contacto_nombre: form.contacto_nombre?.trim() || null,
        contacto_telefono: form.contacto_telefono?.trim() || null,
        contacto_email: form.contacto_email?.trim() || null,
        porcentaje_base_seguro: form.porcentaje_base_seguro != null ? form.porcentaje_base_seguro : null,
        trabaja_con_gps: form.trabaja_con_gps,
        activa: form.activa,
        observaciones: form.observaciones?.trim() || null,
      };
      if (editing) {
        const { data, error } = await aseguradorasService.actualizar(editing.id, payload);
        if (error) throw error;
        toast.success("Aseguradora actualizada");
      } else {
        const { data, error } = await aseguradorasService.crear(payload);
        if (error) throw error;
        toast.success("Aseguradora creada");
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
    if (!confirm(`¿Eliminar la aseguradora "${nombre}"?`)) return;
    try {
      const { error } = await aseguradorasService.eliminar(id);
      if (error) throw error;
      toast.success("Aseguradora eliminada");
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
                  <Briefcase size={26} className="text-emerald-600" />
                  Aseguradoras
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Gestión de aseguradoras, contactos y porcentaje base para seguros.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200/50"
              >
                <Plus size={18} />
                Nueva aseguradora
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="py-16 text-center text-slate-400">
                  <Loader2 size={32} className="animate-spin mx-auto mb-3 opacity-60" />
                  <p className="text-sm font-medium">Cargando aseguradoras...</p>
                </div>
              ) : list.length === 0 ? (
                <div className="py-16 text-center bg-slate-50/50">
                  <Briefcase size={40} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No hay aseguradoras registradas</p>
                  <p className="text-xs text-slate-400 mt-1">Agrega la primera con el botón superior</p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
                  >
                    <Plus size={16} /> Nueva aseguradora
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Nombre</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">RUC</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Teléfono</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Contacto</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">% Base</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">GPS</th>
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
                          <td className="px-4 py-3 text-sm text-slate-600 font-mono">{row.ruc || "—"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{row.telefono || "—"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {row.contacto_nombre ? (
                              <span className="truncate max-w-[140px] block" title={row.contacto_nombre}>{row.contacto_nombre}</span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-700">
                            {row.porcentaje_base_seguro != null ? `${row.porcentaje_base_seguro}%` : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.trabaja_con_gps ? (
                              <span className="inline-flex text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Sí</span>
                            ) : (
                              <span className="text-slate-400 text-xs">No</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.activa ? (
                              <span className="inline-flex text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Activa</span>
                            ) : (
                              <span className="inline-flex text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Inactiva</span>
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
                  <strong className="text-slate-700">{list.length}</strong> aseguradora{list.length !== 1 ? "s" : ""}
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
                {editing ? "Editar aseguradora" : "Nueva aseguradora"}
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
              {/* Datos generales */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Building2 size={14} /> Datos generales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={form.nombre}
                      onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      placeholder="Ej. MAPFRE"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">RUC</label>
                    <input
                      type="text"
                      value={form.ruc ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, ruc: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="RUC"
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
                      placeholder="correo@aseguradora.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1"><MapPin size={12} /> Dirección</label>
                    <input
                      type="text"
                      value={form.direccion ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Dirección"
                    />
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <User size={14} /> Contacto
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nombre contacto</label>
                    <input
                      type="text"
                      value={form.contacto_nombre ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, contacto_nombre: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Nombre del contacto"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono contacto</label>
                    <input
                      type="text"
                      value={form.contacto_telefono ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, contacto_telefono: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Teléfono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Email contacto</label>
                    <input
                      type="email"
                      value={form.contacto_email ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, contacto_email: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="email@contacto.com"
                    />
                  </div>
                </div>
              </div>

              {/* Configuración */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Percent size={14} /> Configuración
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Porcentaje base seguro (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={form.porcentaje_base_seguro ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, porcentaje_base_seguro: e.target.value === "" ? null : Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Ej. 5.50"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-6 pt-8">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.trabaja_con_gps}
                        onChange={(e) => setForm((f) => ({ ...f, trabaja_con_gps: e.target.checked }))}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Trabaja con GPS</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.activa}
                        onChange={(e) => setForm((f) => ({ ...f, activa: e.target.checked }))}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Activa</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div className="space-y-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={14} /> Observaciones
                </h3>
                <textarea
                  value={form.observaciones ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  placeholder="Notas adicionales"
                />
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
                {editing ? "Guardar cambios" : "Crear aseguradora"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
