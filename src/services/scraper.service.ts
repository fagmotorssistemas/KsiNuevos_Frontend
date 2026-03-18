import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';
import type { VehicleImageAnalysis } from '@/types/vehicleImageAnalysis';

const supabase = createClient();

// Alias conservado para compatibilidad; ya no incluye datos del vendedor ni relación con scraper_sellers.
export type VehicleWithSeller = Database['public']['Tables']['scraper_vehicles']['Row'];

/** Tracción extraída del texto del vehículo (title, description, characteristics). */
export type VehicleTraction = '4x4' | 'AWD' | '4WD' | 'FWD' | 'RWD' | null;

export interface VehicleFilters {
    brand?: string;
    model?: string;
    motor?: string;
    trim?: string;
    year?: string;
    location?: string;
    dateRange?: 'today' | 'yesterday' | 'week' | 'month' | 'all';
    regionFilter?: 'all' | 'coast' | 'sierra';
    searchTerm?: string;
    /** Filtro por tracción: 'all' | '4x4' (4x4/AWD/4WD) | '4x2' (FWD/RWD). Solo aplica si hay datos en el listado. */
    traction?: string;
    sortBy?: string;
    page?: number;
    itemsPerPage?: number;
}

/** Extrae la tracción del texto del vehículo (title, description, characteristics). */
export function getVehicleTraction(vehicle: { title?: string | null; description?: string | null; characteristics?: string[] | null }): VehicleTraction {
    const text = [
        vehicle.title,
        vehicle.description,
        ...(vehicle.characteristics ?? []),
    ].filter(Boolean).join(' ').toLowerCase();
    if (!text) return null;
    if (/\b4x4\b/.test(text)) return '4x4';
    if (/\bawd\b/.test(text)) return 'AWD';
    if (/\b4wd\b/.test(text)) return '4WD';
    if (/\bfwd\b/.test(text)) return 'FWD';
    if (/\brwd\b/.test(text)) return 'RWD';
    return null;
}

const SIERRA_CITIES = [
    'quito', 'cuenca', 'ambato', 'riobamba', 'loja', 'ibarra',
    'tulcán', 'latacunga', 'guaranda', 'azogues', 'cañar', "chordeleg"
];

const COAST_CITIES = [
    'guayaquil', 'manta', 'esmeraldas', 'machala', 'santo domingo',
    'portoviejo', 'babahoyo', 'quevedo', 'milagro', 'daule', 'salinas', "milagro",
    "samborondón", "durán", "manabí", "santa elena", "salinas"
];

/** Deriva región costa/sierra a partir del texto de ubicación del anuncio (ej. "Cuenca, Ecuador"). */
export function getDerivedRegion(location: string | null | undefined): 'costa' | 'sierra' | null {
    if (!location || typeof location !== 'string') return null;
    const lower = location.toLowerCase().trim();
    if (COAST_CITIES.some(c => lower.includes(c))) return 'costa';
    if (SIERRA_CITIES.some(c => lower.includes(c))) return 'sierra';
    return null;
}

/** Indicador de calidad del dato del listado: completo, falta motor, falta km, incompleto. */
export function getDataQualityLabel(vehicle: {
    motor?: string | null;
    mileage?: number | null;
    description?: string | null;
    image_url?: string | null;
    listing_image_urls?: string[] | null;
}): 'completo' | 'falta_motor' | 'falta_km' | 'incompleto' {
    const hasMotor = !!vehicle.motor?.trim();
    const hasMileage = vehicle.mileage != null && vehicle.mileage > 0;
    const hasDesc = !!vehicle.description?.trim();
    const hasImages = !!vehicle.image_url || (vehicle.listing_image_urls?.length ?? 0) > 0;
    if (hasMotor && hasMileage && (hasDesc || hasImages)) return 'completo';
    if (!hasMotor) return 'falta_motor';
    if (!hasMileage) return 'falta_km';
    return 'incompleto';
}

export const scraperService = {
    async getVehiclesWithFilters(filters: VehicleFilters = {}): Promise<{
        data: VehicleWithSeller[];
        totalCount: number;
    }> {
        const {
            brand,
            model,
            motor,
            trim,
            year,
            location,
            dateRange = 'all',
            regionFilter = 'all',
            searchTerm,
            traction,
            sortBy = 'created_at_desc',
            page = 1,
            itemsPerPage = 20
        } = filters;

        const hasSearchTerm = searchTerm && searchTerm.trim() !== '';
        const hasTractionFilter = traction && traction !== 'all';

        // Construir query base
        let query = supabase
            .from('scraper_vehicles')
            .select(`*`, { count: 'exact' });

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

        // FILTRO: Trim (variante desde BD)
        if (trim && trim !== 'all') {
            query = query.eq('trim', trim);
        }

        // FILTRO: Año
        if (year && year !== 'all') {
            const parsedYear = Number(year);
            if (!Number.isNaN(parsedYear)) {
                query = query.eq('year', parsedYear);
            }
        }

        // FILTRO: Ciudad
        if (location && location !== 'all') {
            query = query.eq('location', location);
        }

        // FILTRO: Región (columna region guarda 'costa'|'sierra'; UI usa 'coast'|'sierra')
        if (regionFilter === 'coast') {
            query = query.eq('region', 'costa');
        } else if (regionFilter === 'sierra') {
            query = query.eq('region', 'sierra');
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

        // PAGINACIÓN: Si hay búsqueda de texto o filtro por tracción, se aplica en el cliente
        if (!hasSearchTerm && !hasTractionFilter) {
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

        // FILTRO: Tracción (en cliente, por título/descripción/características)
        if (hasTractionFilter) {
            const tractionVal = traction!;
            filteredData = filteredData.filter(v => {
                const vTraction = getVehicleTraction(v);
                if (!vTraction) return false;
                if (tractionVal === '4x4') return vTraction === '4x4' || vTraction === 'AWD' || vTraction === '4WD';
                if (tractionVal === '4x2') return vTraction === 'FWD' || vTraction === 'RWD';
                return true;
            });
        }

        // FILTRO: Búsqueda por texto (en cliente). Normaliza acentos para que "Raptor" encuentre "Ráptor"
        if (hasSearchTerm) {
            const normalizeForSearch = (s: string) =>
                s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
            const searchNorm = normalizeForSearch(searchTerm!);
            filteredData = filteredData.filter(v => {
                const searchableText = normalizeForSearch(`
                    ${v.title || ''} ${v.description || ''} ${v.brand || ''} ${v.model || ''} ${v.trim || ''}
                    ${v.characteristics?.join(' ') || ''} ${v.extras?.join(' ') || ''}
                `);
                return searchableText.includes(searchNorm);
            });
        }

        if (hasSearchTerm || hasTractionFilter) {
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
            .select(`*`)
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
            .select(`*`)
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
            .select(`*`)
            .eq('status', status)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error al obtener vehículos por estado:', error);
            return [];
        }

        return data as VehicleWithSeller[];
    },

    // Nota: ya no se filtra por datos del vendedor (scraper_sellers); solo por campos propios del vehículo.

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
            if (vehicle.year != null) years.add(String(vehicle.year));
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
        trim?: string;
        regionFilter?: 'all' | 'coast' | 'sierra';
    } = {}): Promise<{
        brands: string[];
        models: string[];
        motors: string[];
        years: string[];
        cities: string[];
        trims: string[];
    }> {
        const { brand, model, motor, year, city, trim, regionFilter = 'all' } = filters;
        const empty = { brands: [], models: [], motors: [], years: [], cities: [], trims: [] };

        let query = supabase
            .from('scraper_vehicles')
            .select('brand, model, motor, year, location, trim');

        if (regionFilter === 'coast') {
            query = query.eq('region', 'costa');
        } else if (regionFilter === 'sierra') {
            query = query.eq('region', 'sierra');
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
        const trimsSet = new Set<string>();

        const selectedYearNumber = year ? Number(year) : null;

        data.forEach(v => {
            if (v.brand) brandsSet.add(v.brand);

            if (!brand || v.brand === brand) {
                if (v.model) modelsSet.add(v.model);
            }

            if ((!brand || v.brand === brand) && (!model || v.model === model)) {
                if (v.motor) motorsSet.add(v.motor);
            }

            if (
                (!brand || v.brand === brand) &&
                (!model || v.model === model) &&
                (!motor || v.motor === motor)
            ) {
                if (v.year != null) yearsSet.add(String(v.year));
            }

            if (
                (!brand || v.brand === brand) &&
                (!model || v.model === model) &&
                (!motor || v.motor === motor) &&
                (selectedYearNumber == null || v.year === selectedYearNumber)
            ) {
                if (v.location) citiesSet.add(v.location);
            }

            if (
                (!brand || v.brand === brand) &&
                (!model || v.model === model) &&
                (!motor || v.motor === motor) &&
                (selectedYearNumber == null || v.year === selectedYearNumber)
            ) {
                if (v.trim) trimsSet.add(v.trim);
            }
        });

        return {
            brands: Array.from(brandsSet).sort(),
            models: Array.from(modelsSet).sort(),
            motors: Array.from(motorsSet).sort(),
            years: Array.from(yearsSet).sort((a, b) => Number(b) - Number(a)),
            cities: Array.from(citiesSet).sort(),
            trims: Array.from(trimsSet).sort(),
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

    /**
     * Construye el término de búsqueda para un pedido (ej. "Toyota Hilux 2020" o "Kia Sportage 2018 2022").
     */
    buildSearchTermForRequest(request: { brand: string; model: string; year_min?: number | null; year_max?: number | null }): string {
        const { brand, model, year_min, year_max } = request;
        let term = `${brand} ${model}`.trim();
        if (year_min != null && year_max != null && year_min === year_max) {
            term += ` ${year_min}`;
        } else if (year_min != null && year_max != null) {
            term += ` ${year_min} ${year_max}`;
        } else if (year_min != null) {
            term += ` ${year_min}`;
        } else if (year_max != null) {
            term += ` ${year_max}`;
        }
        return term;
    },

    /**
     * Devuelve vehículos de scraper_vehicles que coinciden con el pedido (marca, modelo, año en rango).
     * Sirve para "Ver opciones" y para mostrar resultados tras scrapear.
     */
    async getVehiclesMatchingRequest(request: { brand: string; model: string; year_min?: number | null; year_max?: number | null }): Promise<VehicleWithSeller[]> {
        let query = supabase
            .from('scraper_vehicles')
            .select(`*`)
            .eq('brand', request.brand)
            .eq('model', request.model)
            .order('created_at', { ascending: false });

        if (request.year_min != null || request.year_max != null) {
            if (request.year_min != null) {
                query = query.gte('year', String(request.year_min));
            }
            if (request.year_max != null) {
                query = query.lte('year', String(request.year_max));
            }
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error al obtener vehículos del pedido:', error);
            return [];
        }
        return (data || []) as VehicleWithSeller[];
    },

    async scrapMarketplace(searchTerm: string): Promise<WebhookResponse | null> {
        if (!searchTerm.trim()) {
            console.warn('scrapMarketplace: término vacío');
            return { status: 'error', message: 'El término de búsqueda no puede estar vacío.' };
        }

        // Proxy en nuestra API para evitar CORS (el navegador no puede llamar a n8n directamente).
        const url = '/api/scraper/marketplace';
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ searchValue: searchTerm.trim() }),
            });

            const rawText = await response.text();
            if (!response.ok) {
                console.error('[Scraper] Webhook error:', response.status, response.statusText, rawText.slice(0, 500));
                return {
                    status: 'error',
                    message: `El servidor respondió con ${response.status}. ${rawText.slice(0, 200) || response.statusText}`,
                };
            }

            let data: unknown;
            try {
                data = JSON.parse(rawText);
            } catch {
                console.error('[Scraper] Respuesta no es JSON:', rawText.slice(0, 300));
                return { status: 'error', message: 'La respuesta del servidor no es válida (no es JSON).' };
            }

            return data as WebhookResponse;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('[Scraper] Error al scrapear:', err);
            if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('Load failed')) {
                return { status: 'error', message: 'Error de red o CORS. ¿El servidor n8n está accesible desde este navegador?' };
            }
            return { status: 'error', message: `Error: ${message}` };
        }
    },
    async scrapAllBrands() {
        try {
            const response = await fetch('/api/scraper/all-brands', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            })


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