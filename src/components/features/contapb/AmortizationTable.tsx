import { useState, useEffect } from 'react';
import { Plus, Download, RefreshCw, Printer, Wand2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { CuotaPB, ContratoCompleto, ClientePB } from '@/hooks/contapb/types';
import { AmortizationRow } from './AmortizationRow';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { exportToExcel, exportToPDF } from "@/lib/contapb/exportUtils";
import { GenerateAmortizationModal } from './GenerateAmortizationModal';
import { addMonths } from 'date-fns';

interface AmortizationTableProps {
  contrato: ContratoCompleto;
  cliente: ClientePB;
  onRefresh: () => void;
}

export function AmortizationTable({ contrato, cliente, onRefresh }: AmortizationTableProps) {
  const { supabase } = useAuth();
  const [cuotas, setCuotas] = useState<CuotaPB[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  useEffect(() => {
    if (contrato?.cuotas) {
      setCuotas([...contrato.cuotas].sort((a, b) => a.indice_ordenamiento - b.indice_ordenamiento));
    } else {
      setCuotas([]);
    }
  }, [contrato]);

  // Actualizar Fila
  const handleUpdateRow = async (id: string, updates: Partial<CuotaPB>) => {
     // 1. Update Optimista en UI (Aquí sí dejamos los campos calculados para que no parpadee)
     setCuotas(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
     setIsSyncing(true);

     try {
         // 2. LIMPIEZA DE DATOS: Eliminamos campos que no existen en la BD
         // Usamos 'as any' para poder desestructurar propiedades que Typescript no conoce en CuotaPB
         const { 
             saldo_calculado_momento, 
             saldo_calculado_reporte,
             ...cleanUpdates 
         } = updates as any;

         // 3. Enviamos solo los datos limpios a Supabase
         const { error } = await supabase.from('cuotaspb').update(cleanUpdates).eq('id', id);
         
         if (error) throw error;
     } catch(e) { 
         console.error(e); 
         toast.error("Error al guardar cambios");
         // Opcional: Revertir cambios aquí si falla
     } 
     finally { setIsSyncing(false); }
  };

  // Resto de handlers (Delete, Add) igual que antes...
  const handleDeleteRow = async (id: string) => {
      if(!confirm("¿Borrar esta fila?")) return;
      setCuotas(prev => prev.filter(c => c.id !== id));
      await supabase.from('cuotaspb').delete().eq('id', id);
  };

  const handleAddRow = async (afterOrder?: number) => {
      setIsSyncing(true);
      let newOrder = 0;
      if (afterOrder === undefined) {
          const maxIndex = cuotas.length > 0 ? Math.max(...cuotas.map(c => c.indice_ordenamiento)) : 0;
          newOrder = Math.floor(maxIndex) + 1;
      } else {
          const nextRow = cuotas.find(c => c.indice_ordenamiento > afterOrder);
          newOrder = nextRow ? (afterOrder + nextRow.indice_ordenamiento) / 2 : Math.floor(afterOrder) + 1;
      }

      const nueva = {
          contrato_id: contrato.id,
          indice_ordenamiento: newOrder,
          numero_cuota_texto: Number.isInteger(newOrder) ? `${newOrder}` : 'Adic.',
          concepto: Number.isInteger(newOrder) ? 'Cuota Mensual' : 'Abono Extra',
          es_adicional: !Number.isInteger(newOrder),
          fecha_vencimiento: new Date().toISOString(),
          valor_capital: 0,
          valor_interes: 0,
          estado_pago: 'PENDIENTE'
      };

      const { data } = await supabase.from('cuotaspb').insert([nueva]).select().single();
      if(data) {
          setCuotas(prev => [...prev, data as CuotaPB].sort((a, b) => a.indice_ordenamiento - b.indice_ordenamiento));
          toast.success("Fila insertada");
      }
      setIsSyncing(false);
  };

  const handleGenerateSchedule = async (params: { monto: number; plazo: number; fechaInicio: string; interes: number }) => {
      setIsSyncing(true);
      toast.info("Generando tabla y actualizando saldo...");

      try {
          // Actualizar Saldo Inicial del Contrato
          await supabase.from('contratospb').update({ saldo_inicial_total: params.monto }).eq('id', contrato.id);
          
          const cuotasGeneradas = [];
          const capitalMensual = params.monto / params.plazo;
          const interesMensual = params.interes / params.plazo;
          const startDate = new Date(params.fechaInicio);
          let startIndex = cuotas.length > 0 ? Math.max(...cuotas.map(c => c.indice_ordenamiento)) : 0;

          for (let i = 0; i < params.plazo; i++) {
              const fechaCuota = addMonths(startDate, i);
              const orden = startIndex + 1 + i;
              cuotasGeneradas.push({
                  contrato_id: contrato.id,
                  indice_ordenamiento: orden,
                  numero_cuota_texto: `${Math.floor(orden)}`,
                  concepto: `Cuota Mensual ${i + 1}/${params.plazo}`,
                  fecha_vencimiento: fechaCuota.toISOString(),
                  valor_capital: capitalMensual,
                  valor_interes: interesMensual,
                  valor_cuota_total: capitalMensual + interesMensual,
                  estado_pago: 'PENDIENTE',
                  saldo_pendiente: capitalMensual + interesMensual,
                  es_adicional: false
              });
          }
          await supabase.from('cuotaspb').insert(cuotasGeneradas);
          toast.success(`${params.plazo} cuotas generadas`);
          onRefresh();
      } catch(e) { 
          console.error(e); 
          toast.error("Error al generar");
      }
      finally { setIsSyncing(false); }
  };

  // CÁLCULO DE SALDOS PARA DISPLAY Y EXPORTACIÓN
  let saldoAcumulado = contrato.saldo_inicial_total || 0;
  
  const cuotasConSaldo = cuotas.map(cuota => {
      const interes = cuota.valor_interes || 0;
      const mora = cuota.valor_mora_cobrado || 0;
      const pagado = cuota.valor_pagado || 0;
      saldoAcumulado = saldoAcumulado + interes + mora - pagado;
      return { ...cuota, saldo_calculado_momento: saldoAcumulado };
  });

  const totalMora = cuotas.reduce((sum, c) => sum + (c.valor_mora_cobrado || 0), 0);
  const totalPagado = cuotas.reduce((sum, c) => sum + (c.valor_pagado || 0), 0);

  return (
    <div className="flex flex-col gap-4">
        
        <div className="flex flex-wrap justify-between items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
            <div className="flex gap-2">
                <Button size="sm" onClick={() => setIsGeneratorOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm">
                    <Wand2 size={16} /> Generar Auto
                </Button>
                <div className="h-8 w-px bg-gray-300 mx-1"></div>
                <Button size="sm" variant="outline" onClick={() => handleAddRow()} className="bg-white hover:bg-slate-50 text-slate-700">
                    <Plus size={16} className="mr-1" /> Fila Final
                </Button>
            </div>

            <div className="flex gap-2 items-center">
                {isSyncing && <span className="text-xs text-gray-400 animate-pulse flex items-center gap-1 mr-2"><RefreshCw size={12} className="animate-spin"/> Guardando...</span>}
                <Button size="sm" variant="ghost" onClick={() => exportToPDF(cliente, contrato, cuotasConSaldo)}><Printer size={16} /></Button>
                {/* Pasamos cuotasConSaldo a Excel para que lleve los cálculos nuevos */}
                <Button size="sm" variant="ghost" onClick={() => exportToExcel(cliente, contrato, cuotasConSaldo)}><Download size={16} /></Button>
            </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white pb-10">
            <table className="w-full min-w-[1300px] border-collapse">
                <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="p-2 border-b text-center w-8">#</th>
                        <th className="p-2 border-b text-left min-w-[120px]">Concepto</th>
                        <th className="p-2 border-b text-left w-[100px]">F. Vence</th>
                        <th className="p-2 border-b text-right w-24 text-blue-800 bg-blue-50/30">Capital</th>
                        <th className="p-2 border-b text-right w-16">Int.</th>
                        <th className="p-2 border-b text-center w-10">Días</th>
                        <th className="p-2 border-b text-right w-20 text-red-600">Mora</th>
                        <th className="p-2 border-b text-right bg-green-50 text-green-800 w-24">Pagado</th>
                        <th className="p-2 border-b text-right w-20 text-gray-500">Saldo C.</th>
                        <th className="p-2 border-b text-left w-[100px]">F. Pago</th>
                        <th className="p-2 border-b text-left min-w-[150px]">Observación</th>
                        <th className="p-2 border-b text-center w-24">Acción</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    <tr className="bg-blue-50/20 text-xs">
                        <td colSpan={3} className="p-2 text-right font-bold text-gray-500">SALDO INICIAL:</td>
                        <td className="p-2 text-right font-bold text-blue-800">
                            ${(contrato.saldo_inicial_total || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                        </td>
                        <td colSpan={8}></td>
                    </tr>

                    {cuotasConSaldo.map((cuota) => (
                        <AmortizationRow 
                            key={cuota.id} 
                            cuota={cuota} 
                            tasaMoraDiaria={contrato.tasa_mora_diaria || 0}
                            saldoRestanteReal={cuota.saldo_calculado_momento}
                            onUpdate={handleUpdateRow} 
                            onDelete={handleDeleteRow}
                            onInsertAfter={handleAddRow}
                        />
                    ))}
                    
                    <tr className="bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                        <td colSpan={6} className="p-3 text-right text-gray-500 uppercase">Totales Generales:</td>
                        <td className="p-3 text-right text-red-600">${totalMora.toFixed(2)}</td>
                        <td className="p-3 text-right text-green-700">${totalPagado.toFixed(2)}</td>
                        <td className="p-3 text-right text-blue-800">${saldoAcumulado.toFixed(2)}</td>
                        <td colSpan={4}></td>
                    </tr>
                </tbody>
            </table>
        </div>

        {isGeneratorOpen && (
            <GenerateAmortizationModal 
                onClose={() => setIsGeneratorOpen(false)}
                onGenerate={handleGenerateSchedule}
            />
        )}
    </div>
  );
}