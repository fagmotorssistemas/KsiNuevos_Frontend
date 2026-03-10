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
            </div>
            <ManualScraperView />
        </div>
    );
}
