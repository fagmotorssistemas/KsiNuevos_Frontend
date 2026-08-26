"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Plus,
  FileUp,
  Image as ImageIcon,
  ExternalLink,
  X,
  Shield,
  ArrowLeft,
  Check,
  ChevronDown,
} from "lucide-react";
import { legalCasesService } from "@/services/legalCases.service";
import { ecuadorDatetimeLocalFromNow, ecuadorDatetimeLocalToIso } from "@/lib/ecuador-datetime";
import { createClient } from "@/lib/supabase/client";
import {
  type LegalPipeline,
  type PoderEspecialStatus,
  OPERATIVA_TIPOS,
  FORMAL_TIPOS,
  filterFormalTiposByPoder,
  getResultadosForTipo,
  encodeVerificacionDetalle,
  encodePredemandaDetalle,
  encodeViaJudicialDetalle,
  defaultCanalForTipo,
  operativaNeedsCanalSelect,
  CIERRE_RESULTADO_CASTIGADO,
  PODER_ESPECIAL_OPTIONS,
} from "./legalGestionCatalogs";

type SoftOption = { value: string; label: string };

function SoftSelect({
  value,
  onChange,
  options,
  placeholder = "Selecciona…",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SoftOption[];
  placeholder?: string;
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

  return (
    <div ref={rootRef} className="relative mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full h-11 px-4 rounded-xl border bg-white text-sm text-left outline-none flex items-center justify-between gap-2 transition ${
          open
            ? "border-slate-400 ring-4 ring-slate-100"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <span
          className={`truncate ${selected ? "text-slate-800 font-medium" : "text-slate-400"}`}
        >
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-[90] left-0 right-0 top-[calc(100%+6px)] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <ul className="max-h-56 overflow-y-auto py-1.5" role="listbox">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value || "__empty"}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between gap-3 transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate font-medium">{opt.label}</span>
                    {active && <Check className="h-4 w-4 shrink-0" />}
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

export function AddEventForm({
  caseId,
  onCancel,
  onBack,
  onSuccess,
  mode = "default",
  pipeline = "operativa",
  poderEspecialHint = null,
  initialTipo,
  /** Si true, el tipo ya viene del listado izquierdo: no se vuelve a elegir. */
  lockTipo = false,
}: {
  caseId: string;
  onCancel: () => void;
  onBack?: () => void;
  onSuccess: () => void;
  mode?: "default" | "observacion";
  pipeline?: LegalPipeline;
  poderEspecialHint?: PoderEspecialStatus | null;
  initialTipo?: string;
  lockTipo?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const isObservation = mode === "observacion";
  const isFormal = !isObservation && pipeline === "formal";

  const tiposDisponibles = useMemo(() => {
    if (isObservation) return [];
    if (isFormal) return filterFormalTiposByPoder(poderEspecialHint);
    return OPERATIVA_TIPOS;
  }, [isObservation, isFormal, poderEspecialHint]);

  const defaultTipo =
    initialTipo &&
    (tiposDisponibles.some((t) => t.value === initialTipo) || lockTipo)
      ? initialTipo
      : isObservation
        ? "nota"
        : tiposDisponibles[0]?.value || "llamada";

  const [tipo, setTipo] = useState(defaultTipo);
  const [canal, setCanal] = useState(
    isObservation ? "sistema" : defaultCanalForTipo(pipeline, defaultTipo),
  );
  const [descripcion, setDescripcion] = useState("");
  const [detalle, setDetalle] = useState("");
  const [resultado, setResultado] = useState("");
  const [poderEspecial, setPoderEspecial] = useState<PoderEspecialStatus | "">(
    poderEspecialHint || "",
  );
  const [contratoCompleto, setContratoCompleto] = useState(false);
  const [kardexRevisado, setKardexRevisado] = useState(false);
  const [codeudor, setCodeudor] = useState<"si" | "no" | "">("");
  const [fechaEnvio, setFechaEnvio] = useState("");
  const [numeroProceso, setNumeroProceso] = useState("");
  const [juzgado, setJuzgado] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [updateAction, setUpdateAction] = useState(false);
  const [proximaAccion, setProximaAccion] = useState("");
  const [fechaProxima, setFechaProxima] = useState(() => ecuadorDatetimeLocalFromNow(1));

  const [attachmentsTab, setAttachmentsTab] = useState<"documento" | "imagenes">(
    "documento",
  );
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingImgs, setUploadingImgs] = useState(false);
  const [documentoUrl, setDocumentoUrl] = useState<string | null>(null);
  const [imagenes, setImagenes] = useState<
    { id: string; localUrl: string; url: string | null; uploading: boolean }[]
  >([]);

  const resultados = useMemo(
    () => (isObservation ? [] : getResultadosForTipo(pipeline, tipo)),
    [isObservation, pipeline, tipo],
  );

  const tipoLabel = useMemo(() => {
    const fromFormal = FORMAL_TIPOS.find((t) => t.value === tipo);
    const fromOp = OPERATIVA_TIPOS.find((t) => t.value === tipo);
    return (
      fromFormal?.label.replace(/^\d+[A-B]?\.\s*/, "") ||
      fromOp?.label ||
      tipo
    );
  }, [tipo]);

  useEffect(() => {
    if (isObservation) return;
    if (!tiposDisponibles.some((t) => t.value === tipo) && !lockTipo) {
      const first = tiposDisponibles[0]?.value;
      if (first) setTipo(first);
    }
  }, [tiposDisponibles, tipo, isObservation, lockTipo]);

  useEffect(() => {
    if (isObservation) return;
    setCanal(defaultCanalForTipo(pipeline, tipo));
    setResultado("");
    setContratoCompleto(false);
    setKardexRevisado(false);
    setCodeudor("");
    setFechaEnvio("");
    setNumeroProceso("");
    setJuzgado("");
    setFechaIngreso("");
  }, [tipo, pipeline, isObservation]);

  const hasAdjunto =
    !!documentoUrl || imagenes.some((i) => !!i.url && !i.uploading);

  const cierreCastigado =
    isFormal &&
    tipo === "cierre" &&
    resultado === CIERRE_RESULTADO_CASTIGADO;

  const canSubmit = useMemo(() => {
    if (saving || uploadingDoc || uploadingImgs) return false;
    if (isObservation) return !!descripcion.trim();
    if (!resultado || !descripcion.trim()) return false;
    if (isFormal) {
      if (!hasAdjunto) return false;
      if (tipo === "verificacion") {
        if (!poderEspecial) return false;
        if (!contratoCompleto || !kardexRevisado || !codeudor) return false;
      }
      if (tipo === "predemanda" && !fechaEnvio) return false;
      if (tipo === "via_judicial") {
        if (!numeroProceso.trim() || !juzgado.trim() || !fechaIngreso)
          return false;
      }
      if (cierreCastigado && !detalle.trim()) return false;
    }
    return true;
  }, [
    saving,
    uploadingDoc,
    uploadingImgs,
    isObservation,
    resultado,
    descripcion,
    isFormal,
    hasAdjunto,
    tipo,
    poderEspecial,
    contratoCompleto,
    kardexRevisado,
    codeudor,
    fechaEnvio,
    numeroProceso,
    juzgado,
    fechaIngreso,
    cierreCastigado,
    detalle,
  ]);

  const uploadToStorage = async (bucket: string, path: string, file: File) => {
    const supabase = createClient();
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const handleUploadDocumento = async (file: File) => {
    setUploadingDoc(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `legal_cases/${caseId}/documentos/${Date.now()}_${safeName}`;
      setDocumentoUrl(await uploadToStorage("cartera-documentos", path, file));
    } catch (e: any) {
      alert(e?.message || "No se pudo subir el documento.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleUploadImagenes = async (files: FileList) => {
    setUploadingImgs(true);
    try {
      const entries = Array.from(files).map((file) => {
        const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
        return { id, file, localUrl: URL.createObjectURL(file) };
      });
      setImagenes((prev) => [
        ...prev,
        ...entries.map((e) => ({
          id: e.id,
          localUrl: e.localUrl,
          url: null as string | null,
          uploading: true,
        })),
      ]);
      for (const { id, file } of entries) {
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `legal_cases/${caseId}/imagenes/${Date.now()}_${safeName}`;
        const url = await uploadToStorage("cartera-imagenes", path, file);
        setImagenes((prev) =>
          prev.map((img) =>
            img.id === id ? { ...img, url, uploading: false } : img,
          ),
        );
      }
    } catch (e: any) {
      alert(e?.message || "No se pudieron subir las imágenes.");
    } finally {
      setUploadingImgs(false);
    }
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      let detalleFinal = detalle.trim();
      if (isFormal && tipo === "verificacion") {
        detalleFinal = encodeVerificacionDetalle({
          detalle: detalleFinal,
          contratoCompleto,
          kardexRevisado,
          codeudor,
          poder: poderEspecial || null,
        });
      } else if (isFormal && tipo === "predemanda") {
        detalleFinal = encodePredemandaDetalle({
          detalle: detalleFinal,
          fechaEnvio,
        });
      } else if (isFormal && tipo === "via_judicial") {
        detalleFinal = encodeViaJudicialDetalle({
          detalle: detalleFinal,
          numeroProceso: numeroProceso.trim(),
          juzgado: juzgado.trim(),
          fechaIngreso,
        });
      }

      await legalCasesService.registerEvent({
        case_id: caseId,
        tipo: isObservation ? "nota" : tipo,
        canal: isObservation ? "sistema" : canal,
        descripcion: isObservation
          ? descripcion
          : `${tipoLabel}: ${descripcion}`,
        detalle: detalleFinal || null,
        resultado: isObservation ? null : resultado,
        proxima_accion:
          updateAction && !isObservation ? proximaAccion : null,
        fecha_proxima_accion:
          updateAction && !isObservation
            ? ecuadorDatetimeLocalToIso(fechaProxima)
            : null,
        documento_id: documentoUrl,
        imagenes_ids: imagenes.filter((i) => i.url).map((i) => i.url!).length
          ? imagenes.filter((i) => i.url).map((i) => i.url!)
          : null,
      });
      onSuccess();
    } catch (e: any) {
      alert(e?.message || "Error registrando gestión");
    } finally {
      setSaving(false);
    }
  };

  const field =
    "mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white";
  const label = "text-xs font-bold text-slate-500 uppercase tracking-wider";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-6 flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack ?? onCancel}
            className="mt-0.5 h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-slate-900">
              {isObservation
                ? "Nueva notita del caso"
                : lockTipo
                  ? tipoLabel
                  : "Registrar nueva gestión"}
            </h3>
            <p className="text-sm mt-1 text-slate-500">
              {isObservation
                ? "Nota rápida interna (auditable)"
                : isFormal
                  ? "Registro formal · se agregará al historial"
                  : lockTipo
                    ? "Registro operativo · se agregará al historial"
                    : "Se agregará al historial del caso"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="h-9 w-9 rounded-full text-slate-400 hover:bg-slate-100 flex items-center justify-center shrink-0"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {!isObservation && !lockTipo && (
          <div>
            <label className={label}>Tipo de gestión</label>
            <SoftSelect
              value={tipo}
              onChange={setTipo}
              options={tiposDisponibles.map((t) => ({
                value: t.value,
                label: t.label,
              }))}
            />
          </div>
        )}

        {!isObservation &&
          pipeline === "operativa" &&
          operativaNeedsCanalSelect(tipo) && (
          <div className={lockTipo ? "md:col-span-2 sm:max-w-sm" : ""}>
            <label className={label}>Canal</label>
            <SoftSelect
              value={canal}
              onChange={setCanal}
              options={[
                { value: "telefono", label: "Teléfono" },
                { value: "whatsapp", label: "WhatsApp" },
                { value: "email", label: "Email" },
                { value: "presencial", label: "Presencial" },
                { value: "mensaje", label: "Mensaje" },
              ]}
            />
          </div>
        )}

        {isFormal && tipo === "verificacion" && (
          <div className="md:col-span-2 rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-4">
            <div>
              <p className={label + " mb-2"}>Checklist de verificación</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer rounded-lg bg-white border border-slate-200 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={contratoCompleto}
                    onChange={(e) => setContratoCompleto(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  />
                  <span className="text-sm font-medium text-slate-800">
                    Contrato completo y firmado
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer rounded-lg bg-white border border-slate-200 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={kardexRevisado}
                    onChange={(e) => setKardexRevisado(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  />
                  <span className="text-sm font-medium text-slate-800">
                    Kardex de deuda revisado (monto real validado)
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className={label}>¿Tiene codeudor?</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {(
                  [
                    ["si", "Sí"],
                    ["no", "No"],
                  ] as const
                ).map(([value, text]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCodeudor(value)}
                    className={`h-9 px-4 rounded-xl text-sm font-semibold border transition ${
                      codeudor === value
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1 border-t border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-700 mb-2">
                <Shield className="h-4 w-4" />
                <span className={label}>Poder especial</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PODER_ESPECIAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPoderEspecial(opt.value)}
                    className={`h-9 px-3.5 rounded-xl text-sm font-semibold border transition ${
                      poderEspecial === opt.value
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {opt.label
                      .replace("Poder especial ", "")
                      .replace("Sin poder especial", "No existe")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isFormal && tipo === "predemanda" && (
          <div className="md:col-span-2 sm:max-w-sm">
            <label className={label}>Fecha de envío</label>
            <input
              type="date"
              value={fechaEnvio}
              onChange={(e) => setFechaEnvio(e.target.value)}
              className={field}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Desde esta fecha se cuenta el SLA de 10–15 días.
            </p>
          </div>
        )}

        {isFormal && tipo === "via_judicial" && (
          <>
            <div>
              <label className={label}>Nº proceso legal</label>
              <input
                value={numeroProceso}
                onChange={(e) => setNumeroProceso(e.target.value)}
                className={field}
                placeholder="12345-2026-JUD"
              />
            </div>
            <div>
              <label className={label}>Juzgado</label>
              <input
                value={juzgado}
                onChange={(e) => setJuzgado(e.target.value)}
                className={field}
                placeholder="Ej: Juzgado Civil de …"
              />
            </div>
            <div className="md:col-span-2 sm:max-w-sm">
              <label className={label}>Fecha de ingreso de la demanda</label>
              <input
                type="date"
                value={fechaIngreso}
                onChange={(e) => setFechaIngreso(e.target.value)}
                className={field}
              />
            </div>
          </>
        )}

        <div className="md:col-span-2">
          <label className={label}>
            {isObservation
              ? "Título de la nota (obligatorio)"
              : "Descripción (¿Qué se hizo?)"}
          </label>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder={
              isObservation
                ? "Ej: Pendiente de documentos para continuar el caso."
                : "Ej: Llamada de cobro para cuota vencida"
            }
            className={field}
          />
        </div>

        <div className="md:col-span-2">
          <label className={label}>
            {isObservation
              ? "Contenido de la nota (opcional)"
              : cierreCastigado
                ? "Justificación del castigo (obligatoria)"
                : "Detalle (¿Qué se conversó/dijo?)"}
          </label>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder={
              isObservation
                ? "Escribe aquí la nota libre: ideas, recordatorios o contexto."
                : cierreCastigado
                  ? "Explica por qué se castiga la cartera (motivo, gestión previa, monto, etc.)."
                  : "Ej: El cliente indica que pagará el próximo viernes a primera hora..."
            }
            rows={isObservation || cierreCastigado ? 5 : 3}
            className={field + " !h-auto py-3 resize-none"}
          />
          {cierreCastigado && (
            <p className="mt-1 text-[11px] text-amber-700 font-medium">
              Obligatorio: sin justificación no se puede registrar un castigo.
            </p>
          )}
        </div>

        <div className="md:col-span-2 mt-1 p-4 bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className={label}>
              Adjuntos del evento
              {isFormal ? " (obligatorio)" : ""}
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
                  htmlFor={`upload_doc_${caseId}`}
                  className="h-10 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <FileUp className="h-4 w-4" />
                  Seleccionar PDF
                </label>
                <input
                  id={`upload_doc_${caseId}`}
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
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    Documento PDF adjunto
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={documentoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ver
                    </a>
                    <button
                      type="button"
                      onClick={() => setDocumentoUrl(null)}
                      className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Sube un PDF. Se guardará la URL en documento_id.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <label
                htmlFor={`upload_imgs_${caseId}`}
                className="h-10 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <ImageIcon className="h-4 w-4" />
                Seleccionar imágenes
              </label>
              <input
                id={`upload_imgs_${caseId}`}
                type="file"
                accept="image/*"
                multiple
                disabled={uploadingImgs}
                onChange={(e) => {
                  if (e.target.files?.length)
                    void handleUploadImagenes(e.target.files);
                }}
                className="hidden"
              />
              {uploadingImgs && (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Subiendo imágenes…
                </div>
              )}
              {imagenes.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {imagenes.map((img) => (
                    <div
                      key={img.id}
                      className="relative rounded-xl overflow-hidden border border-slate-200 bg-white"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url || img.localUrl}
                        alt=""
                        className="h-28 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setImagenes((p) => p.filter((x) => x.id !== img.id))
                        }
                        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 border border-white flex items-center justify-center text-slate-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Sube imágenes. Se guardará un array de URLs en imagenes_ids.
                </div>
              )}
            </div>
          )}
        </div>

        {!isObservation && (
          <div className="md:col-span-2">
            <label className={label}>Resultado</label>
            <SoftSelect
              value={resultado}
              onChange={setResultado}
              placeholder="Selecciona…"
              options={resultados.map((r) => ({ value: r, label: r }))}
            />
            {isFormal && (
              <p className="mt-1 text-[11px] text-slate-400">
                Catálogo específico de este paso ({tipoLabel}).
              </p>
            )}
          </div>
        )}

        {!isObservation && (
          <div className="md:col-span-2 mt-1 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={updateAction}
                onChange={(e) => setUpdateAction(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span className="text-sm font-bold text-slate-800">
                Actualizar próxima acción en agenda
              </span>
            </label>
            {updateAction && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Acción</label>
                  <input
                    value={proximaAccion}
                    onChange={(e) => setProximaAccion(e.target.value)}
                    className={field}
                  />
                </div>
                <div>
                  <label className={label}>Fecha</label>
                  <input
                    type="datetime-local"
                    value={fechaProxima}
                    onChange={(e) => setFechaProxima(e.target.value)}
                    className={field}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-11 px-6 rounded-full text-slate-600 hover:bg-slate-100 transition text-sm font-bold disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="h-11 px-8 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition shadow-lg shadow-slate-200 text-sm font-bold disabled:opacity-60 flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Registrar
        </button>
      </div>
    </div>
  );
}
