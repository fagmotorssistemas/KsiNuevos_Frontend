import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ClientePB, ContratoCompleto, CuotaPB } from '@/hooks/contapb/types';

// Helper para calcular saldos al vuelo para el reporte
const processDataWithBalance = (contrato: ContratoCompleto, cuotas: CuotaPB[]) => {
    let saldoAcumulado = contrato.saldo_inicial_total || 0;
    
    return cuotas.map(c => {
        const interes = c.valor_interes || 0;
        const mora = c.valor_mora_cobrado || 0;
        const pagado = c.valor_pagado || 0;
        
        // Misma lógica visual de la tabla
        saldoAcumulado = saldoAcumulado + interes + mora - pagado;
        
        return { ...c, saldo_calculado_reporte: saldoAcumulado };
    });
};

// --- EXPORTAR INDIVIDUAL ---
export const exportToExcel = (cliente: ClientePB, contrato: ContratoCompleto, cuotas: CuotaPB[]) => {
  
  const processedCuotas = processDataWithBalance(contrato, cuotas);

  const tableData = processedCuotas.map(c => ({
    'N°': c.numero_cuota_texto || c.indice_ordenamiento,
    'Concepto': c.concepto,
    'F. Vencimiento': c.fecha_vencimiento ? format(new Date(c.fecha_vencimiento), 'yyyy-MM-dd') : '',
    'Saldo Capital (Deuda)': c.saldo_calculado_reporte, // Columna Nueva
    'Interés': c.valor_interes,
    'Días Mora': c.dias_mora_calculados,
    'Mora ($)': c.valor_mora_cobrado,
    'Pagado': c.valor_pagado,
    'Saldo Cuota': c.saldo_pendiente,
    'Estado': c.estado_pago,
    'F. Pago': c.fecha_pago_realizado ? format(new Date(c.fecha_pago_realizado), 'yyyy-MM-dd') : '',
    'Observaciones': c.observaciones || '' // Columna Nueva
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([]); 

  // Encabezados
  XLSX.utils.sheet_add_aoa(ws, [
    ["REPORTE DE AMORTIZACIÓN DETALLADO"],
    ["Fecha:", format(new Date(), 'yyyy-MM-dd HH:mm')],
    [],
    ["CLIENTE:", cliente.nombre_completo],
    ["ID:", cliente.identificacion || 'S/N'],
    ["CONTRATO:", contrato.numero_contrato || 'S/N'],
    ["VEHÍCULO:", contrato.alias_vehiculo],
    ["PLACA:", contrato.placa || 'S/N'],
    ["SALDO INICIAL:", contrato.saldo_inicial_total],
    [] 
  ], { origin: "A1" });

  XLSX.utils.sheet_add_json(ws, tableData, { origin: "A11", skipHeader: false });

  XLSX.utils.book_append_sheet(wb, ws, "Tabla Amortización");
  const fileName = `Cartera_${cliente.nombre_completo.substring(0, 10)}_${contrato.numero_contrato}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// --- EXPORTAR PDF ---
export const exportToPDF = (cliente: ClientePB, contrato: ContratoCompleto, cuotas: CuotaPB[]) => {
  const doc = new jsPDF('l', 'mm', 'a4'); // Horizontal (Landscape) para que quepan más columnas
  const processedCuotas = processDataWithBalance(contrato, cuotas);

  doc.setFontSize(14);
  doc.text("Tabla de Amortización", 14, 15);
  doc.setFontSize(9);
  doc.text(`Cliente: ${cliente.nombre_completo} - ${contrato.alias_vehiculo}`, 14, 22);
  
  const tableRows = processedCuotas.map(c => [
      c.numero_cuota_texto,
      c.concepto,
      c.fecha_vencimiento ? format(new Date(c.fecha_vencimiento), 'dd/MM/yy') : '-',
      `$${c.saldo_calculado_reporte.toFixed(2)}`, // Saldo Deuda
      `$${c.valor_interes.toFixed(2)}`,
      c.dias_mora_calculados > 0 ? c.dias_mora_calculados : '-',
      `$${c.valor_mora_cobrado.toFixed(2)}`,
      `$${c.valor_pagado.toFixed(2)}`,
      `$${c.saldo_pendiente.toFixed(2)}`, // Saldo Cuota
      c.observaciones || ''
  ]);

  autoTable(doc, {
    startY: 28,
    head: [["#", "Concepto", "Vence", "Deuda Total", "Int.", "Días", "Mora", "Pagado", "Saldo C.", "Obs."]],
    body: tableRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] }
  });
  doc.save(`Reporte_${cliente.nombre_completo}.pdf`);
};

// --- EXPORTAR GLOBAL ---
export const exportGlobalCartera = (data: any[]) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cartera Total");
    XLSX.writeFile(wb, `Cartera_Global_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};