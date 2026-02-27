import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';
import type { VehicleImageAnalysis } from '@/types/vehicleImageAnalysis';

const supabase = createClient();

export type VehicleWithSeller = Database['public']['Tables']['scraper_vehicles']['Row'] & {
    seller: Database['public']['Tables']['scraper_sellers']['Row'] | null;
};

export interface VehicleFilters {
    brand?: string;
    model?: string;
    motor?: string;
    year?: string;
    location?: string;
    dateRange?: 'today' | 'yesterday' | 'week' | 'month' | 'all';
    regionFilter?: 'all' | 'coast' | 'sierra';
    searchTerm?: string;
    sortBy?: string;
    page?: number;
    itemsPerPage?: number;
}

const SIERRA_CITIES = [
    'quito', 'cuenca', 'ambato', 'riobamba', 'loja', 'ibarra',
    'tulcán', 'latacunga', 'guaranda', 'azogues', 'cañar'
];

const COAST_CITIES = [
    'guayaquil', 'manta', 'esmeraldas', 'machala', 'santo domingo',
    'portoviejo', 'babahoyo', 'quevedo', 'milagro', 'daule', 'salinas', "milagro", 
    "samborondón", "durán", "manabí", "santa elena", "salinas"
];

export const scraperService = {
    async getVehiclesWithFilters(filters: VehicleFilters = {}): Promise<{
        data: VehicleWithSeller[];
        totalCount: number;
    }> {
        const {
            brand,
            model,
            motor,
            year,
            location,
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

        // FILTRO: Motor
        if (motor && motor !== 'all') {
            query = query.eq('motor', motor);
        }

        // FILTRO: Año
        if (year && year !== 'all') {
            query = query.eq('year', year);
        }

        // FILTRO: Ciudad
        if (location && location !== 'all') {
            query = query.eq('location', location);
        }

        if (regionFilter === 'sierra') {
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

    async getVehiclesForOpportunities(): Promise<VehicleWithSeller[]> {
        let query = supabase
            .from('scraper_vehicles')
            .select(`*, seller:scraper_sellers(*)`)
            .not('year', 'is', null);
        for (const city of COAST_CITIES) {
            query = query.not('location', 'ilike', `%${city}%`);
        }
        const { data, error } = await query;

        if (error) {
            console.error('Error al obtener vehículos para oportunidades:', error);
            return [];
        }

        return data as VehicleWithSeller[];
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
        motors: string[];
        years: string[];
        cities: string[];
    }> {
        const { data, error } = await supabase
            .from('scraper_vehicles')
            .select('brand, model, motor, year, location');

        if (error) {
            console.error('Error al obtener opciones de filtros:', error);
            return { brands: [], models: [], motors: [], years: [], cities: [] };
        }

        const brands = new Set<string>();
        const models = new Set<string>();
        const motors = new Set<string>();
        const years = new Set<string>();
        const cities = new Set<string>();

        data.forEach(vehicle => {
            if (vehicle.brand) brands.add(vehicle.brand);
            if (vehicle.model) models.add(vehicle.model);
            if (vehicle.motor) motors.add(vehicle.motor);
            if (vehicle.year) years.add(vehicle.year);
            if (vehicle.location) cities.add(vehicle.location);
        });

        return {
            brands: Array.from(brands).sort(),
            models: Array.from(models).sort(),
            motors: Array.from(motors).sort(),
            years: Array.from(years).sort((a, b) => Number(b) - Number(a)),
            cities: Array.from(cities).sort()
        };
    },

    // Agregar este método dentro de scraperService, justo después de getFilterOptions

    async getCascadingFilterOptions(filters: {
        brand?: string;
        model?: string;
        motor?: string;
        year?: string;
        city?: string;
        regionFilter?: 'all' | 'coast' | 'sierra';
    } = {}): Promise<{
        brands: string[];
        models: string[];
        motors: string[];
        years: string[];
        cities: string[];
    }> {
        const { brand, model, motor, year, city, regionFilter = 'all' } = filters;
        const empty = { brands: [], models: [], motors: [], years: [], cities: [] };

        // 1. Traer todos los vehículos con solo los campos necesarios
        //    Aplicar región igual que getVehiclesWithFilters (ilike OR)
        let query = supabase
            .from('scraper_vehicles')
            .select('brand, model, motor, year, location');

        if (regionFilter === 'sierra') {
            const conditions = SIERRA_CITIES.map(c => `location.ilike.%${c}%`).join(',');
            query = query.or(conditions);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error al obtener opciones en cascada:', error);
            return empty;
        }

        if (!data) return empty;

        // 2. Derivar opciones en memoria, en cascada
        //    Igual que getFilterOptions pero filtrando por los seleccionados
        const brandsSet = new Set<string>();
        const modelsSet = new Set<string>();
        const motorsSet = new Set<string>();
        const yearsSet = new Set<string>();
        const citiesSet = new Set<string>();

        data.forEach(v => {
            // Marcas: sin restricción adicional (ya filtrado por región arriba)
            if (v.brand) brandsSet.add(v.brand);

            // Modelos: solo de la marca seleccionada
            if (!brand || v.brand === brand) {
                if (v.model) modelsSet.add(v.model);
            }

            // Motores: solo de marca + modelo seleccionados
            if ((!brand || v.brand === brand) && (!model || v.model === model)) {
                if (v.motor) motorsSet.add(v.motor);
            }

            // Años: solo de marca + modelo + motor seleccionados
            if (
                (!brand || v.brand === brand) &&
                (!model || v.model === model) &&
                (!motor || v.motor === motor)
            ) {
                if (v.year) yearsSet.add(v.year);
            }

            // Ciudades: solo de marca + modelo + motor + año seleccionados
            if (
                (!brand || v.brand === brand) &&
                (!model || v.model === model) &&
                (!motor || v.motor === motor) &&
                (!year || v.year === year)
            ) {
                if (v.location) citiesSet.add(v.location);
            }
        });

        return {
            brands: Array.from(brandsSet).sort(),
            models: Array.from(modelsSet).sort(),
            motors: Array.from(motorsSet).sort(),
            years: Array.from(yearsSet).sort((a, b) => Number(b) - Number(a)),
            cities: Array.from(citiesSet).sort(),
        };
    },

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
            console.log('data', data)
            return data as WebhookResponse
        } catch (error) {
            console.error('Error al scrapear:', error)
        }
    }

};

export interface WebhookResponse {
    status: 'done' | 'not found' | 'error';
    message: string;
    resumen?: {
        listings_nuevos_guardados: number;
        listings_descartados_por_precio: number;
        total_scrapeados: number;
        pasaron_filtro_precio: number;
        total_vehiculos_actualizados: number;
    };
}