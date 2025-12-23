import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { AdminDateFilter } from "@/hooks/useAdminStats";

const IGNORED_USER_ID = '920fe992-8f4a-4866-a9b6-02f6009fc7b3';

export type VehicleStat = {
    vehicle_uid: string;
    brand: string;
    model: string;
    year: number;
    img_url?: string;
    price?: number;
    status?: string | null;
    total_leads: number;
    responded_leads: number;
    pending_leads: number;
    showroom_count: number;
    response_rate: number;
};

export type OpportunityStat = {
    key: string;
    brand: string;
    model: string;
    request_count: number;
    last_requested_at: string;
};

export function useVehicleStats(
    dateFilter: AdminDateFilter, 
    customDate: string,
    inventoryStatusFilter: string = 'disponible'
) {
    const { supabase } = useAuth();
    
    const [inventoryStats, setInventoryStats] = useState<VehicleStat[]>([]);
    const [opportunityStats, setOpportunityStats] = useState<OpportunityStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const getDateRangeISO = useCallback(() => {
        const now = new Date();
        let start = new Date();
        let end = new Date();
        end.setHours(23, 59, 59, 999);

        if (dateFilter === 'today') {
            start.setHours(0, 0, 0, 0);
        } else if (dateFilter === '7days') {
            start.setDate(now.getDate() - 7);
            start.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'thisMonth') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'custom') {
            const [year, month, day] = customDate.split('-').map(Number);
            start = new Date(year, month - 1, day, 0, 0, 0, 0);
            end = new Date(year, month - 1, day, 23, 59, 59, 999);
        }

        return { startISO: start.toISOString(), endISO: end.toISOString() };
    }, [dateFilter, customDate]);

    const fetchVehicleStats = useCallback(async () => {
        setIsLoading(true);
        const { startISO, endISO } = getDateRangeISO();

        // DEBUG: Inicio del diagnóstico
        console.groupCollapsed(`🔍 Diagnóstico Stats: ${dateFilter}`);
        console.log(`📅 Rango de Fechas: ${startISO} -> ${endISO}`);
        console.log(`🚗 Filtro Inventario: ${inventoryStatusFilter}`);

        try {
            // 1. CARGAR INVENTARIO
            let inventoryQuery = supabase
                .from('inventory')
                .select('id, brand, model, year, img_main_url, price, status')
                .limit(2000); 
            
            if (inventoryStatusFilter !== 'todos') {
                inventoryQuery = inventoryQuery.eq('status', inventoryStatusFilter as any);
            }

            const { data: inventoryData, error: invError } = await inventoryQuery;
            if (invError) throw invError;
            
            console.log(`✅ Inventario cargado: ${inventoryData?.length || 0} vehículos`);

            const inventoryIndex = new Map<string, any>();
            const invStatsMap = new Map<string, VehicleStat>();

            inventoryData?.forEach(car => {
                if (car.brand && car.model) {
                    const searchKey = `${car.brand.trim().toLowerCase()}-${car.model.trim().toLowerCase()}`;
                    if (!inventoryIndex.has(searchKey)) {
                        inventoryIndex.set(searchKey, car);
                    }

                    invStatsMap.set(car.id, {
                        vehicle_uid: car.id,
                        brand: car.brand,
                        model: car.model,
                        year: car.year,
                        //img_url: car.img_main_url,
                        price: car.price,
                        status: car.status,
                        total_leads: 0,
                        responded_leads: 0,
                        pending_leads: 0,
                        showroom_count: 0,
                        response_rate: 0
                    });
                }
            });

            // 2. CARGAR LEADS (PAGINACIÓN AUTOMÁTICA)
            // Fix: Usamos un bucle para descargar TODOS los leads en bloques de 1000
            // para superar el límite duro de Supabase.
            let allLeads: any[] = [];
            let hasNextPage = true;
            let page = 0;
            const PAGE_SIZE = 1000;
            let totalCountInDB = 0;

            console.time("⏳ Descarga de Leads");

            while (hasNextPage) {
                const from = page * PAGE_SIZE;
                const to = (page + 1) * PAGE_SIZE - 1;

                const { data: leadsPage, error: leadsError, count } = await supabase
                    .from('leads')
                    .select(`
                        id,
                        resume,
                        assigned_to, 
                        created_at, 
                        updated_at,
                        interested_cars (
                            brand,
                            model,
                            year,
                            vehicle_uid
                        )
                    `, { count: 'exact' })
                    .gte('created_at', startISO)
                    .lte('created_at', endISO)
                    .range(from, to);

                if (leadsError) throw leadsError;

                if (page === 0 && count !== null) {
                    totalCountInDB = count;
                }

                if (leadsPage && leadsPage.length > 0) {
                    allLeads = [...allLeads, ...leadsPage];
                    // Si la página trajo menos del límite, es la última
                    if (leadsPage.length < PAGE_SIZE) {
                        hasNextPage = false;
                    }
                } else {
                    hasNextPage = false;
                }

                page++;
                // Freno de emergencia (por si acaso hay millones de leads y congelamos el browser)
                if (page > 20) { // Límite de 20,000 leads
                    console.warn("⚠️ Se detuvo la carga en 20,000 leads por seguridad.");
                    hasNextPage = false;
                }
            }
            
            console.timeEnd("⏳ Descarga de Leads");

            // DIAGNÓSTICO DE LEADS
            console.log(`📥 Leads descargados TOTALES: ${allLeads.length}`);
            console.log(`🔢 Leads totales en DB (Count): ${totalCountInDB}`);

            if (allLeads.length < totalCountInDB) {
                 console.warn(`⚠️ ALERTA: Aún faltan leads. Descargados: ${allLeads.length}, Total Real: ${totalCountInDB}`);
            } else {
                console.log("✅ Descarga completa: El 100% de los datos está en memoria.");
            }

            // 3. CARGAR SHOWROOM VISITS
            const { data: visitsData, error: visitsError } = await supabase
                .from('showroom_visits')
                .select('inventory_id')
                .gte('created_at', startISO)
                .lte('created_at', endISO)
                .not('inventory_id', 'is', null)
                .limit(2000); 

            if (visitsError) throw visitsError;

            // 4. PROCESAR LEADS (Usamos allLeads en lugar de leadsData)
            const oppStatsMap = new Map<string, OpportunityStat>();

            allLeads.forEach((lead: any) => {
                if (lead.assigned_to === IGNORED_USER_ID) return;

                const cars = Array.isArray(lead.interested_cars) ? lead.interested_cars : [lead.interested_cars];

                cars.forEach((c: any) => {
                    if (!c || !c.brand || !c.model) return;

                    let matchedCarId: string | null = null;
                    
                    // Match por ID
                    if (c.vehicle_uid && invStatsMap.has(c.vehicle_uid)) {
                        matchedCarId = c.vehicle_uid;
                    } else {
                        // Match por Texto
                        const searchKey = `${c.brand.trim().toLowerCase()}-${c.model.trim().toLowerCase()}`;
                        if (inventoryIndex.has(searchKey)) {
                            const potentialCar = inventoryIndex.get(searchKey);
                            if (invStatsMap.has(potentialCar.id)) {
                                matchedCarId = potentialCar.id;
                            }
                        }
                    }

                    if (matchedCarId) {
                        const stat = invStatsMap.get(matchedCarId)!;
                        stat.total_leads += 1;
                        
                        const isResponded = lead.resume && lead.resume.trim().length > 0;
                        if (isResponded) {
                            stat.responded_leads += 1;
                        } else {
                            stat.pending_leads += 1;
                        }
                    } else {
                        const oppKey = `${c.brand.trim().toLowerCase()}-${c.model.trim().toLowerCase()}`;
                        if (!oppStatsMap.has(oppKey)) {
                            oppStatsMap.set(oppKey, {
                                key: oppKey,
                                brand: c.brand,
                                model: c.model,
                                request_count: 0,
                                last_requested_at: lead.created_at
                            });
                        }
                        const opp = oppStatsMap.get(oppKey)!;
                        opp.request_count += 1;
                        if (new Date(lead.created_at) > new Date(opp.last_requested_at)) {
                            opp.last_requested_at = lead.created_at;
                        }
                    }
                });
            });

            // 5. PROCESAR SHOWROOM VISITS
            visitsData?.forEach((visit) => {
                if (visit.inventory_id && invStatsMap.has(visit.inventory_id)) {
                    const stat = invStatsMap.get(visit.inventory_id)!;
                    stat.showroom_count += 1;
                }
            });

            // 6. FORMATO FINAL
            const finalInvStats = Array.from(invStatsMap.values())
                .filter(s => s.total_leads > 0 || s.showroom_count > 0) 
                .map(stat => ({
                    ...stat,
                    response_rate: stat.total_leads > 0 
                        ? Math.round((stat.responded_leads / stat.total_leads) * 100) 
                        : 0
                }));
            
            finalInvStats.sort((a, b) => b.total_leads - a.total_leads);

            const finalOppStats = Array.from(oppStatsMap.values());
            finalOppStats.sort((a, b) => b.request_count - a.request_count);
            
            // DEBUG RESULTADOS
            const totalLeadsProcesados = finalInvStats.reduce((acc, curr) => acc + curr.total_leads, 0);
            const totalOportunidades = finalOppStats.reduce((acc, curr) => acc + curr.request_count, 0);
            
            console.log(`📊 RESULTADO FINAL:`);
            console.log(`   - Leads en Inventario ("${inventoryStatusFilter}"): ${totalLeadsProcesados}`);
            console.log(`   - Leads en Oportunidades (No coinciden o vendidos): ${totalOportunidades}`);
            console.log(`   - TOTAL SUMADO: ${totalLeadsProcesados + totalOportunidades}`);
            console.groupEnd();

            setInventoryStats(finalInvStats);
            setOpportunityStats(finalOppStats);

        } catch (err) {
            console.error("Error fetching vehicle stats:", err);
            console.groupEnd();
        } finally {
            setIsLoading(false);
        }
    }, [supabase, getDateRangeISO, inventoryStatusFilter]);

    useEffect(() => {
        fetchVehicleStats();
    }, [fetchVehicleStats]);

    return {
        inventoryStats,
        opportunityStats,
        isVehicleLoading: isLoading,
        reloadVehicles: fetchVehicleStats
    };
}