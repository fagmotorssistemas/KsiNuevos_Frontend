import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "next/navigation";
import type { Database } from "@/types/supabase";

export type InventoryCarRow = Database["public"]["Tables"]["inventory"]["Row"];

export interface SimulatorValues {
  selectedVehicle: InventoryCarRow | null;
  vehiclePrice: number;

  // Entrada
  downPaymentMode: "percentage" | "amount";
  downPaymentPercentage: number;
  customDownPaymentAmount: number;

  // ✅ Crédito directo: tasa MENSUAL fija (simple)
  termMonths: number;
  interestRateMonthly: number; // ej: 1.5

  // ✅ Rubros únicos (se suman al capital)
  adminFee: number;     // ej: 386
  gpsFee: number;       // ej: 686
  insuranceFee: number; // ej: 444 (3% del precio)

  startDate: string;
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
    capital: number;
    interest: number;
    balance: number;
  }>;
}

export function useCreditSimulator() {
  const { supabase } = useAuth();
  const searchParams = useSearchParams();

  const [inventory, setInventory] = useState<InventoryCarRow[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  const defaultValues: SimulatorValues = {
    selectedVehicle: null,
    vehiclePrice: 10000,

    downPaymentMode: "percentage",
    downPaymentPercentage: 60,
    customDownPaymentAmount: 6000,

    termMonths: 36,
    interestRateMonthly: 1.5,

    adminFee: 386,
    gpsFee: 686,
    insuranceFee: 400, // se recalcula al elegir vehículo

    startDate: new Date().toISOString().split("T")[0],
  };

  const [values, setValues] = useState<SimulatorValues>(defaultValues);

  // --- 1. CARGAR INVENTARIO ---
  const fetchInventory = useCallback(async () => {
    setIsLoadingInventory(true);
    const { data } = await supabase
      .from("inventory")
      .select("*")
      .eq("status", "disponible")
      .order("brand", { ascending: true });

    setIsLoadingInventory(false);
    return data || [];
  }, [supabase]);

  // --- 2. INICIALIZACIÓN (URL SEARCH) ---
  useEffect(() => {
    const init = async () => {
      const loadedInventory = await fetchInventory();
      setInventory(loadedInventory);

      const vehicleSearch = searchParams.get("vehicleSearch");
      if (!vehicleSearch || loadedInventory.length === 0) return;

      const foundCar = loadedInventory.find((car) => {
        const fullName = `${car.brand} ${car.model}`.toLowerCase();
        return fullName.includes(vehicleSearch.toLowerCase());
      });

      if (!foundCar) return;

      const price = foundCar.price || 0;

      setValues((prev) => ({
        ...prev,
        selectedVehicle: foundCar,
        vehiclePrice: price,

        // ✅ Seguro total (3% del precio, NO /12)
        insuranceFee: Math.round(price * 0.03),

        // entrada 60%
        downPaymentMode: "percentage",
        downPaymentPercentage: 60,
        customDownPaymentAmount: price * 0.6,
      }));
    };

    init();
  }, [fetchInventory, searchParams]);

  // --- 3. MOTOR FINANCIERO DIRECTO (simple fijo) ---
  const results = useMemo<SimulatorResults>(() => {
    const minDownPayment = values.vehiclePrice * 0.6;
    let downPaymentAmount = 0;

    if (values.downPaymentMode === "amount") {
      downPaymentAmount = Math.max(values.customDownPaymentAmount, minDownPayment);
    } else {
      const safePercentage = Math.max(values.downPaymentPercentage, 60);
      downPaymentAmount = values.vehiclePrice * (safePercentage / 100);
    }

    const vehicleBalance = values.vehiclePrice - downPaymentAmount;

    // ✅ Capital = saldo + rubros únicos
    const totalCapital =
      vehicleBalance + values.adminFee + values.gpsFee + values.insuranceFee;

    // ✅ Interés simple fijo mensual
    const totalInterest =
      totalCapital * (values.interestRateMonthly / 100) * values.termMonths;

    const totalDebt = totalCapital + totalInterest;

    const monthlyPayment =
      values.termMonths > 0 ? totalDebt / values.termMonths : 0;

    // Tabla (capital + interés fijo mensual)
    const schedule: SimulatorResults["schedule"] = [];
    const capitalMonthly =
      values.termMonths > 0 ? totalCapital / values.termMonths : 0;
    const interestMonthly =
      values.termMonths > 0 ? totalInterest / values.termMonths : 0;

    let balance = totalCapital;

    for (let i = 1; i <= values.termMonths; i++) {
      balance -= capitalMonthly;

      const date = new Date(values.startDate);
      date.setMonth(date.getMonth() + i);

      schedule.push({
        cuotaNumber: i,
        date: date.toLocaleDateString("es-EC"),
        amount: monthlyPayment,
        capital: capitalMonthly,
        interest: interestMonthly,
        balance: Math.max(0, balance),
      });
    }

    return {
      downPaymentAmount,
      vehicleBalance,
      totalCapital,
      totalInterest,
      totalDebt,
      monthlyPayment,
      schedule,
    };
  }, [values]);

  // --- 4. Updates ---
  const updateField = (field: keyof SimulatorValues, value: any) => {
    setValues((prev) => {
      const updates: any = { [field]: value };

      if (field === "selectedVehicle" && value) {
        const car = value as InventoryCarRow;
        const price = car.price || 0;

        updates.vehiclePrice = price;
        updates.downPaymentMode = "percentage";
        updates.downPaymentPercentage = 60;
        updates.customDownPaymentAmount = price * 0.6;

        // ✅ seguro total 3%
        updates.insuranceFee = Math.round(price * 0.03);
      }

      if (field === "downPaymentPercentage") {
        updates.downPaymentMode = "percentage";
        if (value < 60) updates.downPaymentPercentage = 60;
      }

      return { ...prev, ...updates };
    });
  };

  const updateDownPaymentByAmount = (amount: number) => {
    setValues((prev) => {
      const price = prev.vehiclePrice > 0 ? prev.vehiclePrice : 1;
      const newPercentage = (amount / price) * 100;

      return {
        ...prev,
        downPaymentMode: "amount",
        customDownPaymentAmount: amount,
        downPaymentPercentage: newPercentage,
      };
    });
  };

  return {
    values,
    results,
    inventory,
    isLoadingInventory,
    updateField,
    updateDownPaymentByAmount,
    resetDefaults: () => setValues(defaultValues),
  };
}
