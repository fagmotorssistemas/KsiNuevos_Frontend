import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';

const supabase = createClient();

// Tipo para vehículo con seller incluido
type VehicleWithSeller = Database['public']['Tables']['scraper_vehicles']['Row'] & {
    seller: Database['public']['Tables']['scraper_sellers']['Row'] | null;
};

export const scraperService = {

    async getTopOpportunities(): Promise<VehicleWithSeller[]> {
        const { data, error } = await supabase
            .from("scraper_vehicles")
            .select(`
      *,
      seller:scraper_sellers(*)
    `)
            // Solo autos activos
            .eq("status", "NUEVO")

            // Solo con precio válido
            .not("price", "is", null)

            // Solo con kilometraje válido
            .not("mileage", "is", null)

            .not("location", "is", null)

            // Filtrar precios extremos (evitar basura)
            .gte("price", 1000)
            .lte("price", 50000)

            // Filtrar kilometraje extremo
            .gte("mileage", 0)
            .lte("mileage", 250000)

            // Evitar dealers (mejores oportunidades = particulares)
            .eq("seller.is_dealer", false)

            // Orden inicial por precio (después rankeamos)
            .order("price", { ascending: true })

            // Traer máximo 200 para rankear en frontend
            .limit(200)

        if (error) {
            console.error("Error obteniendo oportunidades:", error)
            return []
        }

        if (!data) return []

        // Ranking inteligente en JS
        const scored = data.map((v) => {
            let score = 0

            // =============================
            // 1. Precio bajo (más score)
            // =============================
            if (v.price) score += 50000 / v.price

            // =============================
            // 2. Kilometraje bajo
            // =============================
            if (v.mileage) score += 200000 / (v.mileage + 1)

            // =============================
            // 3. Particular con pocas publicaciones
            // =============================
            if (v.seller?.total_listings) {
                score += 50 / (v.seller.total_listings + 1)
            }

            // =============================
            // 4. Bonus por palabras positivas
            // =============================
            const goodWords = [
                "único dueño",
                "mantenimientos al día",
                "como nuevo",
                "garaje",
                "full equipo",
                "factura",
                "negociable"
            ]

            const text = `${v.title ?? ""} ${v.description ?? ""}`.toLowerCase()

            goodWords.forEach((w) => {
                if (text.includes(w)) score += 10
            })

            // =============================
            // 5. Penalización palabras sospechosas
            // =============================
            const badWords = [
                "chocado",
                "sin papeles",
                "remato urgente",
                "para repuestos",
                "motor dañado",
                "no matriculado"
            ]

            badWords.forEach((w) => {
                if (text.includes(w)) score -= 30
            })

            return {
                ...v,
                deal_score: score
            }
        })

        // Ordenar por score
        const top30 = scored
            .sort((a, b) => b.deal_score - a.deal_score)
            .slice(0, 30)

        return top30 as VehicleWithSeller[]
    },

    // ========== VEHICLES ==========
    async getVehicles(): Promise<VehicleWithSeller[]> {
        const { data, error } = await supabase
            .from('scraper_vehicles')
            .select(`
        *,
        seller:scraper_sellers(*)
      `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error al obtener vehículos:', error);
            return [];
        }

        return data as VehicleWithSeller[];
    },

    async getVehiclesByStatus(status: 'NUEVO' | 'DESCARTADO' | 'VENDIDO' | 'MANTENIMIENTO'): Promise<VehicleWithSeller[]> {
        const { data, error } = await supabase
            .from('scraper_vehicles')
            .select(`
        *,
        seller:scraper_sellers(*)
      `)
            .eq('status', status)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error al obtener vehículos por estado:', error);
            return [];
        }

        return data as VehicleWithSeller[];
    },

    async getVehiclesByLocation(location: 'patio' | 'taller' | 'cliente'): Promise<VehicleWithSeller[]> {
        const { data, error } = await supabase
            .from('scraper_vehicles')
            .select(`
        *,
        seller:scraper_sellers(*)
      `)
            .eq('location', location)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error al obtener vehículos por ubicación:', error);
            return [];
        }

        return data as VehicleWithSeller[];
    },

    async updateVehicleStatus(id: string, status: 'NUEVO' | 'DESCARTADO' | 'VENDIDO' | 'MANTENIMIENTO') {
        const { error } = await supabase
            .from('scraper_vehicles')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.error('Error al actualizar estado del vehículo:', error);
            throw error;
        }
    },

    async updateVehicleLocation(id: string, location: 'patio' | 'taller' | 'cliente') {
        const { error } = await supabase
            .from('scraper_vehicles')
            .update({
                location,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.error('Error al actualizar ubicación del vehículo:', error);
            throw error;
        }
    },

    async updateVehicleTags(id: string, tags: string[]) {
        const { error } = await supabase
            .from('scraper_vehicles')
            .update({
                tags,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.error('Error al actualizar tags:', error);
            throw error;
        }
    },

    async deleteVehicle(id: string) {
        const { error } = await supabase
            .from('scraper_vehicles')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error al eliminar vehículo:', error);
            throw error;
        }
    },

    // ========== SELLERS ==========
    async getSellers(): Promise<Database['public']['Tables']['scraper_sellers']['Row'][]> {
        const { data, error } = await supabase
            .from('scraper_sellers')
            .select('*')
            .order('last_updated', { ascending: false });

        if (error) {
            console.error('Error al obtener vendedores:', error);
            return [];
        }

        return data;
    },

    async getDealers(): Promise<Database['public']['Tables']['scraper_sellers']['Row'][]> {
        const { data, error } = await supabase
            .from('scraper_sellers')
            .select('*')
            .eq('is_dealer', true)
            .order('last_updated', { ascending: false });

        if (error) {
            console.error('Error al obtener dealers:', error);
            return [];
        }

        return data;
    },

    async getSellerWithVehicles(sellerId: string) {
        const { data, error } = await supabase
            .from('scraper_sellers')
            .select(`
        *,
        vehicles:scraper_vehicles(*)
      `)
            .eq('id', sellerId)
            .single();

        if (error) {
            console.error('Error al obtener vendedor con vehículos:', error);
            throw error;
        }

        return data;
    },

    async updateSellerTotalListings(sellerId: string, totalListings: number) {
        const { error } = await supabase
            .from('scraper_sellers')
            .update({
                total_listings: totalListings,
                last_updated: new Date().toISOString()
            })
            .eq('id', sellerId);

        if (error) {
            console.error('Error al actualizar total de listings:', error);
            throw error;
        }
    },

    // ========== PRICE STATISTICS ==========
    async getPriceStatistics(): Promise<Database['public']['Tables']['scraper_vehicle_price_statistics']['Row'][]> {
        const { data, error } = await supabase
            .from('scraper_vehicle_price_statistics')
            .select('*')
            .order('last_updated', { ascending: false });

        if (error) {
            console.error('Error al obtener estadísticas de precios:', error);
            return [];
        }

        return data;
    },

    async getPriceStatisticsByBrand(brand: string): Promise<Database['public']['Tables']['scraper_vehicle_price_statistics']['Row'][]> {
        const { data, error } = await supabase
            .from('scraper_vehicle_price_statistics')
            .select('*')
            .eq('brand', brand)
            .order('model', { ascending: true });

        if (error) {
            console.error('Error al obtener estadísticas por marca:', error);
            return [];
        }

        return data;
    },

    async getPriceStatisticsByModel(brand: string, model: string): Promise<Database['public']['Tables']['scraper_vehicle_price_statistics']['Row'][]> {
        const { data, error } = await supabase
            .from('scraper_vehicle_price_statistics')
            .select('*')
            .eq('brand', brand)
            .eq('model', model)
            .order('year', { ascending: false });

        if (error) {
            console.error('Error al obtener estadísticas por modelo:', error);
            return [];
        }

        return data;
    },

    async getPriceStatisticsForVehicle(brand: string, model: string, year?: string): Promise<Database['public']['Tables']['scraper_vehicle_price_statistics']['Row'] | null> {
        const query = supabase
            .from('scraper_vehicle_price_statistics')
            .select('*')
            .eq('brand', brand)
            .eq('model', model);

        if (year) {
            query.eq('year', year);
        } else {
            query.is('year', null);
        }

        const { data, error } = await query.single();

        if (error) {
            console.error('Error al obtener estadística específica:', error);
            return null;
        }

        return data;
    },

    async getAllBrandPricesWithStats(): Promise<{ brand: string; total_models: number; avg_price: number }[]> {
        const { data, error } = await supabase
            .from('scraper_vehicle_price_statistics')
            .select('brand, avg_price')
            .not('year', 'is', null);

        if (error) {
            console.error('Error al obtener marcas con estadísticas:', error);
            return [];
        }

        // Agrupar por marca en el cliente
        const brandStats = data.reduce((acc, row) => {
            if (!acc[row.brand]) {
                acc[row.brand] = {
                    brand: row.brand,
                    total_models: 0,
                    total_price: 0,
                    count: 0
                };
            }
            acc[row.brand].total_models++;
            if (row.avg_price) {
                acc[row.brand].total_price += Number(row.avg_price);
                acc[row.brand].count++;
            }
            return acc;
        }, {} as Record<string, { brand: string; total_models: number; total_price: number; count: number }>);

        return Object.values(brandStats).map(stat => ({
            brand: stat.brand,
            total_models: stat.total_models,
            avg_price: stat.count > 0 ? stat.total_price / stat.count : 0
        })).sort((a, b) => b.total_models - a.total_models);
    },

    async scrapMarketplace(searchTerm: string) {
        try {
            if (!searchTerm.trim()) return

            const response = await fetch(
                'http://138.197.35.10:5678/webhook/buscar-producto-marketplace',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        searchValue: searchTerm,
                    }),
                }
            )

            if (!response.ok) {
                throw new Error('Error al ejecutar el webhook')
            }

            const data = await response.json()
            console.log('Webhook ejecutado:', data)
            return data as WebhookResponse
        } catch (error) {
            console.error('Error al scrapear:', error)
        }
    }

};

export interface WebhookResponse {
    status: 'done' | 'not found' | 'error';
    message: string;
    summary: {
        vehicles: {
            total: number
        }
    }
}

export type { VehicleWithSeller };