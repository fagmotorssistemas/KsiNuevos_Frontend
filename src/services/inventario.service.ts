import { createClient } from "@/lib/supabase/client";
import { DashboardInventarioResponse, DetalleVehiculoResponse } from "@/types/inventario.types";
import {
    computePublicPriceRevertAt,
    getEffectivePublicPrice,
    isPromoPublicPriceActive,
    isVehicleAvailableForPriceRules,
} from "@/lib/inventario/inventory-pricing";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const SUPABASE_PRICE_SELECT =
    'plate, price, mileage, internal_fixed_price, internal_fixed_price_set_at, public_price_changed_at, public_price_change_reason, public_price_reverts_at, public_price_requested_by, stock, status, id';

type SupabasePriceRow = {
    plate: string | null;
    price: number | null;
    mileage: number | null;
    internal_fixed_price: number | null;
    internal_fixed_price_set_at: string | null;
    public_price_changed_at: string | null;
    public_price_change_reason: string | null;
    public_price_reverts_at: string | null;
    public_price_requested_by: string | null;
    stock: number | null;
    status: string | null;
    id: string;
};

async function logPriceHistoryClient(
    supabase: ReturnType<typeof createClient>,
    params: {
        inventoryoracleId: string;
        priceType: 'internal' | 'public' | 'auto_revert';
        oldPrice: number | null;
        newPrice: number | null;
        reason?: string | null;
    }
) {
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from('inventory_price_history').insert({
        inventoryoracle_id: params.inventoryoracleId,
        price_type: params.priceType,
        old_price: params.oldPrice,
        new_price: params.newPrice,
        reason: params.reason ?? null,
        changed_by: authData.user?.id ?? null,
    });
    if (error) {
        console.warn('[inventarioService] Historial de precio no registrado:', error.message);
    }
}

async function fetchSupabaseVehicleByPlate(placa: string): Promise<SupabasePriceRow> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('inventoryoracle')
        .select(SUPABASE_PRICE_SELECT)
        .eq('plate', placa.toUpperCase())
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Vehículo no encontrado en Supabase');

    return data as SupabasePriceRow;
}

export const inventarioService = {
    // ---------------------------------------------------------
    // TU LÓGICA ORIGINAL (MEJORADA CON MERGE DE SUPABASE)
    // ---------------------------------------------------------
    
    // Método existente para el Dashboard general
    async getDashboard(): Promise<DashboardInventarioResponse> {
        const res = await fetch(`${API_URL}/inventario/dashboard`);
        if (!res.ok) throw new Error('Error fetching inventory dashboard');
        const response = await res.json();
        const oracleData = response.data;

        // --- NUEVO: Traer price y mileage de Supabase ---
        const supabase = createClient();
        const { data: supabaseData, error } = await supabase
            .from('inventoryoracle')
            .select(SUPABASE_PRICE_SELECT);

        if (error) {
            console.warn("⚠️ No se pudieron traer datos de Supabase:", error);
            return oracleData; // Retornamos solo Oracle si falla Supabase
        }

        // Crear un mapa para búsqueda rápida (key = placa en mayúsculas)
        const supabaseMap = new Map(
            supabaseData?.map(item => [
                item.plate?.toUpperCase(), 
                item as SupabasePriceRow
            ]) || []
        );

        // Fusionar: precios y KM de Supabase. VENDIDO EN viene de la API (kardex).
        const listadoEnriquecido = oracleData.listado.map((vehiculo: any) => {
            const placaUpper = vehiculo.placa?.toUpperCase();
            const supabaseInfo = supabaseMap.get(placaUpper);
            const kmOracle = vehiculo.kilometraje ?? vehiculo.mileage ?? vehiculo.KILOMETRAJE;
            const numKm = typeof kmOracle === 'number' ? kmOracle : (typeof kmOracle === 'string' && kmOracle !== '' ? Number(kmOracle) : NaN);
            // API puede enviar "precio al que se vendió" con distintos nombres (mismo valor que en el modal de historial)
            const vendidoEnRaw = vehiculo.precioVenta ?? vehiculo.vendidoEn ?? vehiculo.vendido_en ?? vehiculo.precio_venta ?? vehiculo.precio_venta_final;
            const numVendidoEn = typeof vendidoEnRaw === 'number' ? vendidoEnRaw : (typeof vendidoEnRaw === 'string' && vendidoEnRaw !== '' ? Number(vendidoEnRaw) : NaN);

            const effectivePublicPrice = supabaseInfo
                ? getEffectivePublicPrice(supabaseInfo)
                : null;

            return {
                ...vehiculo,
                price: effectivePublicPrice,
                internalFixedPrice: supabaseInfo?.internal_fixed_price ?? null,
                internalFixedPriceSetAt: supabaseInfo?.internal_fixed_price_set_at ?? null,
                publicPriceChangedAt: supabaseInfo?.public_price_changed_at ?? null,
                publicPriceChangeReason: supabaseInfo?.public_price_change_reason ?? null,
                publicPriceRevertsAt: supabaseInfo?.public_price_reverts_at ?? null,
                publicPriceRequestedBy: supabaseInfo?.public_price_requested_by ?? null,
                mileage: supabaseInfo?.mileage ?? (Number.isFinite(numKm) ? numKm : null),
                precioVenta: Number.isFinite(numVendidoEn) ? numVendidoEn : null
            };
        });

        return {
            resumen: oracleData.resumen,
            listado: listadoEnriquecido
        };
    },

    // Método existente: Obtener historial detallado por placa
    async getDetalleVehiculo(placa: string): Promise<DetalleVehiculoResponse> {
        const res = await fetch(`${API_URL}/inventario/detalle/${placa}`);
        if (!res.ok) throw new Error('Error fetching vehicle details');
        const response = await res.json();
        return response.data;
    },

    // ---------------------------------------------------------
    // Precios: interno fijo (referencia ventas) + público promocional
    // ---------------------------------------------------------

    async setInternalFixedPrice(placa: string, internalPrice: number) {
        if (!Number.isFinite(internalPrice) || internalPrice <= 0) {
            throw new Error('El precio interno fijo debe ser mayor a 0');
        }

        const vehicle = await fetchSupabaseVehicleByPlate(placa);
        if (!isVehicleAvailableForPriceRules(vehicle)) {
            throw new Error('Solo se puede fijar precio interno en vehículos disponibles');
        }

        const supabase = createClient();
        const nowIso = new Date().toISOString();
        const rounded = Number(internalPrice.toFixed(2));
        const isFirstSet = vehicle.internal_fixed_price == null;
        const oldInternal = vehicle.internal_fixed_price;

        const hadPromo =
            oldInternal != null &&
            vehicle.price != null &&
            Number(vehicle.price.toFixed(2)) !== Number(oldInternal.toFixed(2));

        const updatePayload: Record<string, unknown> = {
            internal_fixed_price: rounded,
            updated_at: nowIso,
        };

        if (isFirstSet) {
            updatePayload.internal_fixed_price_set_at = nowIso;
            updatePayload.price = rounded;
            updatePayload.public_price_changed_at = null;
            updatePayload.public_price_change_reason = null;
            updatePayload.public_price_reverts_at = null;
            updatePayload.public_price_requested_by = null;
        } else if (!hadPromo) {
            updatePayload.price = rounded;
            updatePayload.public_price_changed_at = null;
            updatePayload.public_price_change_reason = null;
            updatePayload.public_price_reverts_at = null;
            updatePayload.public_price_requested_by = null;
        }

        const { error } = await supabase
            .from('inventoryoracle')
            .update(updatePayload)
            .eq('id', vehicle.id);

        if (error) throw error;

        await logPriceHistoryClient(supabase, {
            inventoryoracleId: vehicle.id,
            priceType: 'internal',
            oldPrice: oldInternal ?? vehicle.price,
            newPrice: rounded,
            reason: isFirstSet ? 'Precio interno fijo inicial' : 'Ajuste de precio interno fijo',
        });

        const nextPublicPrice =
            isFirstSet || !hadPromo ? rounded : (vehicle.price ?? rounded);

        return {
            internalFixedPrice: rounded,
            price: nextPublicPrice,
            internalFixedPriceSetAt: isFirstSet
                ? nowIso
                : (vehicle.internal_fixed_price_set_at ?? nowIso),
            syncedPublic: isFirstSet || !hadPromo,
        };
    },

    async updatePublicPrice(
        placa: string,
        publicPrice: number,
        reason: string,
        requestedBySellerId?: string | null
    ) {
        if (!Number.isFinite(publicPrice) || publicPrice <= 0) {
            throw new Error('El precio público debe ser mayor a 0');
        }

        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            throw new Error('Debes indicar el motivo del cambio de precio público');
        }

        const vehicle = await fetchSupabaseVehicleByPlate(placa);
        if (vehicle.internal_fixed_price == null) {
            throw new Error('Primero debes registrar el precio interno fijo');
        }
        if (!isVehicleAvailableForPriceRules(vehicle)) {
            throw new Error('Las promociones de precio solo aplican a vehículos disponibles');
        }

        const supabase = createClient();
        const nowIso = new Date().toISOString();
        const rounded = Number(publicPrice.toFixed(2));
        const fixed = Number(vehicle.internal_fixed_price.toFixed(2));
        const isSameAsFixed = rounded === fixed;

        const updatePayload: Record<string, unknown> = {
            price: rounded,
            updated_at: nowIso,
        };

        if (isSameAsFixed) {
            updatePayload.public_price_changed_at = null;
            updatePayload.public_price_change_reason = null;
            updatePayload.public_price_reverts_at = null;
            updatePayload.public_price_requested_by = null;
        } else {
            if (!requestedBySellerId?.trim()) {
                throw new Error('Selecciona el vendedor que solicitó el precio promocional');
            }
            updatePayload.public_price_changed_at = nowIso;
            updatePayload.public_price_change_reason = trimmedReason;
            updatePayload.public_price_reverts_at = computePublicPriceRevertAt(new Date(nowIso));
            updatePayload.public_price_requested_by = requestedBySellerId.trim();
        }

        const { error } = await supabase
            .from('inventoryoracle')
            .update(updatePayload)
            .eq('id', vehicle.id);

        if (error) throw error;

        await logPriceHistoryClient(supabase, {
            inventoryoracleId: vehicle.id,
            priceType: 'public',
            oldPrice: vehicle.price,
            newPrice: rounded,
            reason: trimmedReason,
        });

        return {
            price: rounded,
            publicPriceChangedAt: isSameAsFixed ? null : nowIso,
            publicPriceChangeReason: isSameAsFixed ? null : trimmedReason,
            publicPriceRevertsAt: isSameAsFixed ? null : (updatePayload.public_price_reverts_at as string),
            publicPriceRequestedBy: isSameAsFixed ? null : requestedBySellerId?.trim() ?? null,
        };
    },

    async cancelPublicPromo(placa: string) {
        const vehicle = await fetchSupabaseVehicleByPlate(placa);
        if (vehicle.internal_fixed_price == null) {
            throw new Error('No hay precio interno fijo registrado');
        }
        if (
            !isPromoPublicPriceActive({
                price: vehicle.price,
                internal_fixed_price: vehicle.internal_fixed_price,
                internal_fixed_price_set_at: vehicle.internal_fixed_price_set_at,
                public_price_changed_at: vehicle.public_price_changed_at,
                public_price_change_reason: vehicle.public_price_change_reason,
                public_price_reverts_at: vehicle.public_price_reverts_at,
            })
        ) {
            throw new Error('Este vehículo no tiene una promo pública activa');
        }

        const supabase = createClient();
        const nowIso = new Date().toISOString();
        const fixed = Number(vehicle.internal_fixed_price.toFixed(2));

        const { error } = await supabase
            .from('inventoryoracle')
            .update({
                price: fixed,
                public_price_changed_at: null,
                public_price_change_reason: null,
                public_price_reverts_at: null,
                public_price_requested_by: null,
                updated_at: nowIso,
            })
            .eq('id', vehicle.id);

        if (error) throw error;

        await logPriceHistoryClient(supabase, {
            inventoryoracleId: vehicle.id,
            priceType: 'auto_revert',
            oldPrice: vehicle.price,
            newPrice: fixed,
            reason: 'Cancelación manual de promo por admin',
        });

        return { price: fixed };
    },

    async listActiveSellers() {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('status', 'activo')
            .eq('role', 'vendedor')
            .order('full_name');

        if (error) throw error;
        return data ?? [];
    },

    async updateMileage(placa: string, mileage: number) {
        const supabase = createClient();
        const { error } = await supabase
            .from('inventoryoracle')
            .update({
                mileage,
                updated_at: new Date().toISOString(),
            })
            .eq('plate', placa.toUpperCase());

        if (error) throw error;
    },

    /** @deprecated Usar setInternalFixedPrice / updatePublicPrice / updateMileage */
    async updateDatosComerciales(placa: string, price: number, mileage: number) {
        await this.updateMileage(placa, mileage);
        const vehicle = await fetchSupabaseVehicleByPlate(placa);
        if (vehicle.internal_fixed_price == null) {
            return this.setInternalFixedPrice(placa, price);
        }
        if (Number(price.toFixed(2)) === Number(vehicle.internal_fixed_price.toFixed(2))) {
            return;
        }
        throw new Error('Usa el formulario de precio público con motivo para cambiar el precio promocional');
    },

    // ---------------------------------------------------------
    // VINCULACIÓN DE RASTREADORES GPS CON VEHÍCULOS
    // ---------------------------------------------------------
    
    /**
     * Obtiene datos completos del vehículo + Rastreador vinculado
     * Fuente: inventoryoracle + ventas_rastreador (por nota_venta)
     */
    async getVehiculoConRastreador(placa: string) {
        const supabase = createClient();
        const placaUpper = placa.toUpperCase();

        try {
            const { data: vehiculo, error: vehiculoError } = await supabase
                .from('inventoryoracle')
                .select('*')
                .eq('plate', placaUpper)
                .single();

            if (vehiculoError) {
                console.error("Error obteniendo vehículo:", vehiculoError);
                return null;
            }

            const { data: venta, error: rastreadorError } = await supabase
                .from('ventas_rastreador')
                .select('*, gps_inventario(*)')
                .eq('nota_venta', vehiculo.oracle_id || '')
                .maybeSingle();

            return {
                vehiculo,
                rastreador: venta ?? null,
                vinculado: !!venta
            };
        } catch (error) {
            console.error("Error en getVehiculoConRastreador:", error);
            return null;
        }
    },

    /**
     * Busca vehículos + rastreadores por placa, marca o modelo
     */
    async buscarVehiculosConRastreador(query: string) {
        const supabase = createClient();
        const queryLower = query.toLowerCase();

        try {
            // 1. Buscar vehículos que coincidan
            const { data: vehiculos, error } = await supabase
                .from('inventoryoracle')
                .select('*')
                .or(`plate.ilike.%${query}%, brand.ilike.%${queryLower}%, model.ilike.%${queryLower}%`)
                .limit(20);

            if (error) {
                console.error("Error buscando vehículos:", error);
                return [];
            }

            const resultados = await Promise.all(
                (vehiculos || []).map(async (v) => {
                    const { data: venta } = await supabase
                        .from('ventas_rastreador')
                        .select('*, gps_inventario(*)')
                        .eq('nota_venta', v.oracle_id || '')
                        .maybeSingle();

                    return {
                        vehiculo: v,
                        rastreador: venta ?? null,
                        vinculado: !!venta
                    };
                })
            );

            return resultados;
        } catch (error) {
            console.error("Error en buscarVehiculosConRastreador:", error);
            return [];
        }
    },

    /**
     * Vincula un rastreador (venta) a un vehículo. Actualiza nota_venta en ventas_rastreador.
     */
    async vincularRastreadorAVehiculo(placaVehiculo: string, rastreadorId: string, oracleId: string) {
        const supabase = createClient();

        try {
            const { data, error } = await supabase
                .from('ventas_rastreador')
                .update({ nota_venta: oracleId })
                .eq('id', rastreadorId)
                .select()
                .single();

            if (error) {
                console.error("Error vinculando rastreador:", error);
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            console.error("Error crítico en vincularRastreadorAVehiculo:", error);
            return { success: false, error };
        }
    },

    /**
     * Desvincula un rastreador de un vehículo
     */
    async desvincularRastreador(rastreadorId: string) {
        const supabase = createClient();

        try {
            const { data, error } = await supabase
                .from('ventas_rastreador')
                .update({ nota_venta: `SIN-VINCULO-${Date.now()}` })
                .eq('id', rastreadorId)
                .select()
                .single();

            if (error) {
                console.error("Error desvinculando rastreador:", error);
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            console.error("Error crítico en desvincularRastreador:", error);
            return { success: false, error };
        }
    },

    /**
     * Obtiene todos los vehículos con sus rastreadores vinculados
     * Útil para mostrar en dashboard o reportes
     */
    async getVehiculosConRastreadores() {
        const supabase = createClient();

        try {
            const { data: rastreadores, error: gpsError } = await supabase
                .from('ventas_rastreador')
                .select('*, gps_inventario(*)')
                .eq('es_venta_externa', false)
                .order('created_at', { ascending: false });

            if (gpsError) {
                console.error("Error obteniendo rastreadores:", gpsError);
                return [];
            }

            // 2. Agrupar por vehículo (oracle_id)
            const porVehiculo = new Map();

            for (const rastreador of rastreadores || []) {
                const oracleId = rastreador.nota_venta;
                if (!oracleId) continue;

                if (!porVehiculo.has(oracleId)) {
                    porVehiculo.set(oracleId, { rastreadores: [] });
                }
                porVehiculo.get(oracleId).rastreadores.push(rastreador);
            }

            // 3. Obtener datos de vehículos
            const { data: vehiculos } = await supabase
                .from('inventoryoracle')
                .select('*');

            // 4. Fusionar
            const resultados = (vehiculos || []).map(v => ({
                vehiculo: v,
                rastreadores: porVehiculo.get(v.oracle_id)?.rastreadores || [],
                tieneRastreador: porVehiculo.has(v.oracle_id)
            }));

            return resultados;
        } catch (error) {
            console.error("Error en getVehiculosConRastreadores:", error);
            return [];
        }
    }
};