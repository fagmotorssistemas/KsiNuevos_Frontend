import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  todayEcuadorDate,
  type SalesDailyProgressPayload,
  type SalesProgressEventRow,
  type SalesProgressSeller,
} from '@/types/sales-progress.types';

type BossStockRow = {
  vendedor_id: string;
  faltante_quedados?: number;
  asesoria_quedados?: number;
  pedidos_quedados?: number;
  faltante_sin_salir?: number;
  asesoria_sin_salir?: number;
  semana_contestados_pct?: number;
};

type BossStockPayload = {
  faltante_quedados?: number;
  asesoria_quedados?: number;
  pedidos_quedados?: number;
  faltante_sin_salir?: number;
  asesoria_sin_salir?: number;
  asesoria_respondidas?: number;
  semana_contestados_pct?: number;
  semana_ingresados?: number;
  semana_contestados?: number;
  ranking?: BossStockRow[];
};

function mergeBossStock(
  payload: SalesDailyProgressPayload,
  stock: BossStockPayload | null
): SalesDailyProgressPayload {
  const rankingStock = new Map((stock?.ranking ?? []).map((row) => [row.vendedor_id, row]));
  return {
    ...payload,
    faltante_quedados: Number(stock?.faltante_quedados ?? 0) || 0,
    asesoria_quedados: Number(stock?.asesoria_quedados ?? 0) || 0,
    pedidos_quedados: Number(stock?.pedidos_quedados ?? 0) || 0,
    faltante_sin_salir: Number(stock?.faltante_sin_salir ?? 0) || 0,
    asesoria_sin_salir: Number(stock?.asesoria_sin_salir ?? 0) || 0,
    asesoria_respondidas: Number(stock?.asesoria_respondidas ?? 0) || 0,
    semana_contestados_pct: Number(stock?.semana_contestados_pct ?? 0) || 0,
    semana_ingresados: Number(stock?.semana_ingresados ?? 0) || 0,
    semana_contestados: Number(stock?.semana_contestados ?? 0) || 0,
    ranking: payload.ranking.map((row) => {
      const extra = rankingStock.get(row.vendedor_id);
      return extra ? { ...row, ...extra } : { ...row, pedidos_quedados: row.pedidos_quedados ?? 0 };
    }),
  };
}

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

    const [{ data: payload, error: rpcError }, { data: stock }] = await Promise.all([
      supabase.rpc('get_sales_daily_progress', {
        p_fecha: fecha.slice(0, 10),
        p_vendedor_id: vendedorId ?? undefined,
      }),
      supabase.rpc('get_sales_progress_boss_stock', {
        p_fecha: fecha.slice(0, 10),
        p_vendedor_id: vendedorId ?? undefined,
      }),
    ]);

    if (rpcError) {
      setError(rpcError.message);
      setData(null);
      setIsLoading(false);
      return;
    }

    setData(mergeBossStock(payload as SalesDailyProgressPayload, (stock ?? null) as BossStockPayload | null));
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
