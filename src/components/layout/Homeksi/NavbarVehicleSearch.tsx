"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { InventorySearch } from "@/components/features/financing/InventorySearch";
import type { InventoryCarRow } from "@/components/features/financing/FinancingUtils";
import { getVehicleBrandPath, getVehiclePublicPath } from "@/lib/inventario/vehicle-public-slug";

export function NavbarVehicleSearch({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { supabase } = useAuth();
  const [inventory, setInventory] = useState<InventoryCarRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCar, setSelectedCar] = useState<InventoryCarRow | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("inventoryoracle")
        .select("*")
        .eq("status", "disponible")
        .order("brand", { ascending: true });

      if (cancelled) return;
      if (error) {
        console.error("Error cargando inventario para búsqueda:", error);
        setInventory([]);
      } else {
        setInventory((data || []) as InventoryCarRow[]);
      }
      setIsLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleBrowseBrand = useCallback(
    (brand: string) => {
      setSelectedCar(null);
      router.push(getVehicleBrandPath(brand));
    },
    [router]
  );

  const handleSelect = useCallback(
    (car: InventoryCarRow) => {
      setSelectedCar(car);
      if (car?.id) {
        router.push(getVehiclePublicPath(car));
      }
    },
    [router]
  );

  return (
    <div className={className}>
      <InventorySearch
        inventory={inventory}
        selectedVehicle={selectedCar}
        onSelect={handleSelect}
        onBrowseBrand={handleBrowseBrand}
        onClear={() => setSelectedCar(null)}
        isLoading={isLoading}
        compact
      />
    </div>
  );
}
