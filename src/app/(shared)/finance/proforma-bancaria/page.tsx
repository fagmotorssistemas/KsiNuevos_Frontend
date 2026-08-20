"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Landmark, Loader2, Printer, RefreshCcw, User } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { InventorySearch } from "@/components/features/financing/InventorySearch";
import { InputGroup, type InventoryCarRow } from "@/components/features/financing/FinancingUtils";
import {
  BankProformaDocument,
  advisorFromProfile,
  type BankProformaClient,
} from "@/components/features/financing/BankProformaDocument";

function todayLabel() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

const EMPTY_CLIENT: BankProformaClient = {
  name: "",
  idNumber: "",
  phone: "",
  address: "",
};

export default function BankProformaPage() {
  const supabase = useMemo(() => createClient(), []);
  const { profile } = useAuth();
  const advisor = useMemo(() => advisorFromProfile(profile), [profile]);

  const [inventory, setInventory] = useState<InventoryCarRow[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [client, setClient] = useState<BankProformaClient>(EMPTY_CLIENT);
  const [selectedVehicle, setSelectedVehicle] = useState<InventoryCarRow | null>(null);
  const [price, setPrice] = useState(0);
  const [addressedTo, setAddressedTo] = useState("");
  const [optionalNote, setOptionalNote] = useState("");

  const fetchInventory = useCallback(async () => {
    setIsLoadingInventory(true);
    const { data, error } = await supabase
      .from("inventoryoracle")
      .select("*")
      .eq("status", "disponible")
      .order("brand", { ascending: true });

    if (error) {
      console.error("Error cargando inventario:", error);
      toast.error("No se pudo cargar el inventario disponible");
      setInventory([]);
    } else {
      setInventory((data as InventoryCarRow[]) || []);
    }
    setIsLoadingInventory(false);
  }, [supabase]);

  useEffect(() => {
    void fetchInventory();
  }, [fetchInventory]);

  const handleSelectVehicle = (car: InventoryCarRow) => {
    setSelectedVehicle(car);
    setPrice(Number(car.price) || 0);
  };

  const handleClearVehicle = () => {
    setSelectedVehicle(null);
    setPrice(0);
  };

  const handlePrint = () => {
    if (!selectedVehicle) {
      toast.error("Seleccione un vehículo del inventario disponible");
      return;
    }
    if (!client.name.trim()) {
      toast.error("Ingrese el nombre del cliente");
      return;
    }
    window.print();
  };

  const updateClient = (field: keyof BankProformaClient, value: string) => {
    setClient((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-full print:min-h-0 print:bg-white">
      <div className="space-y-6 print:hidden mb-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Landmark className="h-6 w-6 text-neutral-700" />
              Proforma bancaria
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Cotización para bancos con foto principal del inventario y firma del asesor en sesión
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void fetchInventory()}
              className="inline-flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg font-medium shadow-sm"
            >
              <RefreshCcw className={`w-4 h-4 ${isLoadingInventory ? "animate-spin" : ""}`} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-white bg-neutral-800 hover:bg-neutral-900 rounded-lg font-medium shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 print:block">
        <div className="xl:col-span-4 space-y-4 print:hidden">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <InventorySearch
              inventory={inventory}
              isLoading={isLoadingInventory}
              selectedVehicle={selectedVehicle}
              onSelect={handleSelectVehicle}
              onClear={handleClearVehicle}
            />
            {isLoadingInventory && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Cargando vehículos disponibles...
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-3">
              <User className="w-5 h-5 text-neutral-500" />
              Datos del cliente
            </div>
            <InputGroup label="Dirigido a">
              <input
                type="text"
                value={addressedTo}
                onChange={(e) => setAddressedTo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-500/20 text-sm"
                placeholder="Ej: Atención. Banco del Pichincha."
              />
            </InputGroup>
            <InputGroup label="Texto adicional">
              <textarea
                value={optionalNote}
                onChange={(e) => setOptionalNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-500/20 text-sm resize-y min-h-[72px]"
                placeholder="Texto debajo del título. Dejar vacío si no aplica."
              />
            </InputGroup>
            <InputGroup label="Nombre">
              <input
                type="text"
                value={client.name}
                onChange={(e) => updateClient("name", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-500/20 text-sm"
                placeholder="Nombre completo"
              />
            </InputGroup>
            <InputGroup label="Cédula">
              <input
                type="text"
                value={client.idNumber}
                onChange={(e) => updateClient("idNumber", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-500/20 text-sm"
                placeholder="0100000000"
              />
            </InputGroup>
            <InputGroup label="Teléfono">
              <input
                type="text"
                value={client.phone}
                onChange={(e) => updateClient("phone", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-500/20 text-sm"
                placeholder="099 000 0000"
              />
            </InputGroup>
            <InputGroup label="Dirección">
              <input
                type="text"
                value={client.address}
                onChange={(e) => updateClient("address", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-500/20 text-sm"
                placeholder="Ciudad o dirección"
              />
            </InputGroup>
            <InputGroup label="Precio">
              <input
                type="number"
                min={0}
                value={price || ""}
                onChange={(e) => setPrice(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-500/20 text-sm"
                placeholder="0"
              />
            </InputGroup>
          </div>

          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-sm text-neutral-600">
            <p className="font-semibold text-neutral-800 mb-1">Firma de la proforma</p>
            <p className="uppercase font-bold text-neutral-900">{advisor.name}</p>
            <p>{advisor.title}</p>
            <p>{advisor.phone || "Sin teléfono en el perfil"}</p>
            <p className="text-xs text-neutral-500 mt-2">Se toma de tu sesión (nombre, rol y teléfono del perfil).</p>
          </div>
        </div>

        <div className="xl:col-span-8 print:col-span-12">
          <div className="overflow-x-auto print:overflow-visible">
            <div className="w-[210mm] mx-auto shadow-xl print:shadow-none print:mx-0">
              <BankProformaDocument
                dateLabel={todayLabel()}
                client={client}
                vehicle={selectedVehicle}
                price={price}
                photoUrl={selectedVehicle?.img_main_url || null}
                advisor={advisor}
                addressedTo={addressedTo}
                optionalNote={optionalNote}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html,
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .bank-proforma-sheet {
            width: 210mm;
            min-height: 297mm;
          }
        }
      `}</style>
    </div>
  );
}
