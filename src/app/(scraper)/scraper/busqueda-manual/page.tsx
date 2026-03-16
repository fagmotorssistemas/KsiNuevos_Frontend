"use client";

import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert } from "lucide-react";
import { ManualScraperView } from "@/components/features/admin/opportunities/ManualScraperView";

export default function ScraperBusquedaManualPage() {
    const { profile, isLoading: isAuthLoading } = useAuth();

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
