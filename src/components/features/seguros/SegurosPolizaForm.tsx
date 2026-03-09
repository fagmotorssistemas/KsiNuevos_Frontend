"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Loader2,
  Save,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Trash2,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { segurosService, SeguroPayload } from "@/services/seguros.service";
import { aseguradorasService } from "@/services/aseguradoras.service";
import { brokersService } from "@/services/brokers.service";
import type { Aseguradora } from "@/types/aseguradoras.types";
import type { Broker } from "@/types/brokers.types";
import { useInstallationStatus } from "@/hooks/useInstallationStatus";

const PLANES = ["TODO RIESGO (1 AÑO)", "TODO RIESGO (2 AÑO)", "PÉRDIDA TOTAL"];

export interface SegurosPolizaSeleccionado {
  notaId: string;
  ruc: string;
  cliente: string;
  fecha: string;
  precio: number;
}

interface SegurosPolizaFormProps {
  seleccionado: SegurosPolizaSeleccionado;
  onClose: () => void;
  /** Llamado tras guardar correctamente (para cerrar y/o recargar en el padre) */
  onSuccess?: () => void;
  /** Texto del botón volver (ej. "Volver al listado" en dashboard, "Volver a la cartera" en clientes) */
  backLabel?: string;
}

export function SegurosPolizaForm({
  seleccionado,
  onClose,
  onSuccess,
  backLabel = "Volver al listado",
}: SegurosPolizaFormProps) {
  const [formLoading, setFormLoading] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    broker_id: "",
    aseguradora_id: "",
    tipoSeguro: "",
    costo: 0,
  });
  const [archivosNuevos, setArchivosNuevos] = useState<File[]>([]);
  const [evidenciasGuardadas, setEvidenciasGuardadas] = useState<string[]>([]);
  const [aseguradorasList, setAseguradorasList] = useState<Aseguradora[]>([]);
  const [brokersList, setBrokersList] = useState<Broker[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusInstalacion = useInstallationStatus(seleccionado?.fecha);

  useEffect(() => {
    aseguradorasService.listarActivas().then(setAseguradorasList).catch(() => setAseguradorasList([]));
    brokersService.listarActivos().then(setBrokersList).catch(() => setBrokersList([]));
  }, []);

  useEffect(() => {
    setForm({ broker_id: "", aseguradora_id: "", tipoSeguro: "", costo: 0 });
    setArchivosNuevos([]);
    setEvidenciasGuardadas([]);
    setExistingId(null);

    const verificarExistencia = async () => {
      setFormLoading(true);
      try {
        const existente = await segurosService.obtenerPolizaRegistrada(seleccionado.notaId) as any;
        if (existente) {
          setExistingId(existente.id);
          setForm({
            broker_id: existente.broker_id ?? "",
            aseguradora_id: existente.aseguradora_id ?? "",
            tipoSeguro: existente.plan_tipo ?? "",
            costo: existente.costo_compra ?? 0,
          });
          setEvidenciasGuardadas(Array.isArray(existente.evidencias) ? existente.evidencias : []);
        }
      } catch (error) {
        console.error("Error verificando póliza", error);
      } finally {
        setFormLoading(false);
      }
    };
    verificarExistencia();
  }, [seleccionado]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setArchivosNuevos((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };
  const removeNewFile = (idx: number) =>
    setArchivosNuevos((prev) => prev.filter((_, i) => i !== idx));
  const removeSavedEvidence = (idx: number) =>
    setEvidenciasGuardadas((prev) => prev.filter((_, i) => i !== idx));

  const handleGuardar = async () => {
    if (!form.broker_id || !form.aseguradora_id) {
      alert("Complete broker y aseguradora");
      return;
    }

    setFormLoading(true);
    try {
      let urlsFinales = [...evidenciasGuardadas];
      if (archivosNuevos.length > 0) {
        const nuevasUrls = await segurosService.subirEvidencias(archivosNuevos);
        urlsFinales = [...urlsFinales, ...nuevasUrls];
      }

      const payload: SeguroPayload = {
        nota_venta: seleccionado.notaId,
        aseguradora_id: form.aseguradora_id,
        broker_id: form.broker_id,
        plan_tipo: form.tipoSeguro,
        costo_compra: form.costo,
        precio_venta: seleccionado.precio,
        evidencias: urlsFinales,
      };

      let res;
      if (existingId) {
        res = await segurosService.actualizarPoliza(existingId, payload);
      } else {
        res = await segurosService.crearPoliza(payload);
      }

      if (res.success) {
        alert("Póliza guardada correctamente");
        onSuccess?.();
        onClose();
      } else {
        alert("Error al guardar: " + res.error);
      }
    } catch (error) {
      console.error(error);
      alert("Error crítico al guardar");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-in slide-in-from-right-4 duration-300">
      <div className="mb-8">
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-800 flex items-center gap-2 text-xs font-bold uppercase mb-4 transition-colors"
        >
          <ArrowLeft size={14} /> {backLabel}
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase">
              {existingId ? "Editar Póliza" : "Emitir Póliza"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Nota Venta:{" "}
              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded">
                {seleccionado.notaId}
              </span>
            </p>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-transparent ${statusInstalacion.colorClass}`}
          >
            <statusInstalacion.Icon size={16} />
            <span className="text-xs font-bold uppercase">{statusInstalacion.text}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
        {formLoading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-sm">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
          </div>
        )}

        <div className="p-6 md:p-8 space-y-6">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Cliente</p>
              <p className="text-xs font-bold text-slate-900 truncate">{seleccionado.cliente}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase">RUC / CI</p>
              <p className="text-xs font-mono font-bold text-slate-900">{seleccionado.ruc}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Broker
              </label>
              <select
                value={form.broker_id}
                onChange={(e) => setForm({ ...form, broker_id: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all uppercase"
              >
                <option value="">-- Seleccionar --</option>
                {brokersList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Aseguradora
              </label>
              <select
                value={form.aseguradora_id}
                onChange={(e) => setForm({ ...form, aseguradora_id: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all uppercase"
              >
                <option value="">-- Seleccionar --</option>
                {aseguradorasList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Plan
              </label>
              <select
                value={form.tipoSeguro}
                onChange={(e) => setForm({ ...form, tipoSeguro: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-transparent rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all uppercase"
              >
                <option value="">-- Seleccionar --</option>
                {PLANES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase">Costo Póliza (Neto)</span>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200">
              <span className="text-slate-400">$</span>
              <input
                type="number"
                value={form.costo}
                onChange={(e) => setForm({ ...form, costo: parseFloat(e.target.value) || 0 })}
                className="w-24 text-right font-mono font-bold outline-none text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Paperclip size={12} /> Evidencias
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] font-bold text-emerald-600 uppercase hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Agregar
              </button>
            </div>

            {evidenciasGuardadas.map((url, idx) => (
              <div
                key={`old-${idx}`}
                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-1.5 bg-white rounded shadow-sm text-slate-400">
                    <ShieldCheck size={14} />
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-slate-600 truncate hover:text-emerald-600 hover:underline"
                  >
                    Ver Documento #{idx + 1}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => removeSavedEvidence(idx)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {archivosNuevos.map((file, idx) => (
              <div
                key={`new-${idx}`}
                className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-1.5 bg-white rounded shadow-sm text-emerald-600">
                    {file.type.includes("pdf") ? (
                      <FileText size={14} />
                    ) : (
                      <ImageIcon size={14} />
                    )}
                  </div>
                  <span className="text-xs font-bold text-emerald-800 truncate">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeNewFile(idx)}
                  className="text-emerald-400 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="image/*,application/pdf"
              className="hidden"
            />
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={handleGuardar}
            disabled={formLoading}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {formLoading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            {existingId ? "Actualizar Póliza" : "Guardar Póliza"}
          </button>
        </div>
      </div>
    </div>
  );
}
