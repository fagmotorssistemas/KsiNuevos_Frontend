import { VehicleWithSeller } from "@/services/scraper.service";
import { Database } from "@/types/supabase";

type PriceStatistics = Database['public']['Tables']['scraper_vehicle_price_statistics']['Row'];

// ─────────────────────────────────────────────────────────────────────────────
// Regex-based metadata extraction from title + description
// ─────────────────────────────────────────────────────────────────────────────

/** Extracts the first known trim level from free text. */
export function extractTrim(text: string): string | null {
    const normalized = text.toUpperCase();
    const trims = [
        // Toyota / Honda / Mazda
        'TOURING', 'PREMIUM', 'PLATINUM', 'TITANIUM', 'DIAMOND',
        // Honda
        'EX-L', 'EX', 'LX',
        // Toyota
        'XLE', 'XSE', 'XLS', 'LE', 'SE',
        // Ford
        'LARIAT', 'KING RANCH', 'RAPTOR', 'PLATINUM', 'XLT', 'XL',
        // Kia / Hyundai
        'SX', 'EX', 'LX', 'GT', 'SPORT',
        // Nissan
        'ADVANCE', 'SENSE', 'EXCLUSIVE', 'TEKNA',
        // Generic
        'LIMITED', 'SPORT', 'PLUS', 'PRO', 'BASE', 'FULL',
        'FULL EQUIPO', 'FULL EXTRAS', 'FULL OPCIONES',
    ];
    for (const trim of trims) {
        const re = new RegExp(`\\b${trim.replace(' ', '\\s+')}\\b`);
        if (re.test(normalized)) return trim.charAt(0) + trim.slice(1).toLowerCase();
    }
    return null;
}

/** Extracts fuel type from free text. */
export function extractFuelType(text: string): 'Gasolina' | 'Diésel' | 'Híbrido' | 'Eléctrico' | 'GLP' | null {
    const t = text.toLowerCase();
    if (/\bel[eé]ctrico?\b|\bevs?\b|\bbatería\b/.test(t)) return 'Eléctrico';
    if (/\bh[ií]brido?\b|\bhybrid\b/.test(t)) return 'Híbrido';
    if (/\bdiesel\b|\bdi[eé]sel\b|\bd[ée]sel\b/.test(t)) return 'Diésel';
    if (/\bglp\b|gas licuado|\bgnv\b/.test(t)) return 'GLP';
    if (/\bgasolina\b|\bgas[o]?lin[a]?\b/.test(t)) return 'Gasolina';
    return null;
}

/** Extracts traction/drivetrain from free text. */
export function extractTraction(text: string): '4x4' | 'AWD' | '4WD' | 'FWD' | 'RWD' | null {
    const t = text.toLowerCase();
    if (/\b4x4\b/.test(t)) return '4x4';
    if (/\bawd\b/.test(t)) return 'AWD';
    if (/\b4wd\b/.test(t)) return '4WD';
    if (/\bfwd\b/.test(t)) return 'FWD';
    if (/\brwd\b/.test(t)) return 'RWD';
    return null;
}

/** Extracts body type from title and description via regex. */
export function extractBodyType(text: string): 'SUV' | 'Pick-up' | 'Sedán' | 'Hatchback' | 'Coupé' | 'Van' | 'Camión' | null {
    const t = text.toLowerCase();
    if (/\bsuv\b|\bcrossover\b/.test(t)) return 'SUV';
    if (/\bpick.?up\b|\bpickup\b|\bcamioneta\b/.test(t)) return 'Pick-up';
    if (/\bsedan\b|\bsed[áa]n\b/.test(t)) return 'Sedán';
    if (/\bhatch\b|\bhatchback\b/.test(t)) return 'Hatchback';
    if (/\bcoup[eé]\b/.test(t)) return 'Coupé';
    if (/\bvan\b|\bfurgoneta\b|\bminivan\b/.test(t)) return 'Van';
    if (/\bcami[oó]n\b|\btruck\b/.test(t)) return 'Camión';
    return null;
}

/**
 * Parses engine displacement from the motor field.
 * Handles formats like "2.0", "2,0", "1800cc", "1.8L", "3000cc".
 * Returns liters as a float, or null if not parseable.
 */
export function parseEngineCC(motor: string | null | undefined): number | null {
    if (!motor) return null;
    const m = motor.toLowerCase();

    // Match "2.0", "2,0", "1.8L", "2.5l"
    const literMatch = m.match(/(\d+)[.,](\d+)\s*l?\b/);
    if (literMatch) {
        return parseFloat(`${literMatch[1]}.${literMatch[2]}`);
    }

    // Match "1800cc", "2000 cc", "3000CC"
    const ccMatch = m.match(/(\d{3,4})\s*cc\b/);
    if (ccMatch) {
        return parseInt(ccMatch[1]) / 1000;
    }

    // Match plain integers like "2000" or "1800" (assume cc if > 100)
    const plainMatch = m.match(/\b(\d{3,4})\b/);
    if (plainMatch) {
        const val = parseInt(plainMatch[1]);
        if (val > 100) return val / 1000;
    }

    return null;
}

/** Returns true if two km values are within ±pct% of each other. */
export function mileageWithinRange(kmA: number, kmB: number, pct = 0.20): boolean {
    if (kmA <= 0 || kmB <= 0) return true;
    const delta = Math.abs(kmA - kmB) / Math.max(kmA, kmB);
    return delta <= pct;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scored vehicle
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoredVehicle extends VehicleWithSeller {
    opportunityScore: number;
    scoreBreakdown: {
        priceScore: number;
        mileageScore: number;
        conditionScore: number;
        marketScore: number;
        recencyScore: number;
        // Bonus breakdown (informational)
        motorBonus: number;
        transmissionBonus: number;
        trimBonus: number;
        sellerBonus: number;
        transparencyBonus: number;
    };
    tags: string[];
    parsedTrim: string | null;
    parsedFuelType: 'Gasolina' | 'Diésel' | 'Híbrido' | 'Eléctrico' | 'GLP' | null;
    parsedTraction: '4x4' | 'AWD' | '4WD' | 'FWD' | 'RWD' | null;
    parsedBodyType: 'SUV' | 'Pick-up' | 'Sedán' | 'Hatchback' | 'Coupé' | 'Van' | 'Camión' | null;
    parsedEngineCC: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scorer
// ─────────────────────────────────────────────────────────────────────────────

export class OpportunityScorer {

    private static readonly WEIGHTS = {
        PRICE: 0.50,
        MILEAGE: 0.20,
        CONDITION: 0.15,
        MARKET: 0.10,
        RECENCY: 0.05,
    };

    private static readonly AVG_KM_PER_YEAR = 17000;

    private static readonly HIGH_LIQUIDITY_BRANDS = [
        'toyota', 'chevrolet', 'kia', 'hyundai', 'nissan', 'mazda', 'honda', 'suzuki',
    ];

    private static readonly SLOW_MARKET_BRANDS = [
        'bmw', 'mercedes', 'audi', 'land rover', 'volvo', 'jeep', 'chery', 'jac', 'jetour',
    ];

    // ── Bonus: Motor ─────────────────────────────────────────────────────────
    /**
     * Awards points based on engine displacement.
     * Having any engine info = +1 (shows seller transparency).
     * Displacement tiers are additive:
     *   ≥1.0L → +2 pts   (on top of base +1, total = 3)
     *   ≥2.0L → +5 pts   (replaces 1.0L tier, total = 6)
     *   ≥3.0L → +10 pts  (replaces 2.0L tier, total = 11)
     */
    private static calculateMotorBonus(engineCC: number | null, motor: string | null): number {
        if (!motor) return 0;

        let bonus = 1; // Base: motor field is populated

        if (engineCC === null) return bonus; // Has motor info but couldn't parse CC

        if (engineCC >= 3.0) {
            bonus += 10;
        } else if (engineCC >= 2.0) {
            bonus += 5;
        } else if (engineCC >= 1.0) {
            bonus += 2;
        }

        return bonus;
    }

    // ── Bonus: Transmission ──────────────────────────────────────────────────
    /**
     * Automatic gets +5 (higher demand, easier resale in Ecuador).
     * Manual gets +2 (at least it's documented).
     * No transmission info = 0.
     */
    private static calculateTransmissionBonus(transmission: string | null | undefined): number {
        if (!transmission) return 0;
        const t = transmission.toLowerCase();
        if (/autom[aá]tic[ao]|automatic|tiptronic|cvt|dsg|pdk|at\b/.test(t)) return 5;
        if (/manual|m[tT]\b|stick/.test(t)) return 2;
        return 0;
    }

    // ── Bonus: Trim ──────────────────────────────────────────────────────────
    private static calculateTrimBonus(parsedTrim: string | null): number {
        if (!parsedTrim) return 0;
        const t = parsedTrim.toLowerCase();
        const highResaleTrims = ['touring', 'ex-l', 'xle', 'lariat', 'limited', 'platinum', 'titanium', 'premium'];
        return highResaleTrims.some(tr => t.includes(tr)) ? 5 : 0;
    }

    // ── Bonus: Seller quality ────────────────────────────────────────────────
    /**
     * NEW: Rewards listings from sellers with proven track records.
     * A seller with many successful listings is less likely to be a scam.
     *   - Has seller data at all: +1
     *   - total_listings ≥ 10:   +2 (experienced seller)
     *   - total_listings ≥ 50:   +3 (high-volume, established)
     *   - Has badges:            +2 (platform-verified)
     */
    private static calculateSellerBonus(vehicle: VehicleWithSeller): number {
        const seller = vehicle.seller;
        if (!seller) return 0;

        let bonus = 1; // Has seller info

        const listings = seller.total_listings ?? 0;
        if (listings >= 50) bonus += 3;
        else if (listings >= 10) bonus += 2;

        if (seller.badges) bonus += 2;

        return bonus;
    }

    // ── Bonus: Listing transparency ──────────────────────────────────────────
    /**
     * NEW: Rewards listings that are more complete and transparent.
     * Buyers trust listings with more photos and detailed info.
     *   - Has multiple images (≥3): +2
     *   - Has multiple images (≥6): +3
     *   - Has description:         +1
     *   - Has extras list:         +1
     *   - Has characteristics:     +1
     * Max: +6 pts
     */
    private static calculateTransparencyBonus(vehicle: VehicleWithSeller): number {
        let bonus = 0;

        const imgCount = vehicle.listing_image_urls?.length ?? 0;
        if (imgCount >= 6) bonus += 3;
        else if (imgCount >= 3) bonus += 2;

        if (vehicle.description && vehicle.description.trim().length > 50) bonus += 1;
        if (vehicle.extras && vehicle.extras.length > 0) bonus += 1;
        if (vehicle.characteristics && vehicle.characteristics.length > 0) bonus += 1;

        return bonus;
    }

    // ── Main scorer ──────────────────────────────────────────────────────────

    static scoreVehicle(
        vehicle: VehicleWithSeller,
        priceStats: PriceStatistics | null
    ): ScoredVehicle {
        const rawText = [
            vehicle.title,
            vehicle.description,
            ...(vehicle.characteristics ?? []),
            ...(vehicle.extras ?? []),
            ...(vehicle.tags ?? []),
        ].filter(Boolean).join(' ');

        const parsedTrim = extractTrim(rawText);
        const parsedFuelType = extractFuelType(rawText);
        const parsedTraction = extractTraction(rawText);
        const parsedBodyType = extractBodyType(rawText);
        const parsedEngineCC = parseEngineCC(vehicle.motor);

        // Core scores (weighted, each 0–100)
        const priceScore = this.calculatePriceScore(vehicle, priceStats);
        const mileageScore = this.calculateMileageScore(vehicle);
        const conditionScore = this.calculateConditionScore(vehicle);
        const marketScore = this.calculateMarketScore(vehicle);
        const recencyScore = this.calculateRecencyScore(vehicle);

        // Bonuses (flat points added after weighted sum)
        const motorBonus = this.calculateMotorBonus(parsedEngineCC, vehicle.motor);
        const transmissionBonus = this.calculateTransmissionBonus(vehicle.transmission);
        const trimBonus = this.calculateTrimBonus(parsedTrim);
        const sellerBonus = this.calculateSellerBonus(vehicle);
        const transparencyBonus = this.calculateTransparencyBonus(vehicle);

        const weightedScore =
            (priceScore * this.WEIGHTS.PRICE) +
            (mileageScore * this.WEIGHTS.MILEAGE) +
            (conditionScore * this.WEIGHTS.CONDITION) +
            (marketScore * this.WEIGHTS.MARKET) +
            (recencyScore * this.WEIGHTS.RECENCY);

        const totalBonuses =
            motorBonus + transmissionBonus + trimBonus + sellerBonus + transparencyBonus;

        const totalScore = weightedScore + totalBonuses;

        // ── Tags ──
        const tags: string[] = [];
        if (priceScore > 85) tags.push('Precio Excelente');
        if (mileageScore > 90) tags.push('Poco Uso');
        if (marketScore > 85) tags.push('Alta Reventa');
        if (conditionScore > 90) tags.push('Impecable');
        if (parsedEngineCC && parsedEngineCC >= 3.0) tags.push('Motor Potente');
        if (transmissionBonus === 5) tags.push('Automático');
        if (sellerBonus >= 4) tags.push('Vendedor Confiable');
        if (transparencyBonus >= 4) tags.push('Listado Completo');
        if (parsedTrim && ['touring', 'ex-l', 'xle', 'lariat', 'limited'].some(t => parsedTrim.toLowerCase().includes(t))) {
            tags.push('Trim Premium');
        }
        if (parsedFuelType === 'Híbrido' || parsedFuelType === 'Eléctrico') tags.push('Eco');

        return {
            ...vehicle,
            opportunityScore: Math.round(Math.min(100, Math.max(0, totalScore)) * 100) / 100,
            scoreBreakdown: {
                priceScore,
                mileageScore,
                conditionScore,
                marketScore,
                recencyScore,
                motorBonus,
                transmissionBonus,
                trimBonus,
                sellerBonus,
                transparencyBonus,
            },
            tags,
            parsedTrim,
            parsedFuelType,
            parsedTraction,
            parsedBodyType,
            parsedEngineCC,
        };
    }

    // ── Core score calculators ────────────────────────────────────────────────

    private static calculatePriceScore(
        vehicle: VehicleWithSeller,
        priceStats: PriceStatistics | null
    ): number {
        if (!vehicle.price || !priceStats || !priceStats.median_price) return 50;

        const median = Number(priceStats.median_price);
        const price = vehicle.price;
        const discountPct = ((median - price) / median) * 100;

        if (discountPct > 45) return 40; // Sospechoso: demasiado barato
        if (discountPct > 20) return 100;
        if (discountPct > 5) return 80 + ((discountPct - 5) / 15) * 20;
        if (discountPct > -5) return 70; // Precio justo

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
            'NEW_ITEM': 100, 'PC_USED_LIKE_NEW': 95, 'PC_USED_GOOD': 80, 'USED': 70, 'DAMAGED': 20,
        };

        if (vehicle.condition) score = conditionMap[vehicle.condition] ?? 70;

        const text = [vehicle.title, vehicle.description].filter(Boolean).join(' ').toLowerCase();

        const positiveKeywords = ['único dueño', 'unico dueño', 'mantenimientos casa', 'flamante', 'cero choques', 'papeles al dia'];
        if (positiveKeywords.some(w => text.includes(w))) score += 10;

        const negativeKeywords = ['reparar', 'multas', 'deuda', 'chocado', 'sin aire'];
        if (negativeKeywords.some(w => text.includes(w))) score -= 15;

        return Math.min(100, Math.max(10, score));
    }

    private static calculateMarketScore(vehicle: VehicleWithSeller): number {
        if (!vehicle.year || !vehicle.brand) return 50;

        const age = new Date().getFullYear() - parseInt(vehicle.year);
        const brand = vehicle.brand.toLowerCase();

        let ageScore = 50;
        if (age >= 0 && age <= 2) ageScore = 80;
        else if (age >= 3 && age <= 7) ageScore = 100;
        else if (age >= 8 && age <= 12) ageScore = 70;
        else ageScore = Math.max(30, 70 - ((age - 12) * 5));

        let brandMultiplier = 1.0;
        if (this.HIGH_LIQUIDITY_BRANDS.some(b => brand.includes(b))) brandMultiplier = 1.2;
        else if (this.SLOW_MARKET_BRANDS.some(b => brand.includes(b))) brandMultiplier = 0.8;

        return Math.min(100, ageScore * brandMultiplier);
    }

    private static calculateRecencyScore(vehicle: VehicleWithSeller): number {
        if (!vehicle.publication_date) return 50;
        const hoursDiff = (Date.now() - new Date(vehicle.publication_date).getTime()) / 3_600_000;
        if (hoursDiff <= 24) return 100;
        const daysDiff = hoursDiff / 24;
        return Math.max(20, 100 - (daysDiff * 5));
    }

    // ── Public API ────────────────────────────────────────────────────────────

    static getTopOpportunities(
        vehicles: VehicleWithSeller[],
        priceStatsMap: Map<string, PriceStatistics>,
        limit: number = 6
    ): ScoredVehicle[] {
        // 1. Scorear todos
        const scored = vehicles
            .map(v => {
                const key = `${v.brand}_${v.model}_${v.year ?? ''}`;
                return this.scoreVehicle(v, priceStatsMap.get(key) ?? null);
            })
            .filter(v => v.price && v.price > 1000);

        // 2. Por cada brand+model+year, quedarse solo con el de mayor score
        const bestPerModel = new Map<string, ScoredVehicle>();
        scored.forEach(v => {
            const key = `${v.brand?.toLowerCase()}_${v.model?.toLowerCase()}_${v.year ?? ''}`;
            const current = bestPerModel.get(key);
            if (!current || v.opportunityScore > current.opportunityScore) {
                bestPerModel.set(key, v);
            }
        });

        // 3. Ordenar y limitar
        return Array.from(bestPerModel.values())
            .sort((a, b) => b.opportunityScore - a.opportunityScore)
            .slice(0, limit);
    }
}