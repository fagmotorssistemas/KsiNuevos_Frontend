"use client";

import React, { useState, Suspense, useRef } from "react";
import { Calculator, RefreshCcw, Printer, Loader2 } from "lucide-react";
import { useCreditSimulator } from "@/hooks/useCreditSimulator";
import { CreditForm } from "@/components/features/financing/CreditForm";
import { CreditProforma } from "@/components/features/financing/CreditProforma";
import { createClient } from '@/lib/supabase/client';

// IMPORTACIONES NUEVAS PARA EL PDF
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

function CreditSimulatorContent() {
    const supabase = createClient();
    
    const {
        values,
        results,
        inventory,
        isLoadingInventory,
        isSaving: isHookSaving,
        updateField,
        updateDownPaymentByAmount,
        resetDefaults,
        saveProforma 
    } = useCreditSimulator();

    const [includeTableInPdf, setIncludeTableInPdf] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    
    const proformaRef = useRef(null);

    const handlePrintAndSave = async () => {
        if (!values.clientName) {
            alert("Por favor ingrese el nombre del cliente antes de generar la proforma.");
            return;
        }

        setIsGeneratingPdf(true);

        try {
            // --- NUEVA LÓGICA DE GENERACIÓN DE PDF (Soporta oklch/Tailwind) ---
            if (proformaRef.current === null) {
                return;
            }

            // 1. Convertir el HTML a una imagen PNG de alta calidad
            // 'cacheBust' ayuda a que carguen las imágenes externas si las hubiera
            // 'backgroundColor' asegura que el fondo sea blanco y no transparente
            const dataUrl = await toPng(proformaRef.current, { 
                cacheBust: true, 
                backgroundColor: '#ffffff',
                quality: 0.95,
                pixelRatio: 2 // Mejora la resolución
            });

            // 2. Crear un PDF con jsPDF
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // 3. Calcular dimensiones para que ajuste en A4 (210mm ancho)
            const imgProperties = pdf.getImageProperties(dataUrl);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            // Calculamos la altura proporcional
            const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;

            // 4. Agregar la imagen al PDF
            // (imagen, formato, x, y, ancho, alto)
            pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);

            // 5. Generar el Blob para subir
            const pdfBlob = pdf.output('blob');

            // --- FIN NUEVA LÓGICA ---

            // 6. Subir a Supabase Storage
            // Usamos una función de limpieza para el nombre del archivo para evitar caracteres raros
            const cleanName = values.clientName.replace(/[^a-zA-Z0-9]/g, '');
            const fileName = `${Date.now()}_${cleanName}.pdf`;
            
            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('proformas')
                .upload(fileName, pdfBlob, {
                    contentType: 'application/pdf',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // 7. Obtener la URL Pública
            const { data: { publicUrl } } = supabase
                .storage
                .from('proformas')
                .getPublicUrl(fileName);

            // 8. Guardar en la Base de Datos con la URL
            await saveProforma({
                pdf_url: publicUrl 
            });

            // 9. Abrir el diálogo de impresión nativo
            window.print();

        } catch (error) {
            console.error("Error al generar/guardar PDF:", error);
            // Mensaje de error más descriptivo
            alert("Hubo un error técnico generando la imagen del PDF. Por favor imprime usando el diálogo del navegador que aparecerá a continuación.");
            window.print();
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleWhatsApp = () => {
        let phone = values.clientPhone.replace(/\D/g, '');
        if (!phone) return;
        if (phone.startsWith('0')) {
            phone = '593' + phone.substring(1);
        } else if (!phone.startsWith('593')) {
            phone = '593' + phone;
        }
        const url = `https://wa.me/${phone}`;
        window.open(url, '_blank');
    };

    const isProcessing = isGeneratingPdf || isHookSaving;

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 print:p-0 print:bg-white">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* HEADER (Oculto al imprimir) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <Calculator className="text-blue-600 h-8 w-8" />
                            Cotizador Financiero
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Simulación de crédito automotriz (Inventario en Tiempo Real)
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                        <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 select-none shadow-sm transition-colors">
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={includeTableInPdf}
                                    onChange={(e) => setIncludeTableInPdf(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </div>
                            <span className={`text-sm font-medium ${includeTableInPdf ? 'text-blue-600' : 'text-slate-500'}`}>
                                {includeTableInPdf ? "Con Tabla en PDF" : "Sin Tabla en PDF"}
                            </span>
                        </label>

                        <button
                            onClick={resetDefaults}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors font-medium shadow-sm"
                            title="Reiniciar valores"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            <span className="hidden sm:inline">Reiniciar</span>
                        </button>

                        <button
                            onClick={handlePrintAndSave}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium shadow-md shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Printer className="w-4 h-4" />
                            )}
                            {isGeneratingPdf ? 'Archivando...' : (isHookSaving ? 'Guardando...' : 'Imprimir / PDF')}
                        </button>

                        <button
                            onClick={handleWhatsApp}
                            className="flex items-center justify-center p-2.5 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-md shadow-green-600/20"
                            title="Enviar por WhatsApp"
                        >
                            <WhatsAppIcon />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* COLUMNA IZQUIERDA: CONFIGURACIÓN */}
                    <div className="lg:col-span-4 print:hidden">
                        <CreditForm
                            values={values}
                            results={results}
                            inventory={inventory}
                            isLoadingInventory={isLoadingInventory}
                            updateField={updateField}
                            updateDownPaymentByAmount={updateDownPaymentByAmount}
                        />
                    </div>

                    {/* COLUMNA DERECHA: PROFORMA */}
                    {/* El ref=proformaRef es lo que se convierte en imagen/PDF */}
                    <div 
                        ref={proformaRef} 
                        className="lg:col-span-8 print:col-span-12 print:w-full bg-white p-4 rounded-xl"
                        id="proforma-content"
                    >
                        <CreditProforma
                            values={values}
                            results={results}
                            includeTableInPdf={includeTableInPdf}
                        />
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                  body { background: white; color: black; }
                  .print\\:hidden { display: none !important; }
                  .print\\:col-span-12 { grid-column: span 12 / span 12 !important; width: 100% !important; }
                }
            `}</style>
        </div>
    );
}

export default function CreditSimulatorPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        }>
            <CreditSimulatorContent />
        </Suspense>
    );
}