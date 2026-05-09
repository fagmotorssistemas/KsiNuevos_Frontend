import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { comprobantesService } from '@/services/comprobantes.service';
import { Comprobante, ComprobanteImagen } from '@/types/comprobantes.types';

export const useComprobantes = (empresa?: number) => {
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelectedState] = useState<Comprobante | null>(null);
  const [imagenes, setImagenes] = useState<ComprobanteImagen[]>([]);
  const [loadingImagenes, setLoadingImagenes] = useState(false);
  const [uploading, setUploading] = useState(false);

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
    async (ccoCodigo: number) => {
      try {
        setLoadingImagenes(true);
        const data = await comprobantesService.getImagenes(ccoCodigo, empresa);
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
        fetchImagenes(c.ccoCodigo as number);
      }
    },
    [fetchImagenes]
  );

  const uploadImagen = useCallback(
    async (file: File, usuario: string) => {
      if (selected?.ccoCodigo == null) return;
      try {
        setUploading(true);
        const nueva = await comprobantesService.uploadImagen(
          selected.ccoCodigo as number,
          file,
          usuario,
          empresa
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
  };
};
