"use client";

import { useState } from "react";
import { Loader2, Plus, FileUp, Image as ImageIcon, ExternalLink, X } from "lucide-react";
import { legalCasesService } from "@/services/legalCases.service";
import { createClient } from "@/lib/supabase/client";

export function AddEventForm({
  caseId,
  onCancel,
  onSuccess,
  mode = "default",
}: {
  caseId: string;
  onCancel: () => void;
  onSuccess: () => void;
  mode?: "default" | "observacion";
}) {
  const [saving, setSaving] = useState(false);
  const isObservation = mode === "observacion";
  const [tipo, setTipo] = useState(isObservation ? "nota" : "llamada");
  const [canal, setCanal] = useState(isObservation ? "sistema" : "telefono");
  const [descripcion, setDescripcion] = useState("");
  const [detalle, setDetalle] = useState("");
  const [resultado, setResultado] = useState("");
  const [noteColor, setNoteColor] = useState<
    "amarillo" | "rosa" | "azul" | "verde" | "lila"
  >("amarillo");

  const [updateAction, setUpdateAction] = useState(false);
  const [proximaAccion, setProximaAccion] = useState("");
  const [fechaProxima, setFechaProxima] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 16);
  });

  // Adjuntos (Storage)
  const [attachmentsTab, setAttachmentsTab] = useState<"documento" | "imagenes">("documento");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingImgs, setUploadingImgs] = useState(false);
  const [documentoUrl, setDocumentoUrl] = useState<string | null>(null);
  const [imagenes, setImagenes] = useState<
    { id: string; localUrl: string; url: string | null; uploading: boolean }[]
  >([]);

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
      const path = `legal_cases/${caseId}/documentos/${Date.now()}_${safeName}`;
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
        const path = `legal_cases/${caseId}/imagenes/${Date.now()}_${safeName}`;
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
    if (!descripcion.trim()) {
      alert(isObservation ? "La observación es obligatoria" : "La descripción es obligatoria");
      return;
    }
    setSaving(true);
    try {
      await legalCasesService.registerEvent({
        case_id: caseId,
        tipo: isObservation ? "nota" : tipo,
        canal: isObservation ? "sistema" : canal,
        descripcion,
        detalle: detalle.trim() ? detalle : null,
        resultado: isObservation ? null : (resultado.trim() ? resultado : null),
        proxima_accion: updateAction && !isObservation ? proximaAccion : null,
        fecha_proxima_accion: updateAction && !isObservation
          ? new Date(fechaProxima).toISOString()
          : null,
        documento_id: documentoUrl,
        imagenes_ids: imagenes.filter((i) => i.url).map((i) => i.url!)?.length
          ? imagenes.filter((i) => i.url).map((i) => i.url!)
          : null,
      });
      onSuccess();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error registrando gestión");
    } finally {
      setSaving(false);
    }
  };

  const noteThemes = {
    amarillo: {
      container: "bg-amber-50 border-amber-200",
      badge: "bg-amber-200 text-amber-900 border-amber-300",
      icon: "bg-amber-400 text-amber-950",
      input: "border-amber-300 focus:border-amber-500 focus:ring-amber-100 bg-white/90",
    },
    rosa: {
      container: "bg-rose-50 border-rose-200",
      badge: "bg-rose-200 text-rose-900 border-rose-300",
      icon: "bg-rose-400 text-rose-950",
      input: "border-rose-300 focus:border-rose-500 focus:ring-rose-100 bg-white/90",
    },
    azul: {
      container: "bg-sky-50 border-sky-200",
      badge: "bg-sky-200 text-sky-900 border-sky-300",
      icon: "bg-sky-400 text-sky-950",
      input: "border-sky-300 focus:border-sky-500 focus:ring-sky-100 bg-white/90",
    },
    verde: {
      container: "bg-emerald-50 border-emerald-200",
      badge: "bg-emerald-200 text-emerald-900 border-emerald-300",
      icon: "bg-emerald-400 text-emerald-950",
      input: "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-100 bg-white/90",
    },
    lila: {
      container: "bg-violet-50 border-violet-200",
      badge: "bg-violet-200 text-violet-900 border-violet-300",
      icon: "bg-violet-400 text-violet-950",
      input: "border-violet-300 focus:border-violet-500 focus:ring-violet-100 bg-white/90",
    },
  } as const;

  return (
    <div
      className={`rounded-xl border shadow-sm p-6 lg:p-8 animate-in fade-in zoom-in-95 duration-300 ${
        isObservation
          ? `${noteThemes[noteColor].container} border-2`
          : "bg-white border-slate-200"
      }`}
    >
      <div
        className={`mb-6 flex items-center justify-between pb-4 ${
          isObservation ? "border-b border-black/10" : "border-b border-slate-100"
        }`}
      >
        <div>
          <h3 className={`text-xl font-bold ${isObservation ? "text-slate-800" : "text-slate-900"}`}>
            {isObservation ? "Nueva notita del caso" : "Registrar nueva gestión"}
          </h3>
          <p className={`text-sm mt-1 ${isObservation ? "text-slate-600" : "text-slate-500"}`}>
            {isObservation
              ? "Nota rápida interna (auditable) con estilo post-it"
              : "Se agregará al historial del caso"}
          </p>
        </div>
        <div
          className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg rotate-3 ${
            isObservation ? noteThemes[noteColor].icon : "bg-slate-900 text-white"
          }`}
        >
          <Plus className="h-6 w-6" />
        </div>
      </div>

      {isObservation && (
        <div className="mb-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Color de nota:
            </span>
            {[
              { id: "amarillo", label: "Amarillo", cls: "bg-amber-300" },
              { id: "rosa", label: "Rosa", cls: "bg-rose-300" },
              { id: "azul", label: "Azul", cls: "bg-sky-300" },
              { id: "verde", label: "Verde", cls: "bg-emerald-300" },
              { id: "lila", label: "Lila", cls: "bg-violet-300" },
            ].map((tone) => (
              <button
                key={tone.id}
                type="button"
                onClick={() => setNoteColor(tone.id as keyof typeof noteThemes)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition ${
                  noteColor === tone.id
                    ? `${noteThemes[noteColor].badge} ring-2 ring-white/70`
                    : "bg-white/80 border-slate-200 text-slate-600 hover:bg-white"
                }`}
              >
                <span className={`h-3 w-3 rounded-sm ${tone.cls}`}></span>
                {tone.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {!isObservation && (
          <>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tipo de gestión
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white"
              >
                <option value="llamada">Llamada</option>
                <option value="mensaje">Mensaje</option>
                <option value="nota">Nota interna</option>
                <option value="notificacion">Notificación</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Canal
              </label>
              <select
                value={canal}
                onChange={(e) => setCanal(e.target.value)}
                className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white"
              >
                <option value="telefono">Teléfono</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="presencial">Presencial</option>
                <option value="sistema">Sistema</option>
              </select>
            </div>
          </>
        )}

        <div className="md:col-span-2">
          <label className={`text-xs font-bold uppercase tracking-wider ${isObservation ? "text-slate-600" : "text-slate-500"}`}>
            {isObservation ? "Título de la nota (obligatorio)" : "Descripción (¿Qué se hizo?)"}
          </label>
          {isObservation ? (
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Pendiente de documentos para continuar el caso."
              rows={2}
              className={`mt-1.5 w-full py-3 px-4 rounded-xl border outline-none focus:ring-4 text-sm font-medium transition-all resize-none ${noteThemes[noteColor].input}`}
            />
          ) : (
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Llamada de cobro para cuota vencida"
              className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all"
            />
          )}
        </div>

        <div className="md:col-span-2">
          <label className={`text-xs font-bold uppercase tracking-wider ${isObservation ? "text-slate-600" : "text-slate-500"}`}>
            {isObservation ? "Contenido de la nota (opcional)" : "Detalle (¿Qué se conversó/dijo?)"}
          </label>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder={
              isObservation
                ? "Escribe aquí la nota libre: ideas, recordatorios o contexto para el caso."
                : "Ej: El cliente indica que pagará el próximo viernes a primera hora..."
            }
            rows={isObservation ? 5 : 3}
            className={`mt-1.5 w-full py-3 px-4 rounded-xl border outline-none focus:ring-4 text-sm font-medium transition-all resize-none ${
              isObservation
                ? noteThemes[noteColor].input
                : "border-slate-200 focus:border-slate-400 focus:ring-slate-100"
            }`}
          />
        </div>

        {/* ADJUNTOS */}
        <div className="md:col-span-2 mt-2 p-4 bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Adjuntos del evento
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
                  className="h-10 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
                  htmlFor={`upload_imgs_${caseId}`}
                  className="h-10 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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

        {!isObservation && (
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Resultado (opcional)
            </label>
            <input
              value={resultado}
              onChange={(e) => setResultado(e.target.value)}
              placeholder="Ej: Promesa de pago"
              className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all"
            />
          </div>
        )}

        {/* PROXIMA ACCION Opcional */}
        {!isObservation && (
        <div className="md:col-span-2 mt-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
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
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Acción
                </label>
                <input
                  value={proximaAccion}
                  onChange={(e) => setProximaAccion(e.target.value)}
                  className="mt-1.5 w-full h-10 px-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200 text-sm transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Fecha
                </label>
                <input
                  type="datetime-local"
                  value={fechaProxima}
                  onChange={(e) => setFechaProxima(e.target.value)}
                  className="mt-1.5 w-full h-10 px-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200 text-sm transition-all"
                />
              </div>
            </div>
          )}
        </div>
        )}
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
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {isObservation ? "Guardar observación" : "Registrar"}
        </button>
      </div>
    </div>
  );
}
