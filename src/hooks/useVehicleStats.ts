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
    year?: number | null;
    request_count: number;
    last_requested_at: string;
};

// --- HELPER DE NORMALIZACIÓN MEJORADO ---
// Este helper es clave: convierte "D-Max Hi-Ride" en "dmaxhiride"
// para asegurar que variaciones de escritura se detecten como lo mismo.
const normalizeStr = (str: string) => {
    if (!str) return "";
    return str
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita tildes
        .replace(/[^a-z0-9]/g, ""); // Quita TODO lo que no sea letra o número
};

// --- HELPER DE EXTRACCIÓN NUMÉRICA ---
const extractNumbers = (str: string): string[] => {
    return str.match(/\d+/g) || [];
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
        
        // Configuramos el final del día por defecto
        end.setHours(23, 59, 59, 999);

        if (dateFilter === 'today') {
            start.setHours(0, 0, 0, 0);
        } else if (dateFilter === '7days') {
            start.setDate(now.getDate() - 7);
            start.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'thisMonth') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'lastMonth') {
            // --- AGREGADO: Lógica para Mes Pasado ---
            // 1. Ir al primer día del mes anterior
            start.setMonth(now.getMonth() - 1);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);

            // 2. Ir al último día del mes anterior
            // (El día 0 del mes actual nos da el último día del mes previo automáticamente)
            end = new Date(now.getFullYear(), now.getMonth(), 0);
            end.setHours(23, 59, 59, 999);
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

        console.groupCollapsed(`🔍 Diagnóstico Stats Mejorado: ${dateFilter}`);

        try {
            // 1. CARGAR INVENTARIO
            let inventoryQuery = supabase
                .from('inventory')
                .select('id, brand, model, year, img_main_url, price, status')
                .limit(2000); 
            
            // Nota: Para el análisis de oportunidades, necesitamos saber qué hay DISPONIBLE
            // independientemente del filtro visual, para poder excluirlo de "Demanda Insatisfecha"
            // Por eso cargaremos todo el inventario relevante en memoria primero si es posible,
            // pero respetaremos el filtro para la visualización de la tabla de rendimiento.
            if (inventoryStatusFilter !== 'todos') {
                inventoryQuery = inventoryQuery.eq('status', inventoryStatusFilter as any);
            }

            const { data: inventoryData, error: invError } = await inventoryQuery;
            if (invError) throw invError;
            
            const invStatsMap = new Map<string, VehicleStat>();
            
            // LISTA INTELIGENTE PARA BÚSQUEDA DIFUSA
            // Ahora guardamos también la cadena normalizada simple para comparación rápida
            const fuzzyInventoryList: { 
                normalizedName: string, 
                simpleNormalized: string, // nueva propiedad para comparación laxa
                numbers: string[], 
                id: string, 
                brand: string, 
                model: string 
            }[] = [];

            inventoryData?.forEach(car => {
                if (car.brand && car.model) {
                    invStatsMap.set(car.id, {
                        vehicle_uid: car.id,
                        brand: car.brand,
                        model: car.model,
                        year: car.year,
                        img_url: car.img_main_url || undefined,
                        price: car.price,
                        status: car.status,
                        total_leads: 0,
                        responded_leads: 0,
                        pending_leads: 0,
                        showroom_count: 0,
                        response_rate: 0
                    });

                    const fullName = `${car.brand} ${car.model}`;
                    const norm = normalizeStr(fullName);
                    
                    fuzzyInventoryList.push({
                        normalizedName: norm,
                        simpleNormalized: norm, 
                        numbers: extractNumbers(fullName),
                        brand: car.brand,
                        model: car.model,
                        id: car.id
                    });
                }
            });

            // 2. CARGAR LEADS
            let allLeads: any[] = [];
            let hasNextPage = true;
            let page = 0;
            const PAGE_SIZE = 1000;

            while (hasNextPage) {
                const from = page * PAGE_SIZE;
                const to = (page + 1) * PAGE_SIZE - 1;

                const { data: leadsPage, error: leadsError } = await supabase
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
                    `)
                    .gte('created_at', startISO)
                    .lte('created_at', endISO)
                    .range(from, to);

                if (leadsError) throw leadsError;

                if (leadsPage && leadsPage.length > 0) {
                    allLeads = [...allLeads, ...leadsPage];
                    if (leadsPage.length < PAGE_SIZE) hasNextPage = false;
                } else {
                    hasNextPage = false;
                }
                page++;
                if (page > 20) hasNextPage = false; 
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

            // 4. PROCESAR LEADS
            const oppStatsMap = new Map<string, OpportunityStat>();

            allLeads.forEach((lead: any) => {
                if (lead.assigned_to === IGNORED_USER_ID) return;

                const cars = Array.isArray(lead.interested_cars) ? lead.interested_cars : [lead.interested_cars];

                cars.forEach((c: any) => {
                    if (!c || (!c.brand && !c.model)) return;

                    let matchedCarId: string | null = null;
                    
                    // --- NIVEL 1: Match Exacto por ID ---
                    if (c.vehicle_uid && invStatsMap.has(c.vehicle_uid)) {
                        matchedCarId = c.vehicle_uid;
                    } 
                    
                    // --- NIVEL 2: Match Inteligente ---
                    if (!matchedCarId) {
                        const rawFullName = `${c.brand || ''} ${c.model || ''}`;
                        const leadRequestNormalized = normalizeStr(rawFullName);
                        const leadNumbers = extractNumbers(rawFullName);
                        
                        if (leadRequestNormalized.length > 2) { 
                            const found = fuzzyInventoryList.find(invCar => {
                                // REGLA: Coincidencia de texto fuerte
                                if (invCar.normalizedName.includes(leadRequestNormalized)) return true;
                                if (invCar.normalizedName.length > 4 && leadRequestNormalized.includes(invCar.normalizedName)) return true;
                                
                                // REGLA NÚMEROS: Solo si el texto es ambiguo o corto, verificamos números estrictamente.
                                // Si el texto es muy parecido, asumimos match para evitar duplicados en oportunidades.
                                if (leadNumbers.length > 0 && invCar.numbers.length > 0) {
                                     // Lógica original conservada para atribución exacta
                                     const allNumbersMatch = leadNumbers.every(num => invCar.numbers.includes(num));
                                     // Si los números no coinciden, pero el texto es casi idéntico,
                                     // ¿deberíamos contarlo como inventario? 
                                     // Para estadísticas de VENTA: NO (es otro carro).
                                     // Para estadísticas de OPORTUNIDAD: SÍ (tenemos algo parecido).
                                     // Aquí estamos decidiendo a qué CARRO del inventario atribuir el lead.
                                     // Mantendremos estricto aquí, pero filtraremos en el paso final.
                                     if (!allNumbersMatch) return false;
                                }

                                return false;
                            });

                            if (found) {
                                matchedCarId = found.id;
                            }
                        }
                    }

                    // --- RESULTADO ---
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
                        // NO ENCONTRADO -> POSIBLE OPORTUNIDAD
                        const rawBrand = c.brand || 'Genérico';
                        const rawModel = c.model || 'Desconocido';
                        const rawYear = c.year || null;

                        // MEJORA 1: CLAVE NORMALIZADA PARA EVITAR DUPLICADOS
                        // Usamos normalizeStr para que "d-max" y "dmax" generen la misma clave.
                        const normBrand = normalizeStr(rawBrand);
                        const normModel = normalizeStr(rawModel);
                        const yearKey = rawYear ? rawYear.toString() : 'any';
                        
                        // Clave única basada en texto limpio
                        const oppKey = `${normBrand}-${normModel}-${yearKey}`;
                        
                        if (!oppStatsMap.has(oppKey)) {
                            oppStatsMap.set(oppKey, {
                                key: oppKey,
                                brand: rawBrand.trim(), // Guardamos el nombre "bonito" (primera vez que aparece)
                                model: rawModel.trim(),
                                year: rawYear,
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

            // 6. FORMATO FINAL Y FILTRADO DE SEGURIDAD
            const finalInvStats = Array.from(invStatsMap.values())
                .filter(s => s.total_leads > 0 || s.showroom_count > 0) 
                .map(stat => ({
                    ...stat,
                    response_rate: stat.total_leads > 0 
                        ? Math.round((stat.responded_leads / stat.total_leads) * 100) 
                        : 0
                }));
            
            finalInvStats.sort((a, b) => b.total_leads - a.total_leads);

            // MEJORA 2: FILTRO FINAL DE OPORTUNIDADES VS INVENTARIO REAL
            // Aquí eliminamos las oportunidades que se parecen demasiado a lo que YA tenemos en stock.
            // Esto soluciona el problema de "Suzuki Scross 1.6" apareciendo como oportunidad
            // cuando ya tienes un "Suzuki Scross" en venta.
            
            const availableInventoryForCheck = fuzzyInventoryList; // Usamos la lista pre-calculada

            let finalOppStats = Array.from(oppStatsMap.values());

            finalOppStats = finalOppStats.filter(opp => {
                // Generamos la firma normalizada de la oportunidad
                const oppSignature = normalizeStr(`${opp.brand} ${opp.model}`);
                
                // Buscamos si existe ALGO en el inventario que coincida, 
                // ignorando diferencias de año o detalles técnicos menores.
                const isAlreadyInStock = availableInventoryForCheck.some(invItem => {
                    // Verificamos si la marca coincide primero (optimización)
                    if (!invItem.normalizedName.includes(normalizeStr(opp.brand)) && 
                        !normalizeStr(opp.brand).includes(invItem.normalizedName)) {
                        return false;
                    }

                    // Chequeo cruzado de inclusión
                    // Si el inventario es "scross" y la oportunidad es "scross16" -> MATCH (true) -> Se elimina de oportunidades
                    // Si el inventario es "dmax" y la oportunidad es "dmaxhiride" -> MATCH (true) -> Se elimina
                    return invItem.normalizedName.includes(oppSignature) || oppSignature.includes(invItem.normalizedName);
                });

                // Solo mantenemos la oportunidad si NO está en stock
                return !isAlreadyInStock;
            });

            finalOppStats.sort((a, b) => b.request_count - a.request_count);
            
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