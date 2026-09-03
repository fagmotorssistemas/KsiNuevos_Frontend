import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { MarcacionesMesData } from "@/types/marcaciones.types";
import { formatDuracion, sumasColumnasDias } from "@/components/features/accounting/marcaciones/marcaciones-display";

export type MarcacionMesResumenRow = {
    employeeNo: string;
    nombre: string;
    hechas: number;
    legales: number;
    extras: number;
    deMenos: number;
};

export type MarcacionMesResumenPie = {
    hechas: number;
    legales: number;
    extras: number;
    deMenos: number;
};

export function formatMesLabel(mes: string) {
    const [yearStr, monthStr] = mes.split("-");
    const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
    if (Number.isNaN(date.getTime())) return mes;
    const raw = date.toLocaleDateString("es-EC", { month: "long", year: "numeric" });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function buildMarcacionesMesResumen(data: MarcacionesMesData): {
    rows: MarcacionMesResumenRow[];
    pie: MarcacionMesResumenPie;
} {
    const rows = data.empleados.map((emp) => {
        const sumas = sumasColumnasDias(emp.dias);
        return {
            employeeNo: emp.employeeNo,
            nombre: emp.empleado,
            hechas: emp.totales.hechas || sumas.hechas,
            legales: emp.totales.legales || sumas.legales,
            extras: sumas.extras,
            deMenos: sumas.deMenos,
        };
    });

    const pie = rows.reduce(
        (acc, row) => ({
            hechas: acc.hechas + row.hechas,
            legales: acc.legales + row.legales,
            extras: acc.extras + row.extras,
            deMenos: acc.deMenos + row.deMenos,
        }),
        { hechas: 0, legales: 0, extras: 0, deMenos: 0 }
    );

    return { rows, pie };
}

function tableMatrix(rows: MarcacionMesResumenRow[], pie: MarcacionMesResumenPie) {
    const body = rows.map((row) => [
        row.nombre,
        row.employeeNo,
        formatDuracion(row.hechas),
        formatDuracion(row.legales),
        formatDuracion(row.extras),
        formatDuracion(row.deMenos),
    ]);
    const foot = [
        "Totales",
        "",
        formatDuracion(pie.hechas),
        formatDuracion(pie.legales),
        formatDuracion(pie.extras),
        formatDuracion(pie.deMenos),
    ];
    return { body, foot };
}

export function exportMarcacionesMesExcel(
    mes: string,
    rows: MarcacionMesResumenRow[],
    pie: MarcacionMesResumenPie
) {
    const label = formatMesLabel(mes);
    const { body, foot } = tableMatrix(rows, pie);
    const sheetRows = [
        ["Informe de marcaciones"],
        [label],
        [],
        ["Empleado", "Código", "Hechas", "Legales", "Extra", "De menos"],
        ...body,
        foot,
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    worksheet["!cols"] = [
        { wch: 36 },
        { wch: 14 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Informe");
    XLSX.writeFile(workbook, `Informe_marcaciones_${mes}.xlsx`);
}

export function exportMarcacionesMesPdf(
    mes: string,
    rows: MarcacionMesResumenRow[],
    pie: MarcacionMesResumenPie
) {
    const label = formatMesLabel(mes);
    const { body, foot } = tableMatrix(rows, pie);
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    doc.setFontSize(16);
    doc.text("Informe de marcaciones", 14, 16);
    doc.setFontSize(11);
    doc.text(label, 14, 23);
    doc.setFontSize(9);
    doc.text(`Generado: ${new Date().toLocaleString("es-EC")}`, 14, 29);

    autoTable(doc, {
        startY: 34,
        head: [["Empleado", "Código", "Hechas", "Legales", "Extra", "De menos"]],
        body,
        foot: [foot],
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 90 },
            1: { cellWidth: 32 },
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
            5: { halign: "right" },
        },
        showFoot: "lastPage",
    });

    doc.save(`Informe_marcaciones_${mes}.pdf`);
}
