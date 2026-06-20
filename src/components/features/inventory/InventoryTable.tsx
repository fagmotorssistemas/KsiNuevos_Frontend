import { useState } from "react";
import { 
    Car,
    MapPin,
    ImageIcon,
    FileText,
    Download,
} from "lucide-react";
import jsPDF from "jspdf";

import { PaginationPageMinimalCenter } from "@/components/ui/pagination"; 
import { Button } from "@/components/ui/buttontable";
import { ImageViewerModal } from "@/components/features/inventory/ImageViewerModal";
import { downloadAllInventoryImages } from "@/lib/download-inventory-images";
import { canShowInventoryDownloadAllImages } from "@/lib/inventory-download-images-access";

import type { InventoryCar } from "@/hooks/useInventory";
import {
    formatInventoryPrice,
    formatRevertCountdown,
    getEffectivePublicPrice,
    isPromoPublicPriceActive,
} from "@/lib/inventario/inventory-pricing";
import { canViewInventoryPrices } from "@/lib/inventario/inventory-pricing-access";

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
    currentUserId?: string | null;
}

export function InventoryTable({ 
    cars, 
    onEdit, 
    page, 
    totalCount, 
    rowsPerPage,
    onPageChange,
    currentUserRole,
    currentUserId,
}: InventoryTableProps) {

    const [viewingCar, setViewingCar] = useState<InventoryCar | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);
    const [downloadingImagesId, setDownloadingImagesId] = useState<string | null>(null);

    const role = currentUserRole?.toLowerCase() || '';
    const canViewPrices = canViewInventoryPrices(role);
    const canEdit = role === 'admin' || role === 'marketing' || role === 'vendedor';
    const canDownloadAllImages = canShowInventoryDownloadAllImages(currentUserId);

    const formatPrice = (price: number | null) => formatInventoryPrice(price);

    const formatKm = (km: number | null) => 
        km ? `${km.toLocaleString()} km` : '0 km';

    const getStatusPillClass = (status: string | null) => {
        switch (status) {
            case 'disponible':
                return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'vendido':
                return 'bg-slate-100 text-slate-500 border-slate-200';
            case 'reservado':
                return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'mantenimiento':
                return 'bg-orange-50 text-orange-700 border-orange-100';
            default:
                return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    const getStatusLabel = (status: string | null) => {
        switch (status) {
            case 'disponible': return 'Disponible';
            case 'vendido': return 'Vendido';
            case 'reservado': return 'Reservado';
            case 'mantenimiento': return 'Taller';
            case 'devuelto': return 'Devuelto';
            case 'conwilsonhernan': return 'Con Wilson Hernan';
            case 'consignacion': return 'En consignación';
            default: return status || 'Desconocido';
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

    const handleDownloadAllImages = async (car: InventoryCar, e: React.MouseEvent) => {
        e.stopPropagation();
        setDownloadingImagesId(car.id);
        try {
            await downloadAllInventoryImages(car);
        } catch (error) {
            console.error("Error al descargar imágenes:", error);
            alert("No se pudieron descargar todas las imágenes.");
        } finally {
            setDownloadingImagesId(null);
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Vehículo</th>
                                <th className="px-4 py-3 font-semibold">Placa / ID</th>
                                <th className="px-4 py-3 font-semibold">Año / Color</th>
                                {canViewPrices && (
                                    <>
                                        <th className="px-4 py-3 font-semibold">Precio interno</th>
                                        <th className="px-4 py-3 font-semibold">Precio público</th>
                                    </>
                                )}
                                <th className="px-4 py-3 font-semibold hidden md:table-cell">Kilometraje</th>
                                <th className="px-4 py-3 font-semibold text-center">Estado</th>
                                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Ubicación</th>
                                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {cars.length > 0 ? (
                                cars.map((car) => {
                                    const hasImages =
                                        !!car.img_main_url ||
                                        (car.img_gallery_urls && car.img_gallery_urls.length > 0);

                                    return (
                                        <tr
                                            key={car.id}
                                            className="hover:bg-slate-50/80 transition-colors group"
                                        >
                                            <td className="px-4 py-3">
                                                <div
                                                    onClick={() => setViewingCar(car)}
                                                    className="flex items-center gap-3 cursor-pointer"
                                                    title="Click para ver fotos"
                                                >
                                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                                        <Car className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900 capitalize group-hover:text-blue-600 flex items-center gap-2">
                                                            {car.brand} {car.model}
                                                            {hasImages && (
                                                                <ImageIcon className="w-3 h-3 text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-slate-500 capitalize">
                                                            {car.type_body || 'Vehículo'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded w-fit">
                                                    {car.plate || car.plate_short || 'S/P'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                <div>{car.year || '-'}</div>
                                                <div className="text-xs text-slate-400 capitalize">
                                                    {car.color || '-'}
                                                </div>
                                            </td>
                                            {canViewPrices && (
                                                <>
                                                    <td className="px-4 py-3 font-medium text-slate-800">
                                                        {car.internal_fixed_price != null ? (
                                                            <span>{formatInventoryPrice(car.internal_fixed_price)}</span>
                                                        ) : (
                                                            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                                                Sin fijar
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-emerald-600">
                                                        <div>
                                                            {formatPrice(getEffectivePublicPrice(car))}
                                                        </div>
                                                        {isPromoPublicPriceActive({
                                                            price: car.price,
                                                            internal_fixed_price: car.internal_fixed_price,
                                                            internal_fixed_price_set_at: car.internal_fixed_price_set_at,
                                                            public_price_changed_at: car.public_price_changed_at,
                                                            public_price_change_reason: car.public_price_change_reason,
                                                            public_price_reverts_at: car.public_price_reverts_at,
                                                        }) && (
                                                            <div className="text-[10px] text-violet-600 font-normal mt-0.5 max-w-[150px] leading-snug">
                                                                {car.public_price_reverts_at && (
                                                                    <span className="block text-slate-400">
                                                                        {formatRevertCountdown(car.public_price_reverts_at)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                                                {formatKm(car.mileage)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStatusPillClass(car.status)}`}
                                                >
                                                    {getStatusLabel(car.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <div className="flex items-center gap-1 text-slate-500 text-xs capitalize">
                                                    <MapPin className="h-3 w-3" />
                                                    {car.location || 'Patio'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDownloadPdf(car)}
                                                        disabled={isGeneratingPdf === car.id}
                                                        className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all disabled:opacity-50"
                                                        title="Descargar Ficha Técnica"
                                                    >
                                                        {isGeneratingPdf === car.id ? (
                                                            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                                                        ) : (
                                                            <FileText className="h-4 w-4" />
                                                        )}
                                                    </button>

                                                    {hasImages && canDownloadAllImages && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDownloadAllImages(car, e)}
                                                            disabled={
                                                                downloadingImagesId === car.id ||
                                                                isGeneratingPdf === car.id
                                                            }
                                                            className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all disabled:opacity-50"
                                                            title="Descargar todas las fotos (portada y galería)"
                                                        >
                                                            {downloadingImagesId === car.id ? (
                                                                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                                                            ) : (
                                                                <Download className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    )}

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
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                                        No se encontraron vehículos.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <PaginationPageMinimalCenter
                    page={page}
                    total={totalCount}
                    limit={rowsPerPage}
                    className="mt-6 border-t border-slate-100 pt-4"
                    onChange={onPageChange}
                />
            </div>

            {viewingCar && (
                <ImageViewerModal
                    car={viewingCar}
                    onClose={() => setViewingCar(null)}
                />
            )}
        </>
    );
}