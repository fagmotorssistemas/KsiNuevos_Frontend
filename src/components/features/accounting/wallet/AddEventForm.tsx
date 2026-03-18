"use client";

import { useState } from "react";
import { Loader2, Plus, FileUp, Image as ImageIcon, ExternalLink, X } from "lucide-react";
import { legalCasesService } from "@/services/legalCases.service";
import { createClient } from "@/lib/supabase/client";

export function AddEventForm({
  caseId,
  onCancel,
  onSuccess,
}: {
  caseId: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [tipo, setTipo] = useState("llamada");
  const [canal, setCanal] = useState("telefono");
  const [descripcion, setDescripcion] = useState("");
  const [detalle, setDetalle] = useState("");
  const [resultado, setResultado] = useState("");

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
      alert("La descripción es obligatoria");
      return;
    }
    setSaving(true);
    try {
      await legalCasesService.registerEvent({
        case_id: caseId,
        tipo,
        canal,
        descripcion,
        detalle: detalle.trim() ? detalle : null,
        resultado: resultado.trim() ? resultado : null,
        proxima_accion: updateAction ? proximaAccion : null,
        fecha_proxima_accion: updateAction
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

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            Registrar nueva gestión
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Se agregará al historial del caso
          </p>
        </div>
        <div className="h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg">
          <Plus className="h-6 w-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Descripción (¿Qué se hizo?)
          </label>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Llamada de cobro para cuota vencida"
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Detalle (¿Qué se conversó/dijo?)
          </label>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Ej: El cliente indica que pagará el próximo viernes a primera hora..."
            rows={3}
            className="mt-1.5 w-full py-3 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all resize-none"
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

        {/* PROXIMA ACCION Opcional */}
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
          Registrar
        </button>
      </div>
    </div>
  );
}
