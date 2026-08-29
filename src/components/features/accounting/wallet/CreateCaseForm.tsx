"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  FileText,
  CalendarClock,
  FileUp,
  Image as ImageIcon,
  ExternalLink,
  X,
  ChevronDown,
  Check,
} from "lucide-react";
import { legalCasesService } from "@/services/legalCases.service";
import { ecuadorDatetimeLocalFromNow, ecuadorDatetimeLocalToIso } from "@/lib/ecuador-datetime";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

type SoftOption = { value: string; label: string; disabled?: boolean };

function SoftSelect({
  value,
  onChange,
  options,
  placeholder = "Selecciona…",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SoftOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div ref={rootRef} className={`relative mt-1.5 ${open ? "z-[60]" : "z-10"}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`w-full h-11 px-4 rounded-xl border text-sm text-left outline-none flex items-center justify-between gap-2 transition ${
          disabled
            ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
            : open
              ? "bg-white border-slate-400 ring-4 ring-slate-100"
              : "bg-white border-slate-200 hover:border-slate-300"
        }`}
      >
        <span
          className={`truncate ${
            selected && selected.value !== ""
              ? "text-slate-800 font-medium"
              : "text-slate-400"
          }`}
        >
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute z-[100] left-0 right-0 top-[calc(100%+6px)] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <ul className="max-h-56 overflow-y-auto py-1.5" role="listbox">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value || "__empty"}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={opt.disabled}
                    onClick={() => {
                      if (opt.disabled) return;
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between gap-3 transition ${
                      opt.disabled
                        ? "text-slate-300 cursor-not-allowed"
                        : active
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate font-medium">{opt.label}</span>
                    {active && !opt.disabled && (
                      <Check className="h-4 w-4 shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

type CreateCaseFormBaseProps = {
  onCancel: () => void;
  onSuccess: () => void;
};

export type CreateCaseFormProps = CreateCaseFormBaseProps &
  (
    | { source: "oracle"; clientId: number }
    | {
        source: "manual";
        carteraManualId: string;
        defaultMontoReferencia?: number | null;
      }
  );

export function CreateCaseForm(props: CreateCaseFormProps) {
  const { onCancel, onSuccess, source } = props;
  const storageFolder =
    source === "oracle"
      ? `oracle_${props.clientId}`
      : `manual_${props.carteraManualId}`;
  const uploadIdSuffix = storageFolder.replace(/[^a-zA-Z0-9_-]/g, "_");

  const [saving, setSaving] = useState(false);
  const [estado, setEstado] = useState("nuevo");
  const [prioridad, setPrioridad] = useState("media");
  const [riesgo, setRiesgo] = useState("medio");
  const [monto, setMonto] = useState<string>("");
  const [proximaAccion, setProximaAccion] = useState("Contactar al cliente");
  const [fechaProxima, setFechaProxima] = useState(() => ecuadorDatetimeLocalFromNow(1));

  // Nuevos campos del caso
  const [tipoProceso, setTipoProceso] = useState("extrajudicial");
  const [estadoVehiculo, setEstadoVehiculo] = useState("poder_cliente");
  const [objetivoCaso, setObjetivoCaso] = useState("recuperar_cartera");
  const [intencionPago, setIntencionPago] = useState("");
  const [contactabilidad, setContactabilidad] = useState("");

  // Novedades para evento inicial
  const [canal, setCanal] = useState("sistema");
  const [descripcion, setDescripcion] = useState(
    "Apertura de caso legal para gestión de cartera.",
  );
  const [detalle, setDetalle] = useState("");

  const { profile } = useAuth();
  const [abogadoId, setAbogadoId] = useState(profile?.id || "");

  // Adjuntos (Storage) para el evento inicial
  const [attachmentsTab, setAttachmentsTab] = useState<"documento" | "imagenes">("documento");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingImgs, setUploadingImgs] = useState(false);
  const [documentoUrl, setDocumentoUrl] = useState<string | null>(null);
  const [imagenes, setImagenes] = useState<
    { id: string; localUrl: string; url: string | null; uploading: boolean }[]
  >([]);

  const defaultMontoManual =
    source === "manual" ? props.defaultMontoReferencia : undefined;
  const carteraIdManual =
    source === "manual" ? props.carteraManualId : undefined;

  useEffect(() => {
    if (defaultMontoManual == null) return;
    if (!Number.isFinite(Number(defaultMontoManual))) return;
    setMonto(String(defaultMontoManual));
  }, [carteraIdManual, defaultMontoManual]);

  const uploadToStorage = async (bucket: string, path: string, file: File) => {
    const supabase = createClient();
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleUploadDocumento = async (file: File) => {
    setUploadingDoc(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `legal_cases/temp_${storageFolder}/documentos/${Date.now()}_${safeName}`;
      const url = await uploadToStorage("cartera-documentos", path, file);
      setDocumentoUrl(url);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo subir el documento. Revisa permisos del bucket.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleUploadImagenes = async (files: FileList) => {
    setUploadingImgs(true);
    try {
      const entries = Array.from(files).map((file) => {
        const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const localUrl = URL.createObjectURL(file);
        return { id, file, localUrl };
      });

      setImagenes((prev) => [
        ...prev,
        ...entries.map((e) => ({ id: e.id, localUrl: e.localUrl, url: null, uploading: true })),
      ]);

      for (const { id, file } of entries) {
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `legal_cases/temp_${storageFolder}/imagenes/${Date.now()}_${safeName}`;
        const url = await uploadToStorage("cartera-imagenes", path, file);
        setImagenes((prev) =>
          prev.map((img) => (img.id === id ? { ...img, url, uploading: false } : img)),
        );
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudieron subir las imágenes. Revisa permisos del bucket.");
    } finally {
      setUploadingImgs(false);
    }
  };

  const onSubmit = async () => {
    if (!abogadoId) return alert("Debe indicar el responsable del caso.");
    if (!proximaAccion.trim())
      return alert("La próxima acción es obligatoria.");
    if (!fechaProxima)
      return alert("La fecha de próxima acción es obligatoria.");
    if (!descripcion.trim())
      return alert("La descripción del evento inicial es obligatoria.");
    if ((canal === "telefono" || canal === "whatsapp") && !detalle.trim()) {
      return alert(
        "El detalle es obligatorio cuando el canal es llamada o whatsapp.",
      );
    }

    setSaving(true);
    try {
      const montoNum = monto.trim() ? Number(monto) : null;
      await legalCasesService.createCase({
        id_sistema: source === "oracle" ? props.clientId : null,
        cartera_manual_id: source === "manual" ? props.carteraManualId : null,
        estado,
        prioridad,
        riesgo,
        abogado_id: abogadoId,
        proxima_accion: proximaAccion,
        fecha_proxima_accion: ecuadorDatetimeLocalToIso(fechaProxima),
        monto_referencia: Number.isFinite(montoNum) ? montoNum : null,
        tipo_proceso: tipoProceso,
        estado_vehiculo: estadoVehiculo,
        objetivo_caso: objetivoCaso,
        intencion_pago: intencionPago || null,
        contactabilidad: contactabilidad || null,
        event: {
          tipo: "creacion",
          descripcion,
          canal,
          detalle: detalle.trim() ? detalle : null,
          documento_id: documentoUrl,
          imagenes_ids: imagenes.filter((i) => i.url).map((i) => i.url!)?.length
            ? imagenes.filter((i) => i.url).map((i) => i.url!)
            : null,
        },
      });
      onSuccess();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error creando caso");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            Aperturar caso legal
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {source === "oracle" ? (
              <>
                Se vinculará al ID Sistema (Oracle):{" "}
                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                  {props.clientId}
                </span>
              </>
            ) : (
              <>
                Caso ligado a{" "}
                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                  cartera manual
                </span>{" "}
                (sin ID Oracle). Referencia: {props.carteraManualId.slice(0, 8)}…
              </>
            )}
          </p>
        </div>
        <div className="h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg">
          <FileText className="h-6 w-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* BLOQUE 1: CONTEXTO DEL CASO */}
        <div className="md:col-span-2">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="h-6 w-6 rounded bg-slate-900 text-white flex items-center justify-center text-xs">
              1
            </span>
            Contexto del Caso
          </h4>
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Responsable del caso
          </label>
          <input
            value={profile?.full_name || profile?.phone || "Usuario actual"}
            readOnly
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none bg-slate-100 text-slate-600 text-sm font-medium cursor-not-allowed"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Tipo de Proceso
          </label>
          <SoftSelect
            value={tipoProceso}
            onChange={(v) => {
              setTipoProceso(v);
              if (v === "judicial") setEstado("judicial");
            }}
            options={[
              { value: "extrajudicial", label: "Cobranza Extrajudicial" },
              { value: "demanda_ejecutiva", label: "Demanda Ejecutiva" },
              { value: "mediacion", label: "Mediación" },
              { value: "judicial", label: "Judicial" },
            ]}
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Objetivo del Caso
          </label>
          <SoftSelect
            value={objetivoCaso}
            onChange={setObjetivoCaso}
            disabled={estadoVehiculo === "recuperado"}
            options={[
              { value: "recuperar_cartera", label: "Recuperar Cartera" },
              { value: "retener_vehiculo", label: "Retener Vehículo" },
              { value: "renegociar", label: "Renegociar Deuda" },
              { value: "recuperacion", label: "Recuperación (Bloqueado)" },
            ]}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Estado del Vehículo
          </label>
          <SoftSelect
            value={estadoVehiculo}
            onChange={(v) => {
              setEstadoVehiculo(v);
              if (v === "recuperado") setObjetivoCaso("recuperacion");
            }}
            options={[
              { value: "poder_cliente", label: "En poder del cliente" },
              { value: "retenido", label: "Retenido" },
              { value: "abandonado", label: "Abandonado / Desconocido" },
              { value: "taller", label: "En taller" },
              { value: "recuperado", label: "Recuperado" },
            ]}
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Monto de referencia{" "}
            <span className="text-slate-400 font-normal lowercase">
              (opcional)
            </span>
          </label>
          <input
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Ej: 4500"
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all"
          />
        </div>

        {/* BLOQUE 2: SITUACIÓN ACTUAL */}
        <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="h-6 w-6 rounded bg-slate-900 text-white flex items-center justify-center text-xs">
              2
            </span>
            Situación Actual
          </h4>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Estado del Caso
          </label>
          <SoftSelect
            value={estado}
            onChange={setEstado}
            disabled={tipoProceso === "judicial"}
            options={[
              {
                value: "nuevo",
                label: "Nuevo",
                disabled: tipoProceso === "judicial",
              },
              { value: "gestionando", label: "Gestionando" },
              { value: "pre_judicial", label: "Pre-Judicial" },
              {
                value: "judicial",
                label: "Judicial",
                disabled: tipoProceso !== "judicial",
              },
              { value: "cerrado", label: "Cerrado" },
              { value: "castigado", label: "Castigado" },
            ]}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Nivel de Riesgo
          </label>
          <SoftSelect
            value={riesgo}
            onChange={setRiesgo}
            options={[
              { value: "bajo", label: "Bajo" },
              { value: "medio", label: "Medio" },
              { value: "alto", label: "Alto" },
            ]}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Prioridad
          </label>
          <SoftSelect
            value={prioridad}
            onChange={setPrioridad}
            options={[
              { value: "baja", label: "Baja" },
              { value: "media", label: "Media" },
              { value: "alta", label: "Alta" },
            ]}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Contactabilidad{" "}
            <span className="text-slate-400 font-normal lowercase">
              (opcional)
            </span>
          </label>
          <SoftSelect
            value={contactabilidad}
            onChange={(v) => {
              setContactabilidad(v);
              if (v === "no_contesta" || v === "ilocalizable") {
                setIntencionPago("nula");
              }
            }}
            placeholder="Seleccionar…"
            options={[
              { value: "", label: "Seleccionar…" },
              { value: "contactado", label: "Contactado" },
              { value: "no_contesta", label: "No contesta" },
              { value: "ilocalizable", label: "Ilocalizable" },
            ]}
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Intención de Pago{" "}
            <span className="text-slate-400 font-normal lowercase">
              (opcional)
            </span>
          </label>
          <SoftSelect
            value={intencionPago}
            onChange={setIntencionPago}
            disabled={
              contactabilidad === "no_contesta" ||
              contactabilidad === "ilocalizable"
            }
            placeholder="Seleccionar…"
            options={[
              { value: "", label: "Seleccionar…" },
              { value: "alta", label: "Alta" },
              { value: "media", label: "Media" },
              { value: "baja", label: "Baja" },
              { value: "nula", label: "Nula / Rechazo" },
            ]}
          />
        </div>

        {/* BLOQUE 3: PLAN DE ACCIÓN */}
        <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="h-6 w-6 rounded bg-slate-900 text-white flex items-center justify-center text-xs">
              3
            </span>
            Plan de Acción{" "}
            <span className="text-red-500 ml-1 text-[10px] font-normal tracking-wide bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
              Requerido
            </span>
          </h4>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Próxima acción
          </label>
          <input
            value={proximaAccion}
            onChange={(e) => setProximaAccion(e.target.value)}
            placeholder="Ej: Visita al cliente, Enviar notificación..."
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Fecha límite de acción
          </label>
          <input
            type="datetime-local"
            value={fechaProxima}
            onChange={(e) => setFechaProxima(e.target.value)}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white"
          />
        </div>

        {/* BLOQUE 4: REGISTRO INICIAL */}
        <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="h-6 w-6 rounded bg-slate-900 text-white flex items-center justify-center text-xs">
              4
            </span>
            Registro Inicial (Gestión){" "}
            <span className="text-slate-400 font-normal lowercase ml-1">
              lo que se hizo
            </span>
          </h4>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Canal de gestión
          </label>
          <SoftSelect
            value={canal}
            onChange={setCanal}
            options={[
              { value: "sistema", label: "Sistema / Interno" },
              { value: "telefono", label: "Llamada Telefónica" },
              { value: "whatsapp", label: "WhatsApp / Mensaje" },
              { value: "email", label: "Correo Electrónico" },
              { value: "presencial", label: "Reunión Presencial" },
            ]}
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Descripción (¿Qué se hizo?){" "}
            <span className="text-red-500 ml-1 text-[10px] font-normal tracking-wide bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
              Requerido
            </span>
          </label>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Detalle de la gestión inicial{" "}
            {canal === "telefono" || canal === "whatsapp" ? (
              <span className="text-red-500 ml-1 text-[10px] font-normal tracking-wide bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                Requerido por el canal
              </span>
            ) : (
              <span className="text-slate-400 font-normal lowercase">
                (opcional)
              </span>
            )}
          </label>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Ej: Se ingresa al cliente en proceso de pre-legal por falta de respuesta..."
            rows={3}
            className="mt-1.5 w-full py-3 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all resize-none"
          />
        </div>

        {/* ADJUNTOS DEL EVENTO INICIAL */}
        <div className="md:col-span-2 mt-2 p-4 bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Adjuntos del evento inicial
            </div>
            <div className="flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 p-1">
              <button
                type="button"
                onClick={() => setAttachmentsTab("documento")}
                className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition ${
                  attachmentsTab === "documento"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <FileUp className="h-3.5 w-3.5" />
                  Documento
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAttachmentsTab("imagenes")}
                className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition ${
                  attachmentsTab === "imagenes"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Imágenes
                </span>
              </button>
            </div>
          </div>

          {attachmentsTab === "documento" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label
                  htmlFor={`upload_doc_${uploadIdSuffix}`}
                  className="h-10 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <FileUp className="h-4 w-4" />
                  Seleccionar PDF
                </label>
                <input
                  id={`upload_doc_${uploadIdSuffix}`}
                  type="file"
                  accept="application/pdf"
                  disabled={uploadingDoc}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUploadDocumento(f);
                  }}
                  className="hidden"
                />
              </div>

              {uploadingDoc && (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Subiendo documento…
                </div>
              )}

              {documentoUrl ? (
                <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileUp className="h-4 w-4 text-slate-700 shrink-0" />
                    <div className="text-sm font-semibold text-slate-800 truncate">
                      Documento PDF adjunto
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={documentoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 transition text-slate-700"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ver
                    </a>
                    <button
                      type="button"
                      onClick={() => setDocumentoUrl(null)}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 transition text-slate-600"
                      title="Quitar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Sube un PDF. Se guardará la URL en <span className="font-mono">documento_id</span>.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label
                  htmlFor={`upload_imgs_${uploadIdSuffix}`}
                  className="h-10 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <ImageIcon className="h-4 w-4" />
                  Seleccionar imágenes
                </label>
                <input
                  id={`upload_imgs_${uploadIdSuffix}`}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingImgs}
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length) void handleUploadImagenes(files);
                  }}
                  className="hidden"
                />
              </div>

              {uploadingImgs && (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Subiendo imágenes…
                </div>
              )}

              {imagenes.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {imagenes.map((img) => (
                    <div key={img.id} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url || img.localUrl} alt="Adjunto" className="h-28 w-full object-cover" />
                      {img.uploading && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Subiendo…
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition"></div>
                      <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                        {img.url && (
                          <a
                            href={img.url}
                            target="_blank"
                            rel="noreferrer"
                            className="h-8 w-8 rounded-full bg-white/90 border border-white flex items-center justify-center text-slate-700 hover:bg-white"
                            title="Abrir"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              URL.revokeObjectURL(img.localUrl);
                            } catch {}
                            setImagenes((prev) => prev.filter((u) => u.id !== img.id));
                          }}
                          className="h-8 w-8 rounded-full bg-white/90 border border-white flex items-center justify-center text-slate-700 hover:bg-white"
                          title="Quitar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Sube imágenes. Se guardará un array de URLs en <span className="font-mono">imagenes_ids</span>.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={saving}
          className="h-11 px-6 rounded-full text-slate-600 hover:bg-slate-100 transition text-sm font-bold disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          onClick={onSubmit}
          disabled={saving}
          className="h-11 px-8 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition shadow-lg shadow-slate-200 text-sm font-bold disabled:opacity-60 flex items-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar caso
        </button>
      </div>
    </div>
  );
}
