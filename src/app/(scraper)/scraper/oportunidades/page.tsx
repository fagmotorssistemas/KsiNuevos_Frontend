"use client";

import { useSubmoduleAccess } from "@/hooks/useSubmoduleAccess";
import { SubmoduleAccessDenied } from "@/components/layout/SubmoduleAccessDenied";
import { useScraperData } from "@/hooks/useScraperData";
import { VehicleComparisonPanel } from "@/components/features/admin/opportunities/VehicleComparisonPanel";

export default function ScraperOportunidadesPage() {
    const { isLoading: isAuthLoading, allowed } = useSubmoduleAccess("scraper-marketing");
    const { priceStatistics } = useScraperData();

    if (!isAuthLoading && !allowed) {
        return <SubmoduleAccessDenied moduleLabel="Scraper" />;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mejores oportunidades</h1>
                <p className="text-slate-500 mt-1">
                    Vehículos con mejor relación precio-mercado, agrupados por marca, modelo y año.
                </p>
            </div>
            <VehicleComparisonPanel priceStatistics={priceStatistics} limit={6} />
        </div>
    );
}
