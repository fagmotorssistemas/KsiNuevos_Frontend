import { useCallback, useEffect, useState } from 'react';
import { formalProgressService } from '@/services/formalProgress.service';
import {
  todayEcuadorDate,
  type FormalDailyProgressPayload,
  type FormalProgressCategoryId,
  type FormalProgressEventRow,
} from '@/types/formal-progress.types';

export function useFormalDailyProgress() {
  const [fecha, setFecha] = useState(todayEcuadorDate);
  const [data, setData] = useState<FormalDailyProgressPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FormalProgressCategoryId | null>(
    null,
  );
  const [events, setEvents] = useState<FormalProgressEventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await formalProgressService.getDailyProgress(fecha);
      setData(payload);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'No se pudo calcular el progreso Formal');
    } finally {
      setIsLoading(false);
    }
  }, [fecha]);

  const openCategory = useCallback(
    async (categoria: FormalProgressCategoryId) => {
      setSelectedCategory(categoria);
      setEventsLoading(true);
      try {
        const rows = await formalProgressService.getCategoryEvents(fecha, categoria);
        setEvents(rows);
      } catch {
        setEvents([]);
      } finally {
        setEventsLoading(false);
      }
    },
    [fecha],
  );

  useEffect(() => {
    setSelectedCategory(null);
    setEvents([]);
  }, [fecha]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    fecha,
    setFecha,
    data,
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

export function useFormalProgressCoverage() {
  const [cobertura, setCobertura] = useState<number | null>(null);
  const [agendaDue, setAgendaDue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void formalProgressService
      .getDailyProgress(todayEcuadorDate())
      .then((payload) => {
        if (cancelled) return;
        setCobertura(payload.cobertura);
        setAgendaDue(payload.agenda_due);
      })
      .catch(() => {
        if (!cancelled) {
          setCobertura(null);
          setAgendaDue(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { cobertura, agendaDue, loading };
}
