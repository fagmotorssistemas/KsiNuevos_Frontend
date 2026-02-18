import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';

const supabase = createClient();

export type VehicleWithSeller = Database['public']['Tables']['scraper_vehicles']['Row'] & {
    seller: Database['public']['Tables']['scraper_sellers']['Row'] | null;
};

export interface VehicleFilters {
    brand?: string;
    model?: string;
    year?: string;
    city?: string;
    dateRange?: 'today' | 'yesterday' | 'week' | 'month' | 'all';
    regionFilter?: 'all' | 'coast' | 'sierra';
    searchTerm?: string;
    sortBy?: string;
    page?: number;
    itemsPerPage?: number;
}

// Ciudades de la costa y sierra
const COAST_CITIES = [
    'guayaquil', 'quito', 'cuenca', 'machala', 'manta', 'portoviejo',
    'esmeraldas', 'santo domingo', 'quevedo', 'babahoyo', 'milagro',
    'salinas', 'playas', 'santa elena', 'la libertad'
];

const SIERRA_CITIES = [
    'quito', 'cuenca', 'ambato', 'riobamba', 'loja', 'ibarra',
    'tulcán', 'latacunga', 'guaranda', 'azogues', 'cañar'
];

export const scraperService = {

    async getTopOpportunities(): Promise<VehicleWithSeller[]> {
        const { data, error } = await supabase
            .from("scraper_vehicles")
            .select(`
                *,
                seller:scraper_sellers(*)
            `)
            .eq("status", "NUEVO")
            .not("price", "is", null)
            .not("mileage", "is", null)
            .not("location", "is", null)
            .gte("price", 1000)
            .lte("price", 50000)
            .gte("mileage", 0)
            .lte("mileage", 250000)
            .eq("seller.is_dealer", false)
            .order("price", { ascending: true })
            .limit(200)

        if (error) {
            console.error("Error obteniendo oportunidades:", error)
            return []
        }

        if (!data) return []

        const scored = data.map((v) => {
            let score = 0
            if (v.price) score += 50000 / v.price
            if (v.mileage) score += 200000 / (v.mileage + 1)
            if (v.seller?.total_listings) {
                score += 50 / (v.seller.total_listings + 1)
            }

            const goodWords = [
                "único dueño", "mantenimientos al día", "como nuevo",
                "garaje", "full equipo", "factura", "negociable"
            ]
            const text = `${v.title ?? ""} ${v.description ?? ""}`.toLowerCase()
            goodWords.forEach((w) => {
                if (text.includes(w)) score += 10
            })

            const badWords = [
                "chocado", "sin papeles", "remato urgente",
                "para repuestos", "motor dañado", "no matriculado"
            ]
            badWords.forEach((w) => {
                if (text.includes(w)) score -= 30
            })

            return { ...v, deal_score: score }
        })

        const top30 = scored
            .sort((a, b) => b.deal_score - a.deal_score)
            .slice(0, 30)

        return top30 as VehicleWithSeller[]
    },

    // NUEVA FUNCIÓN: Obtener vehículos con filtros avanzados
    async getVehiclesWithFilters(filters: VehicleFilters = {}): Promise<{
        data: VehicleWithSeller[];
        totalCount: number;
    }> {
        const {
            brand,
            model,
            year,
            city,
            dateRange = 'all',
            regionFilter = 'all',
            searchTerm,
            sortBy = 'created_at_desc',
            page = 1,
            itemsPerPage = 20
        } = filters;

        const hasSearchTerm = searchTerm && searchTerm.trim() !== '';

        // Construir query base
        let query = supabase
            .from('scraper_vehicles')
            .select(`
                *,
                seller:scraper_sellers(*)
            `, { count: 'exact' });

        // FILTRO: Marca
        if (brand && brand !== 'all') {
            query = query.eq('brand', brand);
        }

        // FILTRO: Modelo
        if (model && model !== 'all') {
            query = query.eq('model', model);
        }

        // FILTRO: Año
        if (year && year !== 'all') {
            query = query.eq('year', year);
        }

        // FILTRO: Ciudad
        if (city && city !== 'all') {
            query = query.eq('location', city);
        }

        // FILTRO: Región (Costa/Sierra) - usando OR con ilike para case-insensitive
        if (regionFilter === 'coast') {
            const coastConditions = COAST_CITIES.map(city => `location.ilike.%${city}%`).join(',');
            query = query.or(coastConditions);
        } else if (regionFilter === 'sierra') {
            const sierraConditions = SIERRA_CITIES.map(city => `location.ilike.%${city}%`).join(',');
            query = query.or(sierraConditions);
        }

        // FILTRO: Rango de fechas
        if (dateRange !== 'all') {
            const now = new Date();
            let startDate: Date;

            switch (dateRange) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'yesterday':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    query = query
                        .gte('publication_date', startDate.toISOString())
                        .lt('publication_date', endOfYesterday.toISOString());
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    query = query.gte('publication_date', startDate.toISOString());
                    break;
                case 'month':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    query = query.gte('publication_date', startDate.toISOString());
                    break;
            }

            if (dateRange !== 'yesterday') {
                query = query.gte('publication_date', startDate!.toISOString());
            }
        }

        // ORDEN/SORT
        switch (sortBy) {
            case 'created_at_desc':
                query = query.order('created_at', { ascending: false });
                break;
            case 'publication_date_desc':
                query = query.order('publication_date', { ascending: false });
                break;
            case 'price_asc':
                query = query.order('price', { ascending: true, nullsFirst: false });
                break;
            case 'price_desc':
                query = query.order('price', { ascending: false, nullsFirst: false });
                break;
            default:
                query = query.order('created_at', { ascending: false });
        }

        // PAGINACIÓN: Si hay búsqueda de texto, necesitamos traer TODOS los datos
        // porque el filtro se aplica en el cliente
        if (!hasSearchTerm) {
            const from = (page - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;
            query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Error al obtener vehículos con filtros:', error);
            return { data: [], totalCount: 0 };
        }

        let filteredData = (data || []) as VehicleWithSeller[];

        // FILTRO: Búsqueda por texto (en cliente)
        if (hasSearchTerm) {
            const searchLower = searchTerm!.toLowerCase();
            filteredData = filteredData.filter(v => {
                const searchableText = `
                    ${v.title || ''} 
                    ${v.description || ''} 
                    ${v.brand || ''} 
                    ${v.model || ''} 
                    ${v.characteristics?.join(' ') || ''}
                    ${v.extras?.join(' ') || ''}
                `.toLowerCase();

                return searchableText.includes(searchLower);
            });

            // Aplicar paginación manual después del filtro de búsqueda
            const totalFiltered = filteredData.length;
            const from = (page - 1) * itemsPerPage;
            const to = from + itemsPerPage;
            filteredData = filteredData.slice(from, to);

            return {
                data: filteredData,
                totalCount: totalFiltered
            };
        }

        return {
            data: filteredData,
            totalCount: count || 0
        };
    },

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

    async updateVehicleMotor(id: string, motor: string) {
        const { error } = await supabase
            .from('scraper_vehicles')
            .update({
                motor: motor.trim(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.error('Error al actualizar motor del vehículo:', error);
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

    // NUEVA FUNCIÓN: Obtener opciones de filtros
    async getFilterOptions(): Promise<{
        brands: string[];
        models: string[];
        years: string[];
        cities: string[];
    }> {
        const { data, error } = await supabase
            .from('scraper_vehicles')
            .select('brand, model, year, location');

        if (error) {
            console.error('Error al obtener opciones de filtros:', error);
            return { brands: [], models: [], years: [], cities: [] };
        }

        const brands = new Set<string>();
        const models = new Set<string>();
        const years = new Set<string>();
        const cities = new Set<string>();

        data.forEach(vehicle => {
            if (vehicle.brand) brands.add(vehicle.brand);
            if (vehicle.model) models.add(vehicle.model);
            if (vehicle.year) years.add(vehicle.year);
            if (vehicle.location) cities.add(vehicle.location);
        });

        return {
            brands: Array.from(brands).sort(),
            models: Array.from(models).sort(),
            years: Array.from(years).sort((a, b) => Number(b) - Number(a)),
            cities: Array.from(cities).sort()
        };
    },

    // NUEVA FUNCIÓN: Obtener modelos por marca
    async getModelsByBrand(brand: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('scraper_vehicles')
            .select('model')
            .eq('brand', brand)
            .not('model', 'is', null);

        if (error) {
            console.error('Error al obtener modelos:', error);
            return [];
        }

        const models = new Set<string>();
        data.forEach(v => {
            if (v.model) models.add(v.model);
        });

        return Array.from(models).sort();
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
                'https://n8n.ksinuevos.com/webhook/buscar-producto-marketplace',
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