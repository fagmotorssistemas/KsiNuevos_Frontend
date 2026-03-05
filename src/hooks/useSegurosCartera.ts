"use client";

import { useState, useEffect, useCallback } from "react";
import { segurosService } from "@/services/seguros.service";
import { walletService } from "@/services/wallet.service";
import type { SeguroVehicular } from "@/types/seguros.types";

export interface SeguroEnriquecido {
  totalCuotas: number;
  cuotaSeguroMensual: number;
  vencimientoPoliza: string | null; // 1 año desde fechaEmision
  diasParaVencimientoSeguro: number | null;
  alertaRenovacion: boolean; // true si faltan ≤ 2 meses para vencimiento (comprar 2º año)
  esCredito: boolean;
}

export function useSegurosCartera() {
  const [loading, setLoading] = useState(true);
  const [seguros, setSeguros] = useState<SeguroVehicular[]>([]);
  const [enrichedData, setEnrichedData] = useState<Map<string, SeguroEnriquecido>>(new Map());

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await segurosService.obtenerSeguros();
      setSeguros(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Enriquecer con cartera (crédito/contado) y vencimiento póliza 1 año + alerta 2 meses
  useEffect(() => {
    const enrich = async () => {
      const next = new Map<string, SeguroEnriquecido>();

      for (const item of seguros) {
        const valorSeguro = item.valores.total; // solo seguro (1 año)
        const fechaEmision = item.fechaEmision;

        // Vencimiento póliza = 1 año desde emisión (seguro es por 1 año)
        let vencimientoPoliza: string | null = null;
        let diasParaVencimientoSeguro: number | null = null;
        try {
          const d = new Date(fechaEmision);
          d.setFullYear(d.getFullYear() + 1);
          vencimientoPoliza = d.toISOString().split("T")[0];
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          const venc = new Date(vencimientoPoliza);
          venc.setHours(0, 0, 0, 0);
          diasParaVencimientoSeguro = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        } catch (_) {}

        // Alerta: antes de 2 meses que cumpla el año → hay que comprar seguro 2º año
        const alertaRenovacion =
          diasParaVencimientoSeguro != null &&
          diasParaVencimientoSeguro <= 60 &&
          diasParaVencimientoSeguro > 0;

        // ¿Crédito? Buscar en cartera por nota de venta
        let esCredito = false;
        let totalCuotas = 12;
        let cuotaSeguroMensual = valorSeguro;

        if (item.referencia) {
          try {
            const doc = await walletService.getDocumentoByNumeroFisico(item.referencia);
            if (doc && doc.totalCuotas != null && doc.totalCuotas > 0) {
              esCredito = true;
              totalCuotas = doc.totalCuotas;
              cuotaSeguroMensual = valorSeguro / totalCuotas;
            }
          } catch (_) {}
        }

        next.set(item.id, {
          totalCuotas,
          cuotaSeguroMensual,
          vencimientoPoliza,
          diasParaVencimientoSeguro,
          alertaRenovacion,
          esCredito,
        });
      }

      setEnrichedData(next);
    };

    if (seguros.length > 0) {
      enrich();
    } else {
      setEnrichedData(new Map());
    }
  }, [seguros]);

  const creditos = seguros.filter((s) => enrichedData.get(s.id)?.esCredito ?? false);
  const contados = seguros.filter((s) => !(enrichedData.get(s.id)?.esCredito ?? false));
  const conAlertaRenovacion = seguros.filter((s) => enrichedData.get(s.id)?.alertaRenovacion ?? false);

  return {
    seguros,
    loading,
    enrichedData,
    cargar,
    creditos,
    contados,
    conAlertaRenovacion,
  };
}
