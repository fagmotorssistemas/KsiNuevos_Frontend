import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "next/navigation";
import { SimulatorValues, InventoryCarRow, BankID } from "@/types/bank.types"; 
import { DEFAULT_SIMULATOR_VALUES, BANK_OPTIONS } from "@/components/features/creditCar/BankCredit/constants";
// Asegúrate de que esta ruta apunte a donde tienes la función calculateCredit corregida
import { calculateCredit } from "@/components/features/creditCar/BankCredit/utils"; 

export function useCreditSimulator() {
  const { supabase } = useAuth();
  const searchParams = useSearchParams();

  // Estados
  const [inventory, setInventory] = useState<InventoryCarRow[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [values, setValues] = useState<SimulatorValues>(DEFAULT_SIMULATOR_VALUES);

  // 1. Cargar Inventario
  const fetchInventory = useCallback(async () => {
    setIsLoadingInventory(true);
    const { data } = await supabase
      .from("inventory")
      .select("*")
      .eq("status", "disponible")
      .order("brand", { ascending: true });
    setInventory(data || []);
    setIsLoadingInventory(false);
    return data || [];
  }, [supabase]);

  // 2. Inicializar (URL Params)
  useEffect(() => {
    const init = async () => {
      const loaded = await fetchInventory();
      const vehicleSearch = searchParams.get("vehicleSearch");
      
      if (vehicleSearch && loaded.length > 0) {
        const found = loaded.find((car) => 
          `${car.brand} ${car.model}`.toLowerCase().includes(vehicleSearch.toLowerCase())
        );
        if (found) {
          setValues(prev => ({
            ...prev,
            selectedVehicle: found,
            vehiclePrice: found.price,
            customDownPaymentAmount: found.price * 0.25
          }));
        }
      }
    };
    init();
  }, [fetchInventory, searchParams]);

  // 3. Resultado (CÁLCULO DIRECTO)
  // 🔥 CORRECCIÓN: Quitamos useMemo. 
  // Al ejecutarlo directamente en el cuerpo del componente, garantizamos 
  // que si 'values' cambia (ej: cambias de banco), el resultado se actualice SÍ o SÍ.
  const results = calculateCredit(values);

  // 4. Actualizadores
  const updateField = (field: keyof SimulatorValues, value: any) => {
    setValues((prev) => {
      // Usamos Partial para manipular el objeto de forma segura
      const updates: Partial<SimulatorValues> = { [field]: value };
      
      // Lógica específica al cambiar vehículo
      if (field === "selectedVehicle" && value) {
        const car = value as InventoryCarRow;
        updates.vehiclePrice = car.price;
        // Recalcular entrada basada en el porcentaje actual
        updates.customDownPaymentAmount = car.price * (prev.downPaymentPercentage / 100);
      }
      
      // Lógica al cambiar porcentaje de entrada
      if (field === "downPaymentPercentage") {
         updates.downPaymentMode = "percentage";
         updates.customDownPaymentAmount = prev.vehiclePrice * (Number(value) / 100);
      }

      // Devolvemos el estado combinado
      return { ...prev, ...updates } as SimulatorValues;
    });
  };

  const updateDownPaymentByAmount = (amount: number) => {
    setValues((prev) => ({
      ...prev,
      downPaymentMode: "amount",
      customDownPaymentAmount: Math.max(0, Math.min(amount, prev.vehiclePrice)),
      // Evitamos división por cero si el precio es 0
      downPaymentPercentage: prev.vehiclePrice > 0 ? (amount / prev.vehiclePrice) * 100 : 0
    }));
  };

  return {
    inventory,
    isLoadingInventory,
    values,
    results,
    bankOptions: Object.values(BANK_OPTIONS), // Array para los botones
    updateField,
    updateDownPaymentByAmount
  };
}