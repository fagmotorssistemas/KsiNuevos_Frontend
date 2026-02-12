import { VehicleWithSeller } from "@/services/scraper.service";
import { Database } from "@/types/supabase";

type PriceStatistics = Database['public']['Tables']['scraper_vehicle_price_statistics']['Row'];

export interface ScoredVehicle extends VehicleWithSeller {
    opportunityScore: number;
    scoreBreakdown: {
        priceScore: number;
        mileageScore: number;
        conditionScore: number;
        marketScore: number;    
        recencyScore: number;
    };
    tags: string[]; 
}

export class OpportunityScorer {

    private static readonly WEIGHTS = {
        PRICE: 0.50,      
        MILEAGE: 0.20,    
        CONDITION: 0.15,  
        MARKET: 0.10,     
        RECENCY: 0.05     
    };

    private static readonly AVG_KM_PER_YEAR = 17000; 

    // Marcas con alta rotación (Alta Liquidez) en Latam/Ecuador
    private static readonly HIGH_LIQUIDITY_BRANDS = [
        'toyota', 'chevrolet', 'kia', 'hyundai', 'nissan', 'mazda', 'honda', 'suzuki'
    ];

    // Marcas de nicho o lujo (Venta más lenta usada)
    private static readonly SLOW_MARKET_BRANDS = [
        'bmw', 'mercedes', 'audi', 'land rover', 'volvo', 'jeep', 'chery', 'jac', 'jetour'
    ];

    static scoreVehicle(
        vehicle: VehicleWithSeller,
        priceStats: PriceStatistics | null
    ): ScoredVehicle {
        const priceScore = this.calculatePriceScore(vehicle, priceStats);
        const mileageScore = this.calculateMileageScore(vehicle);
        const conditionScore = this.calculateConditionScore(vehicle);
        const marketScore = this.calculateMarketScore(vehicle);
        const recencyScore = this.calculateRecencyScore(vehicle);

        let totalScore =
            (priceScore * this.WEIGHTS.PRICE) +
            (mileageScore * this.WEIGHTS.MILEAGE) +
            (conditionScore * this.WEIGHTS.CONDITION) +
            (marketScore * this.WEIGHTS.MARKET) +
            (recencyScore * this.WEIGHTS.RECENCY);

        const tags: string[] = [];
        if (priceScore > 85) tags.push("Precio Excelente");
        if (mileageScore > 90) tags.push("Poco Uso");
        if (marketScore > 85) tags.push("Alta Reventa");
        if (conditionScore > 90) tags.push("Impecable");

        return {
            ...vehicle,
            opportunityScore: Math.round(Math.min(100, Math.max(0, totalScore)) * 100) / 100,
            scoreBreakdown: {
                priceScore,
                mileageScore,
                conditionScore,
                marketScore,
                recencyScore
            },
            tags
        };
    }

    private static calculatePriceScore(
        vehicle: VehicleWithSeller,
        priceStats: PriceStatistics | null
    ): number {
        if (!vehicle.price || !priceStats || !priceStats.median_price) return 50;

        const median = Number(priceStats.median_price);
        const price = vehicle.price;
        const discountPct = ((median - price) / median) * 100;

        if (discountPct > 45) return 40; // Sospechoso
        if (discountPct > 20) return 100; // Gran oferta
        if (discountPct > 5) return 80 + ((discountPct - 5) / 15) * 20;
        if (discountPct > -5) return 70; // Precio Justo
        
        return Math.max(0, 70 - (Math.abs(discountPct) * 1.5));
    }

    private static calculateMileageScore(vehicle: VehicleWithSeller): number {
        if (!vehicle.mileage || !vehicle.year) return 50;

        const currentYear = new Date().getFullYear();
        const age = Math.max(0.5, currentYear - parseInt(vehicle.year));
        const kmPerYear = vehicle.mileage / age;

        if (kmPerYear < 5000) return 100;
        if (kmPerYear < 10000) return 90 + ((10000 - kmPerYear) / 5000) * 10;
        if (kmPerYear < this.AVG_KM_PER_YEAR) {
            return 60 + ((this.AVG_KM_PER_YEAR - kmPerYear) / (this.AVG_KM_PER_YEAR - 10000)) * 30;
        }
        
        const penaltyRatio = kmPerYear / this.AVG_KM_PER_YEAR;
        return Math.max(0, 60 - ((penaltyRatio - 1) * 60));
    }

    private static calculateConditionScore(vehicle: VehicleWithSeller): number {
        let score = 70;
        const conditionMap: Record<string, number> = {
            'NEW_ITEM': 100, 'PC_USED_LIKE_NEW': 95, 'PC_USED_GOOD': 80, 'USED': 70, 'DAMAGED': 20
        };

        if (vehicle.condition) score = conditionMap[vehicle.condition] || 70;

        const text = (vehicle.description + " " + (vehicle.title || "")).toLowerCase();
        
        const positiveKeywords = ["único dueño", "unico dueño", "mantenimientos casa", "flamante", "cero choques", "papeles al dia"];
        if (positiveKeywords.some(w => text.includes(w))) score += 10;

        const negativeKeywords = ["reparar", "multas", "deuda", "chocado", "sin aire"];
        if (negativeKeywords.some(w => text.includes(w))) score -= 15;

        return Math.min(100, Math.max(10, score));
    }

    // ─── LÓGICA DE MERCADO MEJORADA ──────────────────────────────────────────
    private static calculateMarketScore(vehicle: VehicleWithSeller): number {
        if (!vehicle.year || !vehicle.brand) return 50;
        
        const age = new Date().getFullYear() - parseInt(vehicle.year);
        const brand = vehicle.brand.toLowerCase();

        // 1. Puntaje Base por Edad (Curva de Liquidez)
        let ageScore = 50;
        if (age >= 0 && age <= 2) ageScore = 80;        // Casi nuevo (caro pero deseable)
        else if (age >= 3 && age <= 7) ageScore = 100;  // Punto dulce (depreciado pero moderno)
        else if (age >= 8 && age <= 12) ageScore = 70;  // Usado medio
        else ageScore = Math.max(30, 70 - ((age - 12) * 5)); // Auto viejo

        // 2. Ajuste por Marca (Liquidez de Mercado)
        let brandMultiplier = 1.0;

        if (this.HIGH_LIQUIDITY_BRANDS.some(b => brand.includes(b))) {
            brandMultiplier = 1.2; // +20% liquidez
        } else if (this.SLOW_MARKET_BRANDS.some(b => brand.includes(b))) {
            brandMultiplier = 0.8; // -20% liquidez
        }

        return Math.min(100, ageScore * brandMultiplier);
    }

    private static calculateRecencyScore(vehicle: VehicleWithSeller): number {
        if (!vehicle.publication_date) return 50;
        const hoursDiff = (new Date().getTime() - new Date(vehicle.publication_date).getTime()) / (3600000);
        if (hoursDiff <= 24) return 100;
        const daysDiff = hoursDiff / 24;
        return Math.max(20, 100 - (daysDiff * 5));
    }

    static getTopOpportunities(
        vehicles: VehicleWithSeller[],
        priceStatsMap: Map<string, PriceStatistics>,
        limit: number = 4
    ): ScoredVehicle[] {
        return vehicles
            .map(v => {
                const key = `${v.brand}_${v.model}_${v.year || ''}`;
                return this.scoreVehicle(v, priceStatsMap.get(key) || null);
            })
            .filter(v => v.price && v.price > 1000)
            .sort((a, b) => b.opportunityScore - a.opportunityScore)
            .slice(0, limit);
    }
}