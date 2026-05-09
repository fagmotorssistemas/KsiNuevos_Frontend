'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import {
  RefreshCw,
  Receipt,
  Search,
  X,
  Paperclip,
  Upload,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useComprobantes } from '@/hooks/accounting/useComprobantes';
import { useAuth } from '@/hooks/useAuth';
import { Comprobante, ComprobanteImagen } from '@/types/comprobantes.types';

const MIMES_PERMITIDOS =
  'image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif,application/pdf';

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(val?: number | null): string {
  if (val == null) return '—';
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(val);
}

function isImage(url: string): boolean {
  return /\.(jpe?g|png|webp|gif|heic|heif)(\?.*)?$/i.test(url);
}

// ─────────────────────────────────────────────
// Sub-componente: Fila de la tabla
// ─────────────────────────────────────────────
function ComprobanteRow({
  c,
  isSelected,
  onClick,
}: {
  c: Comprobante;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-slate-100 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-red-50 hover:bg-red-50'
          : 'hover:bg-slate-50'
      }`}
    >
      <td className="px-4 py-3 text-sm font-mono text-slate-500">{c.ccoCodigo ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-slate-800">{c.dspComproba ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(c.ccoFecha)}</td>
      <td className="px-4 py-3 text-sm text-slate-600 max-w-[260px] truncate">
        {c.ccoConcepto ?? '—'}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{c.ctiNombre ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{c.almNombre ?? '—'}</td>
      <td className="px-4 py-3 text-sm font-semibold text-slate-800 text-right">
        {formatCurrency(c.ccoValComproba)}
      </td>
      <td className="px-4 py-3">
        <ChevronRight
          size={16}
          className={`transition-colors ${isSelected ? 'text-red-600' : 'text-slate-300'}`}
        />
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────
// Sub-componente: Tarjeta de adjunto
// ─────────────────────────────────────────────
function AdjuntoCard({ img }: { img: ComprobanteImagen }) {
  const esImagen = isImage(img.ccoUrl);
  return (
    <div className="group relative border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      {esImagen ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img.ccoUrl}
          alt={`Adjunto #${img.ccoSecuencia}`}
          className="w-full h-32 object-cover bg-slate-100"
        />
      ) : (
        <div className="w-full h-32 flex items-center justify-center bg-red-50">
          <FileText size={40} className="text-red-400" />
        </div>
      )}

      <div className="p-3">
        <p className="text-xs text-slate-500 mb-1">
          Sec. <span className="font-semibold text-slate-700">#{img.ccoSecuencia}</span>
          {img.creaUsr && (
            <span className="ml-2 text-slate-400">por {img.creaUsr}</span>
          )}
        </p>
        {img.creaFecha && (
          <p className="text-xs text-slate-400">{formatDate(img.creaFecha)}</p>
        )}
      </div>

      <a
        href={img.ccoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="flex items-center gap-1.5 text-white text-sm font-medium bg-black/40 px-3 py-1.5 rounded-lg">
          <ExternalLink size={14} />
          {esImagen ? 'Ver imagen' : 'Abrir PDF'}
        </span>
      </a>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-componente: Panel de adjuntos
// ─────────────────────────────────────────────
function AdjuntosPanel({
  selected,
  imagenes,
  loadingImagenes,
  uploading,
  onUpload,
  onClose,
}: {
  selected: Comprobante;
  imagenes: ComprobanteImagen[];
  loadingImagenes: boolean;
  uploading: boolean;
  onUpload: (file: File) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      onUpload(file);
      if (fileRef.current) fileRef.current.value = '';
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      handleFile(file);
    },
    [handleFile]
  );

  return (
    <aside className="w-full lg:w-[400px] shrink-0 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Cabecera del panel */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Paperclip size={16} className="text-red-500 shrink-0" />
            <span className="text-sm font-semibold text-slate-700">Adjuntos del comprobante</span>
          </div>
          <p className="text-xs text-slate-500 font-mono truncate">
            Código #{selected.ccoCodigo} · {selected.dspComproba ?? ''}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0 ml-2"
        >
          <X size={16} />
        </button>
      </div>

      {/* Lista de adjuntos */}
      <div className="flex-1 overflow-y-auto p-4">
        {loadingImagenes ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : imagenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon size={40} className="text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">Sin adjuntos</p>
            <p className="text-xs text-slate-300 mt-1">Sube el primer archivo abajo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {imagenes.map((img) => (
              <AdjuntoCard key={img.ccoSecuencia} img={img} />
            ))}
          </div>
        )}
      </div>

      {/* Zona de subida */}
      <div className="p-4 border-t border-slate-100">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-colors ${
            dragOver
              ? 'border-red-400 bg-red-50'
              : 'border-slate-200 hover:border-red-300 hover:bg-slate-50'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="text-red-500 animate-spin" />
              <p className="text-xs text-slate-500">Subiendo adjunto…</p>
            </div>
          ) : (
            <>
              <Upload size={22} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500 mb-1">
                Arrastra un archivo o{' '}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-red-600 font-medium hover:underline focus:outline-none"
                >
                  selecciónalo
                </button>
              </p>
              <p className="text-xs text-slate-400">JPG, PNG, WEBP, GIF, HEIC, PDF · máx. 25 MB</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept={MIMES_PERMITIDOS}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
            disabled={uploading}
          />
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────
export default function ComprobantesPage() {
  const { profile } = useAuth();
  const usuario = profile?.full_name ?? profile?.id ?? 'USR';

  const { comprobantes, loading, error, refresh, selected, selectComprobante, imagenes, loadingImagenes, uploading, uploadImagen } =
    useComprobantes();

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return comprobantes;
    const term = search.toLowerCase();
    return comprobantes.filter(
      (c) =>
        String(c.ccoCodigo ?? '').includes(term) ||
        (c.dspComproba ?? '').toLowerCase().includes(term) ||
        (c.ccoConcepto ?? '').toLowerCase().includes(term) ||
        (c.ctiNombre ?? '').toLowerCase().includes(term) ||
        (c.almNombre ?? '').toLowerCase().includes(term)
    );
  }, [comprobantes, search]);

  const handleUpload = useCallback(
    (file: File) => {
      uploadImagen(file, String(usuario));
    },
    [uploadImagen, usuario]
  );

  return (
    <div className="animate-in fade-in duration-300">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-red-500" />
            Comprobantes Contables
            {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Listado de comprobantes. Selecciona uno para ver o subir adjuntos.
          </p>
        </div>

        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Error global */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Buscador */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código, concepto, tipo de diario, almacén…"
          className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Contenido principal: tabla + panel lateral */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Tabla */}
        <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <div className="h-8 bg-slate-100 rounded w-1/3 animate-pulse mb-4" />
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-14 bg-slate-50 rounded-lg animate-pulse border border-slate-100" />
              ))}
            </div>
          ) : (
            <>
              {/* Contador */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  {filtered.length} comprobante{filtered.length !== 1 ? 's' : ''}
                  {search && (
                    <span className="ml-1 text-slate-400">
                      (de {comprobantes.length} total)
                    </span>
                  )}
                </span>
                {selected && (
                  <span className="text-xs text-red-600 font-medium">
                    Seleccionado: #{selected.ccoCodigo}
                  </span>
                )}
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Receipt size={40} className="text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400">
                    {search ? 'Sin resultados para esa búsqueda' : 'No hay comprobantes disponibles'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Código</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Comprobante</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Concepto</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo diario</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Almacén</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Valor</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c, rowIndex) => (
                        <ComprobanteRow
                          key={
                            c.ccoCodigo != null
                              ? `cco-${c.ccoCodigo}-${rowIndex}`
                              : `row-${rowIndex}`
                          }
                          c={c}
                          isSelected={selected?.ccoCodigo === c.ccoCodigo}
                          onClick={() =>
                            selected?.ccoCodigo === c.ccoCodigo
                              ? selectComprobante(null)
                              : selectComprobante(c)
                          }
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Panel lateral de adjuntos */}
        {selected && (
          <AdjuntosPanel
            selected={selected}
            imagenes={imagenes}
            loadingImagenes={loadingImagenes}
            uploading={uploading}
            onUpload={handleUpload}
            onClose={() => selectComprobante(null)}
          />
        )}
      </div>

      <div className="mt-8 text-center text-xs text-slate-400">
        Fuente de datos: Vista Oracle LIST_CCOMPROBA_V · Adjuntos en Supabase Storage (bucket: comprobantes-adjuntos)
      </div>
    </div>
  );
}
