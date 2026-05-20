"use client";

import { useSubmoduleAccess } from "@/hooks/useSubmoduleAccess";
import { SubmoduleAccessDenied } from "@/components/layout/SubmoduleAccessDenied";
import { ManualScraperView } from "@/components/features/admin/opportunities/ManualScraperView";

export default function ScraperBusquedaManualPage() {
    const { isLoading: isAuthLoading, allowed } = useSubmoduleAccess("scraper-marketing");

    if (!isAuthLoading && !allowed) {
        return <SubmoduleAccessDenied moduleLabel="Scraper" />;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Búsqueda manual</h1>
                <p className="text-slate-500 mt-1">
                    Escanea Marketplace con el término que quieras. Usa el catálogo para buscar por marca y modelo.
                </p>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 inline-block">
                    Las búsquedas se realizan actualmente en Cuenca. Próximamente se podrá elegir ciudad o región.
                </p>
            </div>
            <ManualScraperView />
        </div>
    );
}
