import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Database } from "@/types/supabase";

export type InventoryCarRow = Database['public']['Tables']['inventoryoracle']['Row'];

export interface SimulatorValues {
    clientName: string;
    clientId: string;
    clientPhone: string;
    clientAddress: string;
    vehiclePrice: number;
    downPaymentPercentage: number;
    
    // NUEVOS CAMPOS PARA SOLUCIONAR EL BUG
    downPaymentMode: 'percentage' | 'amount'; // 'percentage' | 'amount'
    customDownPaymentAmount: number; // Guarda el valor exacto en $
    
    termMonths: number;
    interestRateMonthly: number;
    adminFee: number;
    gpsFee: number;
    insuranceFee: number;
    startDate: string;
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
    const { supabase, user } = useAuth();
    const searchParams = useSearchParams();

    // --- ESTADOS ---
    const [inventory, setInventory] = useState<InventoryCarRow[]>([]);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Valores por defecto
    const defaultValues: SimulatorValues = {
        clientName: "",
        clientId: "",
        clientPhone: "",
        clientAddress: "",
        vehiclePrice: 10000,
        downPaymentPercentage: 60, // Valor inicial razonable
        
        // Inicializamos en modo porcentaje por defecto
        downPaymentMode: 'percentage',
        customDownPaymentAmount: 6000, // 60% de 10000
        
        termMonths: 36,
        interestRateMonthly: 1.5,
        adminFee: 386,
        gpsFee: 686,
        insuranceFee: 400,
        startDate: new Date().toISOString().split('T')[0],
        selectedVehicle: null 
    };

    const [values, setValues] = useState<SimulatorValues>(defaultValues);

    // --- 1. CARGAR INVENTARIO ---
    const fetchInventory = useCallback(async () => {
        setIsLoadingInventory(true);
        const { data, error } = await supabase
            .from('inventoryoracle')
            .select('*')
            .eq('status', 'disponible')
            .order('brand', { ascending: true });

        if (error) {
            console.error("Error cargando inventario:", error);
            toast.error("Error al cargar vehículos");
        } else {
            setInventory(data || []);
        }
        setIsLoadingInventory(false);
        return data || [];
    }, [supabase]);

    // --- 2. INICIALIZACIÓN INTELIGENTE ---
    useEffect(() => {
        const init = async () => {
            const loadedInventory = await fetchInventory();
            
            const urlName = searchParams.get('clientName');
            const urlPhone = searchParams.get('clientPhone');
            const urlClientId = searchParams.get('clientId');
            const vehicleSearch = searchParams.get('vehicleSearch');

            setValues(prev => {
                let updated = { ...prev };
                
                if (urlName) updated.clientName = urlName;
                if (urlPhone) updated.clientPhone = urlPhone;
                if (urlClientId) updated.clientId = urlClientId;

                if (vehicleSearch && loadedInventory.length > 0) {
                    const foundCar = loadedInventory.find(car => {
                        const fullName = `${car.brand} ${car.model}`.toLowerCase();
                        return fullName.includes(vehicleSearch.toLowerCase());
                    });

                    if (foundCar) {
                        updated.selectedVehicle = foundCar;
                        updated.vehiclePrice = foundCar.price || 0;
                        updated.insuranceFee = Math.round((foundCar.price || 0) * 0.03);
                        // Al cambiar vehículo, solemos querer mantener el porcentaje o resetear a uno estándar
                        // Mantenemos el modo actual o reseteamos a porcentaje si se prefiere
                    }
                }

                return updated;
            });
        };

        init();
    }, [fetchInventory, searchParams]);

    // --- 3. Lógica de Negocio ---
    const results = useMemo<SimulatorResults>(() => {
        
        // LÓGICA CRÍTICA: Determinar la entrada exacta
        let downPaymentAmount = 0;
        
        if (values.downPaymentMode === 'amount') {
            // Si el usuario escribió un monto ($7000), USAMOS ESE EXACTAMENTE
            downPaymentAmount = values.customDownPaymentAmount;
        } else {
            // Si el usuario usa porcentaje, calculamos
            downPaymentAmount = values.vehiclePrice * (values.downPaymentPercentage / 100);
        }

        const vehicleBalance = values.vehiclePrice - downPaymentAmount;
        const totalCapital = vehicleBalance + values.adminFee + values.gpsFee + values.insuranceFee;
        const totalInterest = totalCapital * (values.interestRateMonthly / 100) * values.termMonths;
        const totalDebt = totalCapital + totalInterest;
        const monthlyPayment = values.termMonths > 0 ? totalDebt / values.termMonths : 0;

        const schedule = Array.from({ length: values.termMonths }).map((_, index) => {
            const date = new Date(values.startDate);
            date.setMonth(date.getMonth() + index + 1);
            return {
                cuotaNumber: index + 1,
                date: date.toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' }),
                amount: monthlyPayment
            };
        });

        return { downPaymentAmount, vehicleBalance, totalCapital, totalInterest, totalDebt, monthlyPayment, schedule };
    }, [values]);

    // --- 4. Actions ---
    const updateField = (field: keyof SimulatorValues, value: any) => {
        setValues(prev => {
            const updates: any = { [field]: value };
            
            // Si seleccionan vehículo, actualizamos precio
            if (field === 'selectedVehicle' && value) {
                const car = value as InventoryCarRow;
                updates.vehiclePrice = car.price || 0; 
            }

            // Si el usuario edita el PORCENTAJE manualmente, cambiamos a modo porcentaje
            if (field === 'downPaymentPercentage') {
                updates.downPaymentMode = 'percentage';
            }

            return { ...prev, ...updates };
        });
    };

    const updateDownPaymentByAmount = (amount: number) => {
        setValues(prev => {
            const price = prev.vehiclePrice > 0 ? prev.vehiclePrice : 1;
            const newPercentage = (amount / price) * 100;

            return {
                ...prev,
                downPaymentMode: 'amount', // Activamos modo monto exacto
                customDownPaymentAmount: amount, // Guardamos los $7000 exactos
                downPaymentPercentage: newPercentage // Actualizamos el % solo visualmente
            };
        });
    };

    const resetDefaults = () => setValues(defaultValues);

    // --- 5. GUARDAR (MODIFICADO PARA PDF) ---
    // Aceptamos un objeto opcional 'extraData' donde vendrá la URL del PDF
    const saveProforma = async (extraData: { pdf_url?: string } = {}) => {
        if (!user) {
            toast.error("Inicia sesión para guardar.");
            return false;
        }
        if (!values.clientName || !values.clientId) {
            toast.error("Faltan datos del cliente.");
            return false;
        }

        setIsSaving(true);
        
        const dataToSave = {
            created_by: user.id,
            client_name: values.clientName,
            client_id: values.clientId,
            client_phone: values.clientPhone,
            client_address: values.clientAddress,
            vehicle_id: values.selectedVehicle?.id || null, 
            vehicle_description: values.selectedVehicle 
                ? `${values.selectedVehicle.brand} ${values.selectedVehicle.model} ${values.selectedVehicle.year}` 
                : 'Vehículo Personalizado / No listado',
            vehicle_price: values.vehiclePrice,
            
            // Guardamos el monto final calculado
            down_payment_amount: results.downPaymentAmount,
            
            term_months: values.termMonths,
            interest_rate: values.interestRateMonthly,
            monthly_payment: results.monthlyPayment,
            status: 'generada',
            pdf_url: extraData.pdf_url || null // GUARDAMOS LA URL DEL PDF
        };

        const { error } = await supabase.from('credit_proformas').insert(dataToSave);
        
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
        inventory,
        isLoadingInventory,
        isSaving,
        saveProforma,
        updateField,
        updateDownPaymentByAmount,
        resetDefaults
    };
} 