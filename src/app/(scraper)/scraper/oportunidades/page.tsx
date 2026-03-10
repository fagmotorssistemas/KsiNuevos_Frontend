"use client";

import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert } from "lucide-react";
import { useScraperData } from "@/hooks/useScraperData";
import { VehicleComparisonPanel } from "@/components/features/admin/opportunities/VehicleComparisonPanel";

export default function ScraperOportunidadesPage() {
    const { profile, isLoading: isAuthLoading } = useAuth();
    const { priceStatistics } = useScraperData();

    if (!isAuthLoading && (!profile || (profile.role !== "admin" && profile.role !== "vendedor" && profile.role !== "marketing"))) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50 text-slate-600">
                <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
                <h1 className="text-xl font-bold">Acceso restringido</h1>
                <p>No tienes permisos para ver el módulo Scraper.</p>
            </div>
        );
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
