import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { comprobantesService, normalizeCcoCodigo } from '@/services/comprobantes.service';
import { Comprobante, ComprobanteImagen } from '@/types/comprobantes.types';

export const useComprobantes = (empresa?: number) => {
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelectedState] = useState<Comprobante | null>(null);
  const [imagenes, setImagenes] = useState<ComprobanteImagen[]>([]);
  const [loadingImagenes, setLoadingImagenes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingSecuencia, setDeletingSecuencia] = useState<number | null>(null);

  const fetchComprobantes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await comprobantesService.getListado(empresa);
      setComprobantes(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'No se pudo cargar el listado de comprobantes.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [empresa]);

  const fetchImagenes = useCallback(
    async (ccoCodigo: string, ccoEmpresa?: number | null) => {
      try {
        setLoadingImagenes(true);
        const data = await comprobantesService.getImagenes(
          ccoCodigo,
          ccoEmpresa ?? empresa
        );
        setImagenes(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'No se pudo cargar los adjuntos.';
        toast.error(msg);
        setImagenes([]);
      } finally {
        setLoadingImagenes(false);
      }
    },
    [empresa]
  );

  const selectComprobante = useCallback(
    (c: Comprobante | null) => {
      setSelectedState(c);
      setImagenes([]);
      if (c?.ccoCodigo != null) {
        const codigo = normalizeCcoCodigo(c.ccoCodigo);
        if (!codigo) {
          toast.error('El código del comprobante llegó corrupto desde el backend. Pídele al backend que envíe ccoCodigo como string en el JSON.');
          return;
        }
        fetchImagenes(codigo, c.ccoEmpresa);
      }
    },
    [fetchImagenes]
  );

  const uploadImagen = useCallback(
    async (file: File, usuario: string) => {
      if (selected?.ccoCodigo == null) return;
      const codigo = normalizeCcoCodigo(selected.ccoCodigo);
      if (!codigo) {
        toast.error('El código del comprobante es inválido (probablemente corrupto por JSON number). El backend debe enviar ccoCodigo como string.');
        return;
      }
      try {
        setUploading(true);
        const nueva = await comprobantesService.uploadImagen(
          codigo,
          file,
          usuario,
          selected.ccoEmpresa ?? empresa
        );
        setImagenes((prev) => [...prev, nueva]);
        toast.success('Adjunto subido correctamente');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al subir el adjunto.';
        toast.error(msg);
      } finally {
        setUploading(false);
      }
    },
    [selected, empresa]
  );

  const deleteImagen = useCallback(
    async (ccoSecuencia: number) => {
      if (selected?.ccoCodigo == null) return;
      const codigo = normalizeCcoCodigo(selected.ccoCodigo);
      if (!codigo) {
        toast.error('El código del comprobante es inválido.');
        return;
      }
      if (!window.confirm('¿Eliminar este adjunto? Esta acción no se puede deshacer.')) return;

      try {
        setDeletingSecuencia(ccoSecuencia);
        await comprobantesService.deleteImagen(
          codigo,
          ccoSecuencia,
          selected.ccoEmpresa ?? empresa
        );
        setImagenes((prev) => prev.filter((img) => img.ccoSecuencia !== ccoSecuencia));
        toast.success('Adjunto eliminado');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al eliminar el adjunto.';
        toast.error(msg);
      } finally {
        setDeletingSecuencia(null);
      }
    },
    [selected, empresa]
  );

  useEffect(() => {
    fetchComprobantes();
  }, [fetchComprobantes]);

  return {
    comprobantes,
    loading,
    error,
    refresh: fetchComprobantes,
    selected,
    selectComprobante,
    imagenes,
    loadingImagenes,
    uploading,
    uploadImagen,
    deletingSecuencia,
    deleteImagen,
  };
};
