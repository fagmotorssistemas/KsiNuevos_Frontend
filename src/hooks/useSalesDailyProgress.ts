import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  todayEcuadorDate,
  type SalesDailyProgressPayload,
  type SalesProgressEventRow,
  type SalesProgressSeller,
} from '@/types/sales-progress.types';

export function useSalesDailyProgress() {
  const { supabase, user } = useAuth();
  const [fecha, setFecha] = useState(todayEcuadorDate);
  const [vendedorId, setVendedorId] = useState<string | null>(null);
  const [data, setData] = useState<SalesDailyProgressPayload | null>(null);
  const [sellers, setSellers] = useState<SalesProgressSeller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [events, setEvents] = useState<SalesProgressEventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const autoPicked = useRef(false);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    const { data: payload, error: rpcError } = await supabase.rpc('get_sales_daily_progress', {
      p_fecha: fecha.slice(0, 10),
      p_vendedor_id: vendedorId ?? undefined,
    });

    if (rpcError) {
      setError(rpcError.message);
      setData(null);
      setIsLoading(false);
      return;
    }

    setData(payload as SalesDailyProgressPayload);
    setIsLoading(false);
  }, [supabase, user, fecha, vendedorId]);

  const openCategory = useCallback(
    async (categoria: string) => {
      const seller = vendedorId ?? data?.vendedor_id;
      if (!user || !seller) return;
      setSelectedCategory(categoria);
      setEventsLoading(true);
      const { data: rows, error: eventsError } = await supabase.rpc('get_sales_progress_events', {
        p_fecha: fecha.slice(0, 10),
        p_vendedor_id: seller,
        p_categoria: categoria,
      });
      if (eventsError) {
        setEvents([]);
        setEventsLoading(false);
        return;
      }
      setEvents(Array.isArray(rows) ? (rows as SalesProgressEventRow[]) : []);
      setEventsLoading(false);
    },
    [supabase, user, fecha, vendedorId, data?.vendedor_id]
  );

  useEffect(() => {
    setSelectedCategory(null);
    setEvents([]);
  }, [fecha, vendedorId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void supabase.rpc('get_sales_progress_sellers').then(({ data: rows }) => {
      if (cancelled || !rows) return;
      setSellers(Array.isArray(rows) ? (rows as SalesProgressSeller[]) : []);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  useEffect(() => {
    if (autoPicked.current || !data?.es_admin || vendedorId) return;
    const inRanking = data.ranking.some((row) => row.vendedor_id === data.vendedor_id);
    if (!inRanking && data.ranking[0]) {
      autoPicked.current = true;
      setVendedorId(data.ranking[0].vendedor_id);
    }
  }, [data, vendedorId]);

  return {
    fecha,
    setFecha,
    vendedorId,
    setVendedorId,
    data,
    sellers,
    isLoading,
    error,
    reload: load,
    selectedCategory,
    events,
    eventsLoading,
    openCategory,
    closeCategory: () => {
      setSelectedCategory(null);
      setEvents([]);
    },
  };
}
