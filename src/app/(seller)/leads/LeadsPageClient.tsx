"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";

// Features
import { useLeads } from "@/hooks/useLeads";
import { useLeadCallRequests } from "@/hooks/useLeadCallRequests";
import type { LeadWithDetails } from "@/types/leads.types";
import { LeadsList } from "@/components/features/leads/LeadsList";
import { LeadDetailModal } from "@/components/features/leads/Detail/LeadDetailModal";
import { LeadCallRequestModal } from "@/components/features/leads/LeadCallRequestModal";
import { LeadsToolbar } from "@/components/features/leads/LeadsToolbar";
import { LeadsExportPrintModal } from "@/components/features/leads/LeadsExportPrintModal";
import { Button } from "@/components/ui/buttontable";
import { useAuth } from "@/hooks/useAuth";
import { fetchLeadById } from "@/services/leads.service";

export default function LeadsPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    leads,
    totalCount,
    respondedCount, // Métrica 1
    interactionsCount,
    dayBreakdown,
    budgetCount,
    tradeInLeadsCount,
    callStats,
    callHistory,
    requestStats,
    isLoading,
    sortDescriptor,
    setSortDescriptor,
    filters,
    appliedSearchQuery,
    updateFilter,
    resetFilters,
    reload,
    page,
    setPage,
    rowsPerPage,
    sellers,
  } = useLeads();

  const {
    current: callRequestLead,
    remaining: callRequestRemaining,
    submitting: callRequestSubmitting,
    markManaged,
    postpone,
  } = useLeadCallRequests();

  const { profile, supabase, isAdminLike } = useAuth();
  const isAdmin = isAdminLike;
  const ventasRole = isAdminLike ? "admin" : profile?.role;

  const [selectedLead, setSelectedLead] = useState<LeadWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const entryMode = searchParams.get("status") === "asesoria_financiamiento" ? "asesoria_financiamiento" : "default";
  const leadParam = searchParams.get("lead");
  const tabParam = searchParams.get("tab");

  useEffect(() => {
    const id = Number(leadParam);
    if (!leadParam || !Number.isFinite(id) || id <= 0) return;
    let cancelled = false;
    void fetchLeadById(supabase, id).then((lead) => {
      if (cancelled || !lead) return;
      setSelectedLead(lead);
      setIsModalOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [leadParam, supabase]);

  const handleOpenModal = (lead: LeadWithDetails) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedLead(null);
    setIsModalOpen(false);
    reload();
    if (!leadParam) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("lead");
    params.delete("tab");
    const qs = params.toString();
    router.replace(qs ? `/leads?${qs}` : "/leads");
  };

  return (
    // ESTRUCTURA SHOWROOM: max-w-7xl mx-auto centra y controla el ancho
    <div className="p-4 w-full space-y-6 bg-gray-50 min-h-screen">
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
        callStats={callStats}
        callHistory={callHistory}
        requestStats={requestStats}
        currentUserRole={ventasRole}
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
        currentUserRole={ventasRole}
        searchQuery={appliedSearchQuery}
      />

      {isModalOpen && selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={handleCloseModal}
          entryMode={entryMode}
          initialTab={tabParam}
        />
      )}

      <LeadsExportPrintModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        supabase={supabase}
        baseFilters={filters}
        isAdmin={isAdmin}
      />

      {callRequestLead && (
        <LeadCallRequestModal
          lead={callRequestLead}
          remaining={callRequestRemaining}
          submitting={callRequestSubmitting}
          onManaged={async () => {
            await markManaged();
            reload();
          }}
          onPostpone={async (reason, untilIso) => {
            await postpone(reason, untilIso);
            reload();
          }}
        />
      )}
    </div>
  );
}

