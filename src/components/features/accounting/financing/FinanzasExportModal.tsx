import { useState } from "react";
import { 
    Download, 
    FileSpreadsheet, 
    FileText, 
    X, 
    CalendarRange, 
    Loader2 
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { MovimientoFinanciero } from "@/types/finanzas.types";
import { MovementType } from "./FinanzasFilters";

interface FinanzasExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    allData: MovimientoFinanciero[];
}

export function FinanzasExportModal({ isOpen, onClose, allData }: FinanzasExportModalProps) {
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [type, setType] = useState<MovementType>('ALL');
    const [isExporting, setIsExporting] = useState(false);

    if (!isOpen) return null;

    // --- Lógica de Filtrado para el Reporte ---
    const getFilteredDataForReport = () => {
        let filtered = [...allData];

        // 1. Filtro por Tipo
        if (type !== 'ALL') {
            filtered = filtered.filter(m => m.tipoMovimiento === type);
        }

        // 2. Filtro por Fechas (Si están seleccionadas)
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            filtered = filtered.filter(m => {
                const mDate = new Date(m.fecha);
                return mDate >= start && mDate <= end;
            });
        }

        return filtered;
    };

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    // --- Exportar a Excel ---
    const handleExportExcel = () => {
        setIsExporting(true);
        try {
            const dataToExport = getFilteredDataForReport();
            
            // Transformar datos para Excel
            const rows = dataToExport.map(m => ({
                Fecha: new Date(m.fecha).toLocaleDateString(),
                Documento: m.documento,
                Tipo: m.tipoMovimiento,
                Concepto: m.concepto,
                Beneficiario: m.beneficiario,
                Ingreso: m.tipoMovimiento === 'INGRESO' ? m.monto : 0,
                Egreso: m.tipoMovimiento === 'EGRESO' ? m.monto : 0,
            }));

            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Financiero");
            
            // Ajustar ancho de columnas
            const wscols = [{wch:12}, {wch:15}, {wch:10}, {wch:40}, {wch:25}, {wch:12}, {wch:12}];
            worksheet['!cols'] = wscols;

            XLSX.writeFile(workbook, `Reporte_Financiero_${new Date().toISOString().slice(0,10)}.xlsx`);
            onClose();
        } catch (error) {
            console.error("Error exportando Excel", error);
            alert("Error al generar el Excel");
        } finally {
            setIsExporting(false);
        }
    };

    // --- Exportar a PDF ---
    const handleExportPDF = () => {
        setIsExporting(true);
        try {
            const dataToExport = getFilteredDataForReport();
            const doc = new jsPDF();

            // Totales para el reporte
            const totalIngresos = dataToExport.filter(m => m.tipoMovimiento === 'INGRESO').reduce((a, b) => a + b.monto, 0);
            const totalEgresos = dataToExport.filter(m => m.tipoMovimiento === 'EGRESO').reduce((a, b) => a + b.monto, 0);
            const balance = totalIngresos - totalEgresos;

            // Encabezado
            doc.setFontSize(18);
            doc.text("Reporte de Movimientos Financieros", 14, 20);
            
            doc.setFontSize(10);
            doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 28);
            doc.text(`Periodo: ${startDate ? startDate : 'Inicio'} - ${endDate ? endDate : 'Actualidad'}`, 14, 34);
            doc.text(`Tipo: ${type === 'ALL' ? 'Todos los movimientos' : type}`, 14, 40);

            // Resumen
            doc.setDrawColor(200);
            doc.line(14, 45, 196, 45);
            doc.setFontSize(11);
            doc.text(`Ingresos: ${formatMoney(totalIngresos)}`, 14, 52);
            doc.text(`Egresos: ${formatMoney(totalEgresos)}`, 80, 52);
            doc.text(`Balance: ${formatMoney(balance)}`, 140, 52);

            // Tabla
            const tableBody = dataToExport.map(m => [
                new Date(m.fecha).toLocaleDateString(),
                m.documento,
                m.tipoMovimiento.substring(0, 3), // ING / EGR
                m.concepto.length > 30 ? m.concepto.substring(0, 30) + '...' : m.concepto,
                m.tipoMovimiento === 'INGRESO' ? formatMoney(m.monto) : '-',
                m.tipoMovimiento === 'EGRESO' ? formatMoney(m.monto) : '-',
            ]);

            autoTable(doc, {
                startY: 60,
                head: [['Fecha', 'Doc', 'Tipo', 'Concepto', 'Ingreso', 'Egreso']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] },
                styles: { fontSize: 8 },
            });

            doc.save(`Reporte_Financiero_${new Date().toISOString().slice(0,10)}.pdf`);
            onClose();
        } catch (error) {
            console.error("Error exportando PDF", error);
            alert("Error al generar el PDF");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Download className="h-5 w-5 text-blue-600" />
                        Exportar Reporte
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    
                    {/* Selector de Fechas */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <CalendarRange className="h-4 w-4" />
                            Rango de Fechas
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Desde</label>
                                <input 
                                    type="date" 
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
                                <input 
                                    type="date" 
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Selector de Tipo */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700">Tipo de Movimientos</label>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            {(['ALL', 'INGRESO', 'EGRESO'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setType(t)}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                                        type === t 
                                            ? 'bg-white text-blue-700 shadow-sm' 
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {t === 'ALL' ? 'Todos' : t === 'INGRESO' ? 'Ingresos' : 'Egresos'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <p className="text-xs text-blue-700">
                            Se exportarán {getFilteredDataForReport().length} registros basados en esta selección.
                        </p>
                    </div>

                    {/* Botones de Acción */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg hover:bg-rose-100 transition-colors font-medium text-sm disabled:opacity-50"
                        >
                            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                            Descargar PDF
                        </button>
                        <button
                            onClick={handleExportExcel}
                            disabled={isExporting}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium text-sm disabled:opacity-50"
                        >
                            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                            Descargar Excel
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}