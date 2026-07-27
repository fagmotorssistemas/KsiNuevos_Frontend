"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";

// Features
import { useLeads } from "@/hooks/useLeads";
import type { LeadWithDetails } from "@/types/leads.types";
import { LeadsList } from "@/components/features/leads/LeadsList";
import { LeadDetailModal } from "@/components/features/leads/Detail/LeadDetailModal";
import { LeadsToolbar } from "@/components/features/leads/LeadsToolbar";
import { LeadsExportPrintModal } from "@/components/features/leads/LeadsExportPrintModal";
import { Button } from "@/components/ui/buttontable";
import { useAuth } from "@/hooks/useAuth";

export default function LeadsPageClient() {
  const searchParams = useSearchParams();
  const {
    leads,
    totalCount,
    respondedCount, // Métrica 1
    interactionsCount,
    dayBreakdown,
    budgetCount,
    tradeInLeadsCount,
    requestStats,
    isLoading,
    sortDescriptor,
    setSortDescriptor,
    filters,
    updateFilter,
    resetFilters,
    reload,
    page,
    setPage,
    rowsPerPage,
    sellers,
  } = useLeads();

  const { profile, supabase } = useAuth();
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const [selectedLead, setSelectedLead] = useState<LeadWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const entryMode = searchParams.get("status") === "asesoria_financiamiento" ? "asesoria_financiamiento" : "default";

  const handleOpenModal = (lead: LeadWithDetails) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedLead(null);
    setIsModalOpen(false);
    reload();
  };

  return (
    // ESTRUCTURA SHOWROOM: max-w-7xl mx-auto centra y controla el ancho
    <div className="p-4 max-w-6xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Tablero de Leads</h1>
          <p className="text-md text-slate-500 mt-1">
            {profile ? `Hola, ${profile.full_name}` : "Gestión de prospectos"}
            <span className="ml-1 text-slate-400">• {totalCount} leads totales</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            size="sm"
            className="gap-2"
            onClick={() => setIsExportModalOpen(true)}
            disabled={isLoading}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar / Imprimir
          </Button>
          <Button variant="secondary" size="sm" onClick={reload} disabled={isLoading}>
            {isLoading ? "Actualizando..." : "Actualizar Datos"}
          </Button>
        </div>
      </div>

      <LeadsToolbar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        totalResults={totalCount}
        respondedCount={respondedCount}
        interactionsCount={interactionsCount}
        dayBreakdown={dayBreakdown}
        budgetCount={budgetCount}
        tradeInLeadsCount={tradeInLeadsCount}
        requestStats={requestStats}
        currentUserRole={profile?.role}
        sellers={sellers}
      />

      <LeadsList
        leads={leads}
        isLoading={isLoading}
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
        onLeadSelect={handleOpenModal}
        page={page}
        totalCount={totalCount}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        currentUserRole={profile?.role}
      />

      {isModalOpen && selectedLead && (
        <LeadDetailModal lead={selectedLead} onClose={handleCloseModal} entryMode={entryMode} />
      )}

      <LeadsExportPrintModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        supabase={supabase}
        baseFilters={filters}
        isAdmin={isAdmin}
      />
    </div>
  );
}

