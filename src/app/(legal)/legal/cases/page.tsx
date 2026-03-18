"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, Plus, RefreshCw } from "lucide-react";

type CaseListRow = {
  id: string;
  id_sistema: number;
  estado: string | null;
  prioridad: string | null;
  riesgo: string | null;
  proxima_accion: string | null;
  fecha_proxima_accion: string | null;
  fecha_ultima_gestion: string | null;
  monto_referencia: number | null;
};

export default function LegalCasesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<CaseListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get("q") || searchParams.get("id_sistema") || "");

  const fetchCases = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cases")
      .select(
        "id,id_sistema,estado,prioridad,riesgo,proxima_accion,fecha_proxima_accion,fecha_ultima_gestion,monto_referencia"
      )
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error(error);
      setRows([]);
    } else {
      setRows((data as any) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => {
      const idSistema = String(r.id_sistema ?? "");
      return idSistema.includes(query) || (r.estado || "").toLowerCase().includes(query);
    });
  }, [rows, q]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Casos legales</h1>
          <p className="text-slate-500 text-sm mt-1">
            Solo se guarda <span className="font-mono">id_sistema</span>. Datos del cliente viven en Oracle.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCases}
            className="h-10 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 text-sm font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>

          <Link
            href="/legal/cases/new"
            className="h-10 px-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition flex items-center gap-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Nuevo caso
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por id_sistema o estado..."
            className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-slate-200 text-sm"
          />
          <div className="text-[11px] text-slate-400 font-mono px-2">{filtered.length}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold text-slate-600">
                <th className="px-5 py-3">id_sistema</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 hidden lg:table-cell">Próxima acción</th>
                <th className="px-5 py-3 hidden md:table-cell">Fecha próxima</th>
                <th className="px-5 py-3 hidden md:table-cell">Última gestión</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td className="px-5 py-6 text-sm text-slate-500" colSpan={6}>
                    Cargando casos…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-sm text-slate-500" colSpan={6}>
                    No hay casos para mostrar.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 text-sm font-mono text-slate-900">#{c.id_sistema}</td>
                    <td className="px-5 py-4 text-sm">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {c.estado || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700 hidden lg:table-cell">
                      {c.proxima_accion || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 hidden md:table-cell">
                      {c.fecha_proxima_accion ? new Date(c.fecha_proxima_accion).toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 hidden md:table-cell">
                      {c.fecha_ultima_gestion ? new Date(c.fecha_ultima_gestion).toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/legal/cases/${c.id}`}
                        className="inline-flex items-center justify-center h-9 px-3 rounded-full bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-700 transition text-xs font-semibold"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

