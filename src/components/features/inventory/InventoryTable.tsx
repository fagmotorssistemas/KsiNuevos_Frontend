import { useState } from "react";
import { 
    Check, 
    X, 
    AlertCircle, 
    Clock, 
    Car,
    MapPin,
    Hash,
    ImageIcon,
    FileText
} from "lucide-react";
import jsPDF from "jspdf";

import { PaginationPageMinimalCenter } from "@/components/ui/pagination"; 
import { Table, TableCard } from "@/components/ui/table";
import { BadgeWithIcon } from "@/components/ui/badges";
import { Button } from "@/components/ui/buttontable";
import { ImageViewerModal } from "@/components/features/inventory/ImageViewerModal";

import type { InventoryCar } from "@/hooks/useInventory";

// --- UTILIDAD PARA GENERAR PDF ---
const generateTechnicalSheet = async (car: InventoryCar) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    
    // --- PALETA DE COLORES (BLANCO, NEGRO, ROJO) ---
    const colorBlack = "#000000";
    const colorRed = "#DC2626";
    const colorGray = "#4B5563";
    const colorLightGray = "#E5E7EB";

    // --- CONFIGURACIÓN DE LOGO ---
    const LOGO_URL = "https://enfqumrstqefbxtwsslq.supabase.co/storage/v1/object/public/logo/logoksi.png"; 

    // 1. ENCABEZADO (Logo Aún Más Grande)
    try {
        const response = await fetch(LOGO_URL);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });

        const imgProps = doc.getImageProperties(base64);
        // Aumentamos el ancho a 90mm (casi la mitad del ancho útil)
        const logoWidth = 90; 
        const logoHeight = (imgProps.height * logoWidth) / imgProps.width;
        
        doc.addImage(base64, "PNG", margin, 15, logoWidth, logoHeight);
    } catch (e) {
        doc.setTextColor(colorBlack);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("CONCESIONARIO", margin, 30);
    }

    // Datos de contacto a la derecha
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(colorGray);
    doc.text("FICHA TÉCNICA", pageWidth - margin, 25, { align: "right" });
    doc.setTextColor(colorRed);
    doc.setFont("helvetica", "bold");
    doc.text("WWW.KSINUEVOS.COM", pageWidth - margin, 30, { align: "right" });

    // Línea separadora roja
    doc.setDrawColor(colorRed);
    doc.setLineWidth(1.5);
    doc.line(margin, 45, pageWidth - margin, 45);

    // 2. TÍTULO DEL AUTO
    let yPos = 65; 
    
    doc.setTextColor(colorBlack);
    doc.setFontSize(28); // Un poco más pequeño para evitar saltos excesivos
    doc.setFont("helvetica", "bold");
    const title = `${car.brand} ${car.model}`.toUpperCase();
    const titleLines = doc.splitTextToSize(title, pageWidth - (margin * 2));
    doc.text(titleLines, margin, yPos);
    
    yPos += (titleLines.length * 10); 

    // Año (Subtítulo en Rojo)
    doc.setFontSize(18);
    doc.setTextColor(colorRed);
    doc.text(`${car.year}`, margin, yPos);
    yPos += 15;

    // 3. IMAGEN PRINCIPAL (Sin recorte complejo para evitar errores de visualización)
    if (car.img_main_url) {
        try {
            const response = await fetch(car.img_main_url);
            if (!response.ok) throw new Error("Network response was not ok");
            const blob = await response.blob();
            const base64Img = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });

            const imgProps = doc.getImageProperties(base64Img);
            const maxWidth = pageWidth - (margin * 2);
            const maxHeight = 100; 
            const imgRatio = imgProps.width / imgProps.height;
            
            let finalWidth = maxWidth;
            let finalHeight = maxWidth / imgRatio;

            if (finalHeight > maxHeight) {
                finalHeight = maxHeight;
                finalWidth = finalHeight * imgRatio;
            }

            const xCentering = (pageWidth - finalWidth) / 2;

            // Dibujamos la imagen DIRECTAMENTE (sin clip) para asegurar que no oculte el texto siguiente
            doc.addImage(base64Img, "JPEG", xCentering, yPos, finalWidth, finalHeight);

            // Marco decorativo opcional alrededor de la imagen
            doc.setDrawColor(colorLightGray);
            doc.setLineWidth(0.5);
            doc.rect(xCentering, yPos, finalWidth, finalHeight);

            yPos += finalHeight + 20;

        } catch (error) {
            console.error("Error cargando imagen auto:", error);
            doc.setDrawColor(colorLightGray);
            doc.setFillColor(colorLightGray);
            doc.rect(margin, yPos, pageWidth - (margin * 2), 80, "F");
            doc.setTextColor(colorGray);
            doc.setFontSize(12);
            doc.text("IMAGEN NO DISPONIBLE", pageWidth / 2, yPos + 40, { align: "center" });
            yPos += 90;
        }
    } else {
        yPos += 10;
    }

    // 4. ESPECIFICACIONES (Aseguramos color negro y reinicio de estilos)
    doc.setTextColor(colorBlack);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("ESPECIFICACIONES", margin, yPos);
    yPos += 3;
    
    doc.setDrawColor(colorRed);
    doc.setLineWidth(2);
    doc.line(margin, yPos, margin + 20, yPos); 
    yPos += 15;

    const drawSpecItem = (label: string, value: string, x: number, y: number) => {
        doc.setFontSize(9);
        doc.setTextColor(colorGray);
        doc.setFont("helvetica", "bold");
        doc.text(label.toUpperCase(), x, y);
        
        doc.setFontSize(12);
        doc.setTextColor(colorBlack);
        doc.setFont("helvetica", "normal");
        const cleanValue = (value || "-").toString().toUpperCase();
        doc.text(cleanValue, x, y + 6);
    };

    const col1 = margin;
    const col2 = pageWidth / 2 + 10;
    const rowGap = 20;

    // Fila 1
    drawSpecItem("KILOMETRAJE", `${car.mileage?.toLocaleString() || 0} KM`, col1, yPos);
    drawSpecItem("COLOR", car.color || "NO ESPECIFICADO", col2, yPos);
    yPos += rowGap;

    // Fila 2
    drawSpecItem("CARROCERÍA", car.type_body || "VEHÍCULO", col1, yPos);
    drawSpecItem("PLACA", car.plate_short || "S/P", col2, yPos);
    yPos += rowGap;


    // 6. PIE DE PÁGINA
    const footerHeight = 15;
    doc.setFillColor(colorBlack);
    doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, "F");
    
    doc.setTextColor("#FFFFFF");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("GENERADO POR SISTEMA DE KSINUEVOS", margin, pageHeight - 5);
    
    const dateStr = new Date().toLocaleDateString("es-ES", { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
    doc.text(dateStr, pageWidth - margin, pageHeight - 5, { align: "right" });

    // Guardar
    const fileName = `FICHA_${car.brand}_${car.model}.pdf`.toUpperCase().replace(/\s+/g, '_');
    doc.save(fileName);
};


interface InventoryTableProps {
    cars: InventoryCar[];
    onEdit?: (car: InventoryCar) => void;
    page: number;
    totalCount: number;
    rowsPerPage: number;
    onPageChange: (newPage: number) => void;
    currentUserRole?: string | null;
}

export function InventoryTable({ 
    cars, 
    onEdit, 
    page, 
    totalCount, 
    rowsPerPage,
    onPageChange,
    currentUserRole 
}: InventoryTableProps) {

    const [viewingCar, setViewingCar] = useState<InventoryCar | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);

    const role = currentUserRole?.toLowerCase() || '';
    const canEdit = role === 'admin' || role === 'marketing';

    const formatPrice = (price: number | null) => 
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price ?? 0);

    const formatKm = (km: number | null) => 
        km ? `${km.toLocaleString()} km` : '0 km';

    const getStatusConfig = (status: string | null) => {
        switch (status) {
            case 'disponible': return { color: 'success' as const, icon: Check, label: 'Disponible' };
            case 'vendido': return { color: 'error' as const, icon: X, label: 'Vendido' };
            case 'reservado': return { color: 'warning' as const, icon: Clock, label: 'Reservado' };
            case 'mantenimiento': return { color: 'gray' as const, icon: AlertCircle, label: 'Taller' };
            case 'devuelto': return { color: 'brand' as const, icon: AlertCircle, label: 'Devuelto' };
            case 'conwilsonhernan': return { color: 'brand' as const, icon: AlertCircle, label: 'Con Wilson Hernan' };
            case 'consignacion': return { color: 'brand' as const, icon: Car, label: 'En consignación' };
            default: return { color: 'gray' as const, icon: AlertCircle, label: status || 'Desconocido' };
        }
    };

    const handleDownloadPdf = async (car: InventoryCar) => {
        setIsGeneratingPdf(car.id);
        try {
            await generateTechnicalSheet(car);
        } catch (error) {
            console.error("Error al generar PDF:", error);
            alert("No se pudo generar el PDF. Revisa la consola.");
        } finally {
            setIsGeneratingPdf(null);
        }
    };

    if (cars.length === 0 && totalCount === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                <Car className="h-10 w-10 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No se encontraron vehículos</h3>
            </div>
        );
    }

    return (
        <>
            <TableCard.Root>
                <Table aria-label="Tabla de Inventario">
                    <Table.Header>
                        <Table.Head id="plate" label="Placa" />
                        <Table.Head id="vehicle" label="Vehículo (Ver Fotos)" />
                        <Table.Head id="year" label="Año" />
                        <Table.Head id="price" label="Precio" />
                        <Table.Head id="km" label="Kilometraje" className="hidden md:table-cell" />
                        <Table.Head id="status" label="Estado" />
                        <Table.Head id="location" label="Ubicación" className="hidden lg:table-cell" />
                        <Table.Head id="actions" label="" />
                    </Table.Header>

                    <Table.Body items={cars}>
                        {(car: InventoryCar) => {
                            const statusInfo = getStatusConfig(car.status);
                            const hasImages = !!car.img_main_url || (car.img_gallery_urls && car.img_gallery_urls.length > 0);

                            return (
                                <Table.Row id={car.id}>
                                    <Table.Cell>
                                        <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit">
                                            <Hash className="h-3 w-3 text-slate-400" />
                                            {car.plate || car.plate_short || 'S/P'}
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell>
                                        <div 
                                            onClick={() => setViewingCar(car)}
                                            className="group flex flex-col cursor-pointer transition-all"
                                            title="Click para ver fotos"
                                        >
                                            <span className="font-bold text-slate-800 capitalize group-hover:text-brand-600 flex items-center gap-2">
                                                {car.brand} {car.model}
                                                {hasImages && (
                                                    <ImageIcon className="w-3 h-3 text-slate-400 group-hover:text-brand-500" />
                                                )}
                                            </span>
                                            <span className="text-xs text-slate-500 capitalize group-hover:text-brand-400/80">
                                                {car.type_body || 'Vehículo'} • {car.color}
                                            </span>
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell className="text-slate-600 font-medium">
                                        {car.year}
                                    </Table.Cell>

                                    <Table.Cell>
                                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                            {formatPrice(car.price)}
                                        </span>
                                    </Table.Cell>

                                    <Table.Cell className="hidden md:table-cell text-slate-500 text-sm">
                                        {formatKm(car.mileage)}
                                    </Table.Cell>

                                    <Table.Cell>
                                        <BadgeWithIcon
                                            color={statusInfo.color}
                                            iconLeading={statusInfo.icon}
                                            className="capitalize"
                                        >
                                            {statusInfo.label}
                                        </BadgeWithIcon>
                                    </Table.Cell>

                                    <Table.Cell className="hidden lg:table-cell">
                                        <div className="flex items-center gap-1 text-slate-500 text-xs capitalize">
                                            <MapPin className="h-3 w-3" />
                                            {car.location || 'Patio'}
                                        </div>
                                    </Table.Cell>

                                    <Table.Cell>
                                        <div className="flex justify-end items-center gap-2">
                                            <button 
                                                onClick={() => handleDownloadPdf(car)}
                                                disabled={isGeneratingPdf === car.id}
                                                className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                                title="Descargar Ficha Técnica"
                                            >
                                                {isGeneratingPdf === car.id ? (
                                                    <div className="animate-spin h-4 w-4 border-2 border-brand-600 border-t-transparent rounded-full" />
                                                ) : (
                                                    <FileText className="h-4 w-4" />
                                                )}
                                            </button>

                                            {canEdit && (
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => onEdit && onEdit(car)}
                                                >
                                                    Gestionar
                                                </Button>
                                            )}
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            );
                        }}
                    </Table.Body>
                </Table>
                
                <PaginationPageMinimalCenter 
                    page={page} 
                    total={totalCount} 
                    limit={rowsPerPage}
                    className="px-6 py-4" 
                    onChange={onPageChange} 
                />
            </TableCard.Root>

            {viewingCar && (
                <ImageViewerModal 
                    car={viewingCar} 
                    onClose={() => setViewingCar(null)} 
                />
            )}
        </>
    );
}