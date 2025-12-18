import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner"; // O la librería de alertas que uses
import type { Database } from "@/types/supabase";

// --- TIPOS ---
// Definimos el tipo del Inventario basado en tu Supabase existente
export type InventoryCarRow = Database['public']['Tables']['inventory']['Row'];

export interface SimulatorValues {
    // Datos Cliente
    clientName: string;
    clientId: string;
    clientPhone: string;
    clientAddress: string;

    // Datos Financieros
    vehiclePrice: number;
    downPaymentPercentage: number;
    termMonths: number;
    interestRateMonthly: number;
    adminFee: number;
    gpsFee: number;
    insuranceFee: number;
    startDate: string;

    // Nuevo: Vehículo Seleccionado (Objeto completo de la BD)
    selectedVehicle: InventoryCarRow | null;
}

export interface SimulatorResults {
    downPaymentAmount: number;
    vehicleBalance: number;
    totalCapital: number;
    totalInterest: number;
    totalDebt: number;
    monthlyPayment: number;
    schedule: Array<{
        cuotaNumber: number;
        date: string;
        amount: number;
    }>;
}

export function useCreditSimulator() {
    const { supabase, user } = useAuth(); // Traemos la conexión a la BD y el usuario

    // --- ESTADOS NUEVOS (Para Supabase) ---
    const [inventory, setInventory] = useState<InventoryCarRow[]>([]);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Valores por defecto (Tu configuración original + el vehículo en null)
    const defaultValues: SimulatorValues = {
        clientName: "",
        clientId: "",
        clientPhone: "",
        clientAddress: "",
        vehiclePrice: 10000,
        downPaymentPercentage: 60,
        termMonths: 36,
        interestRateMonthly: 1.5,
        adminFee: 386,
        gpsFee: 686,
        insuranceFee: 400,
        startDate: new Date().toISOString().split('T')[0],
        selectedVehicle: null // Inicialmente ningún vehículo seleccionado
    };

    const [values, setValues] = useState<SimulatorValues>(defaultValues);

    // --- 1. CARGAR INVENTARIO REAL ---
    const fetchInventory = useCallback(async () => {
        setIsLoadingInventory(true);
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .eq('status', 'disponible') // Solo autos disponibles
            .order('brand', { ascending: true });

        if (error) {
            console.error("Error cargando inventario:", error);
            toast.error("Error al cargar vehículos");
        } else {
            setInventory(data || []);
        }
        setIsLoadingInventory(false);
    }, [supabase]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    // --- 2. Lógica de Negocio (Tu lógica original intacta) ---
    const results = useMemo<SimulatorResults>(() => {
        // 1. Entrada y Saldo Vehículo
        const downPaymentAmount = values.vehiclePrice * (values.downPaymentPercentage / 100);
        const vehicleBalance = values.vehiclePrice - downPaymentAmount;

        // 2. Capital Total a Financiar (Saldo + Gastos Capitalizados)
        const totalCapital = vehicleBalance + values.adminFee + values.gpsFee + values.insuranceFee;

        // 3. Cálculo de Interés (SISTEMA FLAT / DIRECTO)
        const totalInterest = totalCapital * (values.interestRateMonthly / 100) * values.termMonths;

        // 4. Total Deuda
        const totalDebt = totalCapital + totalInterest;

        // 5. Cuota Mensual
        const monthlyPayment = totalDebt / values.termMonths;

        // 6. Generación de Tabla de Amortización
        const schedule = Array.from({ length: values.termMonths }).map((_, index) => {
            const date = new Date(values.startDate);
            date.setMonth(date.getMonth() + index + 1);

            return {
                cuotaNumber: index + 1,
                date: date.toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' }),
                amount: monthlyPayment
            };
        });

        return {
            downPaymentAmount,
            vehicleBalance,
            totalCapital,
            totalInterest,
            totalDebt,
            monthlyPayment,
            schedule
        };
    }, [values]);

    // --- 3. Actions (Modificado para actualizar precio al elegir auto) ---
    const updateField = (field: keyof SimulatorValues, value: any) => {
        setValues(prev => {
            const updates: any = { [field]: value };
            
            // MAGIA: Si seleccionan un vehículo, ponemos su precio automáticamente
            if (field === 'selectedVehicle' && value) {
                const car = value as InventoryCarRow;
                updates.vehiclePrice = car.price || 0; 
            }
            
            return { ...prev, ...updates };
        });
    };

    const updateDownPaymentByAmount = (amount: number) => {
        if (values.vehiclePrice > 0) {
            const percentage = (amount / values.vehiclePrice) * 100;
            setValues(prev => ({ ...prev, downPaymentPercentage: percentage }));
        }
    };

    const resetDefaults = () => {
        setValues(defaultValues);
    };

    // --- 4. GUARDAR PROFORMA (Nuevo) ---
    const saveProforma = async () => {
        if (!user) {
            toast.error("Inicia sesión para guardar.");
            return false;
        }
        if (!values.clientName || !values.clientId) {
            toast.error("Faltan datos del cliente.");
            return false;
        }

        setIsSaving(true);
        
        const { error } = await supabase.from('credit_proformas').insert({
            created_by: user.id,
            client_name: values.clientName,
            client_id: values.clientId,
            client_phone: values.clientPhone,
            client_address: values.clientAddress,
            // Guardamos ID y descripción por seguridad
            vehicle_id: values.selectedVehicle?.id || null, 
            vehicle_description: values.selectedVehicle 
                ? `${values.selectedVehicle.brand} ${values.selectedVehicle.model} ${values.selectedVehicle.year}` 
                : 'Vehículo Personalizado / No listado',
            vehicle_price: values.vehiclePrice,
            down_payment_amount: results.downPaymentAmount,
            term_months: values.termMonths,
            interest_rate: values.interestRateMonthly,
            monthly_payment: results.monthlyPayment,
            status: 'generada'
        });

        setIsSaving(false);

        if (error) {
            console.error("Error guardando:", error);
            toast.error("Error al guardar proforma.");
            return false;
        } else {
            toast.success("¡Proforma guardada exitosamente!");
            return true;
        }
    };

    return {
        values,
        results,
        // Nuevos
        inventory,
        isLoadingInventory,
        isSaving,
        saveProforma,
        // Viejos
        updateField,
        updateDownPaymentByAmount,
        resetDefaults
    };
}