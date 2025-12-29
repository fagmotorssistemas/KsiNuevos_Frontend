import { useState, useEffect } from 'react';
import { Plus, Download, RefreshCw, Printer, Wand2, Trash2 } from 'lucide-react';
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

const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

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

  const handleUpdateRow = async (id: string, updates: Partial<CuotaPB>) => {
     setCuotas(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
     setIsSyncing(true);
     try {
         const { saldo_calculado_momento, ...cleanUpdates } = updates as any;
         const { error } = await supabase.from('cuotaspb').update(cleanUpdates).eq('id', id);
         if (error) throw error;
     } catch(e) { 
         console.error(e); 
         toast.error("Error al guardar cambios");
     } 
     finally { setIsSyncing(false); }
  };

  const handleDeleteRow = async (id: string) => {
      if(!confirm("¿Borrar esta fila?")) return;
      setCuotas(prev => prev.filter(c => c.id !== id));
      await supabase.from('cuotaspb').delete().eq('id', id);
  };

  const handleDeleteAll = async () => {
      if(!confirm("⚠️ ¿ELIMINAR TODA LA TABLA?")) return;
      setIsSyncing(true);
      try {
          await supabase.from('cuotaspb').delete().eq('contrato_id', contrato.id);
          setCuotas([]);
          toast.success("Tabla eliminada");
          onRefresh();
      } catch(e) { toast.error("Error"); } 
      finally { setIsSyncing(false); }
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
          valor_cuota_total: 0,
          estado_pago: 'PENDIENTE'
      };

      const { data } = await supabase.from('cuotaspb').insert([nueva]).select().single();
      if(data) {
          setCuotas(prev => [...prev, data as CuotaPB].sort((a, b) => a.indice_ordenamiento - b.indice_ordenamiento));
      }
      setIsSyncing(false);
  };

  // --- LÓGICA DE GENERACIÓN ---
  const handleGenerateSchedule = async (params: { monto: number; plazo: number; fechaInicio: string; tasa: number; tipo: 'LINEAR' | 'FRANCES' | 'ALEMAN' }) => {
      setIsSyncing(true);
      
      try {
          let montoTotalGenerar = params.monto;

          // CÁLCULO DE CRÉDITO DIRECTO (LINEAR)
          // Sumamos el interés total al capital inicial antes de generar la tabla.
          if (params.tipo === 'LINEAR') {
               const interesTotal = params.monto * (params.tasa / 100) * params.plazo;
               montoTotalGenerar = params.monto + interesTotal;
               
               toast.info(`Generando tabla: Capital $${params.monto} + Interés $${interesTotal.toFixed(2)}`);
          } else {
               toast.info(`Generando tabla ${params.tipo}...`);
          }

          // Actualizamos el saldo inicial del contrato con el valor TOTAL (con intereses si es Linear)
          await supabase.from('contratospb').update({ saldo_inicial_total: montoTotalGenerar }).eq('id', contrato.id);
          
          const cuotasGeneradas = [];
          const startDate = new Date(params.fechaInicio);
          let startIndex = cuotas.length > 0 ? Math.max(...cuotas.map(c => c.indice_ordenamiento)) : 0;
          
          // Variables iniciales
          let saldoRestante = montoTotalGenerar;
          const i_mensual = params.tasa / 100;
          
          // Pre-cálculos
          let capitalFijoLinear = 0;
          let capitalFijoAleman = 0;
          let cuotaFijaFrances = 0;

          if (params.tipo === 'LINEAR') {
              // DIVISIÓN EXACTA DEL TOTAL (Ya incluye interés)
              capitalFijoLinear = round2(montoTotalGenerar / params.plazo);
          } else if (params.tipo === 'ALEMAN') {
              capitalFijoAleman = round2(params.monto / params.plazo);
          } else if (params.tipo === 'FRANCES') {
              if (i_mensual > 0) {
                cuotaFijaFrances = round2(params.monto * ( (i_mensual * Math.pow(1+i_mensual, params.plazo)) / (Math.pow(1+i_mensual, params.plazo) - 1) ));
              } else {
                cuotaFijaFrances = round2(params.monto / params.plazo);
              }
          }

          for (let k = 0; k < params.plazo; k++) {
              const fechaCuota = addMonths(startDate, k);
              const orden = startIndex + 1 + k;
              
              let interesMes = 0;
              let capitalMes = 0; // En modo linear, esto es la cuota completa
              
              if (params.tipo === 'LINEAR') {
                  // --- CRÉDITO DIRECTO ---
                  // En la tabla, NO se muestra interés mensual porque ya está cargado al saldo total.
                  interesMes = 0; 
                  capitalMes = capitalFijoLinear;
                  
                  // Ajuste último mes
                  if (k === params.plazo - 1) {
                      const acumulado = round2(capitalFijoLinear * (params.plazo - 1));
                      capitalMes = round2(montoTotalGenerar - acumulado);
                  }
              } 
              else {
                  // --- MÉTODOS BANCARIOS (Alemán/Francés) ---
                  interesMes = round2(saldoRestante * i_mensual);
                  
                  if (params.tipo === 'ALEMAN') {
                      capitalMes = capitalFijoAleman;
                  } else { // FRANCES
                      capitalMes = round2(cuotaFijaFrances - interesMes);
                  }

                  if (k === params.plazo - 1 || capitalMes > saldoRestante) {
                      capitalMes = saldoRestante;
                  }
                  
                  saldoRestante = round2(saldoRestante - capitalMes);
              }

              const cuotaTotal = round2(capitalMes + interesMes);

              cuotasGeneradas.push({
                  contrato_id: contrato.id,
                  indice_ordenamiento: orden,
                  numero_cuota_texto: `${Math.floor(orden)}`,
                  concepto: `Cuota Mensual ${k + 1}/${params.plazo}`,
                  fecha_vencimiento: fechaCuota.toISOString(),
                  valor_capital: capitalMes,
                  valor_interes: interesMes,
                  valor_cuota_total: cuotaTotal,
                  estado_pago: 'PENDIENTE',
                  saldo_pendiente: cuotaTotal,
                  es_adicional: false
              });
          }

          await supabase.from('cuotaspb').insert(cuotasGeneradas);
          toast.success("Tabla generada exitosamente");
          onRefresh();
      } catch(e) { 
          console.error(e); 
          toast.error("Error al generar");
      }
      finally { setIsSyncing(false); }
  };

  // --- CÁLCULO DE SALDOS ---
  let saldoCapitalAcumulado = contrato.saldo_inicial_total || 0;
  
  const cuotasConSaldo = cuotas.map(cuota => {
      const pagadoTotal = cuota.valor_pagado || 0;
      const costoInteres = cuota.valor_interes || 0;
      const costoMora = cuota.valor_mora_cobrado || 0;
      
      const sobranteParaCapital = pagadoTotal - costoMora - costoInteres;
      const abonoCapitalReal = Math.max(0, sobranteParaCapital);
      
      saldoCapitalAcumulado = round2(saldoCapitalAcumulado - abonoCapitalReal);
      
      return { ...cuota, saldo_calculado_momento: saldoCapitalAcumulado };
  });

  const totalMora = round2(cuotas.reduce((sum, c) => sum + (c.valor_mora_cobrado || 0), 0));
  const totalPagado = round2(cuotas.reduce((sum, c) => sum + (c.valor_pagado || 0), 0));
  const totalCapital = round2(cuotas.reduce((sum, c) => sum + (c.valor_capital || 0), 0));
  const totalInteres = round2(cuotas.reduce((sum, c) => sum + (c.valor_interes || 0), 0));
  const totalCuotaEsperada = round2(cuotas.reduce((sum, c) => sum + (c.valor_cuota_total || 0), 0));
  const saldoFinal = round2(saldoCapitalAcumulado);

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
                <Button size="sm" variant="ghost" onClick={handleDeleteAll} className="text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 size={16} /></Button>
                <Button size="sm" variant="ghost" onClick={() => exportToPDF(cliente, contrato, cuotasConSaldo)}><Printer size={16} /></Button>
            </div>
        </div>

        <div className="overflow-auto border border-gray-200 rounded-lg shadow-sm bg-white max-h-[70vh] relative">
            <table className="w-full min-w-[1300px] border-collapse relative">
                <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold tracking-wider sticky top-0 z-20 shadow-sm">
                    <tr>
                        <th className="p-2 border-b text-center w-8 bg-gray-100">#</th>
                        <th className="p-2 border-b text-left min-w-[120px] bg-gray-100">Concepto</th>
                        <th className="p-2 border-b text-left w-[100px] bg-gray-100">F. Vence</th>
                        <th className="p-2 border-b text-right w-24 bg-gray-100 text-gray-500">Capital</th>
                        <th className="p-2 border-b text-right w-20 bg-gray-100 text-gray-500">Int.</th>
                        
                        {/* COLUMNA CUOTA TOTAL */}
                        <th className="p-2 border-b text-right w-24 bg-blue-50 text-blue-800 border-l border-blue-100">Cuota</th>
                        
                        <th className="p-2 border-b text-center w-10 bg-gray-100">Días</th>
                        <th className="p-2 border-b text-right w-20 text-red-600 bg-gray-100">Mora</th>
                        <th className="p-2 border-b text-right bg-green-50 text-green-800 w-24">Pagado</th>
                        <th className="p-2 border-b text-right w-24 text-gray-500 bg-gray-100">Saldo C.</th>
                        <th className="p-2 border-b text-left w-[100px] bg-gray-100">F. Pago</th>
                        <th className="p-2 border-b text-left min-w-[150px] bg-gray-100">Observación</th>
                        <th className="p-2 border-b text-center w-24 bg-gray-100">Acción</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    <tr className="bg-blue-50/20 text-xs">
                        <td colSpan={3} className="p-2 text-right font-bold text-gray-500">SALDO INICIAL:</td>
                        <td className="p-2 text-right font-bold text-gray-500">-</td>
                        <td className="p-2 text-right">-</td>
                        <td className="p-2 text-right">-</td>
                        <td colSpan={3}></td>
                        <td className="p-2 text-right font-bold text-blue-800">
                            ${(contrato.saldo_inicial_total || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                        </td>
                        <td colSpan={3}></td>
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
                </tbody>
                
                <tfoot className="sticky bottom-0 z-20 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t-2 border-blue-100">
                    <tr className="font-bold text-xs">
                        <td colSpan={3} className="p-3 text-right text-gray-500 uppercase bg-gray-50">Totales:</td>
                        <td className="p-3 text-right text-gray-500 bg-gray-50">${totalCapital.toFixed(2)}</td>
                        <td className="p-3 text-right text-gray-500 bg-gray-50">${totalInteres.toFixed(2)}</td>
                        <td className="p-3 text-right text-blue-800 bg-blue-50">${totalCuotaEsperada.toFixed(2)}</td>
                        <td className="p-3 bg-gray-50"></td>
                        <td className="p-3 text-right text-red-600 bg-gray-50">${totalMora.toFixed(2)}</td>
                        <td className="p-3 text-right text-green-700 bg-green-50">${totalPagado.toFixed(2)}</td>
                        <td className="p-3 text-right text-blue-800 bg-blue-50">${saldoFinal.toFixed(2)}</td>
                        <td colSpan={3} className="bg-gray-50"></td>
                    </tr>
                </tfoot>
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