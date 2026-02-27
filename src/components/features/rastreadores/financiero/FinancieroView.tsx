"use client";

import { useEffect, useState } from "react";
import { rastreadoresService } from "@/services/rastreadores.service";
import { FinancialKPIs } from "./FinancialKPIs";
import { RefreshCw } from "lucide-react";

export function FinancieroView() {
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState<any>(null);

    const loadData = async () => {
        setLoading(true);
        const data = await rastreadoresService.getKpisFinancieros();
        setKpis(data);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Finanzas</h2>
                    <p className="text-sm text-slate-500 font-medium">Rentabilidad en tiempo real</p>
                </div>
                <button 
                    onClick={loadData} 
                    disabled={loading}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all disabled:animate-spin"
                >
                    <RefreshCw size={20}/>
                </button>
            </div>

            <FinancialKPIs data={kpis} loading={loading} />
        </div>
    );
}