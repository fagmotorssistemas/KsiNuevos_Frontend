"use client";

import { useState, useEffect, useCallback } from "react";
import {
    X,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    FileText,
    Image as ImageIcon,
    Download,
    Loader2,
} from "lucide-react";

import { isDocumentImageFile, isDocumentPdfFile } from "@/lib/inventario/vehicleLegalUi";
import type { VehicleDocumentFileRow } from "@/types/vehicleLegal.types";

type Props = {
    title: string;
    subtitle?: string;
    files: VehicleDocumentFileRow[];
    onClose: () => void;
};

async function downloadDocumentFile(file: VehicleDocumentFileRow): Promise<void> {
    const fileName = file.file_name?.trim() || "documento";

    try {
        const res = await fetch(file.file_url, { mode: "cors" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
    } catch {
        const a = document.createElement("a");
        a.href = file.file_url;
        a.download = fileName;
        a.target = "_blank";
        a.rel = "noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

async function downloadAllDocumentFiles(files: VehicleDocumentFileRow[]): Promise<void> {
    for (let i = 0; i < files.length; i++) {
        await downloadDocumentFile(files[i]);
        if (i < files.length - 1) {
            await new Promise((r) => setTimeout(r, 350));
        }
    }
}

export function VehicleDocumentFilesModal({ title, subtitle, files, onClose }: Props) {
    const [index, setIndex] = useState(0);
    const [downloading, setDownloading] = useState<"one" | "all" | null>(null);
    const safeIndex = Math.min(index, Math.max(files.length - 1, 0));
    const current = files[safeIndex];

    const next = useCallback(() => {
        setIndex((prev) => (prev >= files.length - 1 ? 0 : prev + 1));
    }, [files.length]);

    const prev = useCallback(() => {
        setIndex((prev) => (prev <= 0 ? files.length - 1 : prev - 1));
    }, [files.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (files.length > 1 && e.key === "ArrowRight") next();
            if (files.length > 1 && e.key === "ArrowLeft") prev();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose, next, prev, files.length]);

    if (files.length === 0) return null;

    const isImage = current ? isDocumentImageFile(current) : false;
    const isPdf = current ? isDocumentPdfFile(current) : false;

    const handleDownloadCurrent = async () => {
        if (!current || downloading) return;
        setDownloading("one");
        try {
            await downloadDocumentFile(current);
        } finally {
            setDownloading(null);
        }
    };

    const handleDownloadAll = async () => {
        if (downloading) return;
        setDownloading("all");
        try {
            await downloadAllDocumentFiles(files);
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-200">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-slate-900 truncate">{title}</h2>
                        {subtitle && <p className="text-sm text-slate-500 truncate mt-0.5">{subtitle}</p>}
                        {files.length > 1 && (
                            <p className="text-xs text-slate-400 mt-1 tabular-nums">
                                Archivo {safeIndex + 1} de {files.length}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {files.length > 1 && (
                            <button
                                type="button"
                                disabled={downloading !== null}
                                onClick={() => void handleDownloadAll()}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors"
                            >
                                {downloading === "all" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="h-4 w-4" />
                                )}
                                Descargar todos
                            </button>
                        )}
                        <button
                            type="button"
                            disabled={!current || downloading !== null}
                            onClick={() => void handleDownloadCurrent()}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {downloading === "one" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            Descargar
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {files.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto px-5 py-3 border-b border-slate-100 bg-slate-50/80">
                        {files.map((file, i) => (
                            <button
                                key={file.id}
                                type="button"
                                onClick={() => setIndex(i)}
                                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors max-w-[200px] ${
                                    i === safeIndex
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                                }`}
                                title={file.file_name}
                            >
                                {isDocumentImageFile(file) ? (
                                    <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                    <FileText className="h-3.5 w-3.5 shrink-0" />
                                )}
                                <span className="truncate">{file.file_name}</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="relative flex-1 min-h-[320px] max-h-[calc(92vh-180px)] bg-slate-100 flex items-center justify-center overflow-hidden">
                    {files.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={prev}
                                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 shadow border border-slate-200 text-slate-600 hover:bg-white"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                onClick={next}
                                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 shadow border border-slate-200 text-slate-600 hover:bg-white"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </>
                    )}

                    {isImage && current && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={current.file_url}
                            alt={current.file_name}
                            className="max-h-full max-w-full object-contain p-4"
                        />
                    )}

                    {isPdf && current && (
                        <iframe
                            src={current.file_url}
                            title={current.file_name}
                            className="w-full h-full min-h-[320px] bg-white"
                        />
                    )}

                    {current && !isImage && !isPdf && (
                        <div className="flex flex-col items-center gap-3 p-8 text-center">
                            <FileText className="h-12 w-12 text-slate-400" />
                            <p className="text-sm font-semibold text-slate-700">{current.file_name}</p>
                            <p className="text-xs text-slate-500">Vista previa no disponible para este tipo de archivo.</p>
                            <a
                                href={current.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Abrir archivo
                            </a>
                            <button
                                type="button"
                                disabled={downloading !== null}
                                onClick={() => void handleDownloadCurrent()}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                            >
                                <Download className="h-4 w-4" />
                                Descargar
                            </button>
                        </div>
                    )}
                </div>

                {current && (
                    <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 bg-slate-50/50">
                        <p className="text-sm text-slate-600 truncate min-w-0" title={current.file_name}>
                            {current.file_name}
                        </p>
                        <div className="flex items-center gap-3 shrink-0">
                            <button
                                type="button"
                                disabled={downloading !== null}
                                onClick={() => void handleDownloadCurrent()}
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                                {downloading === "one" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="h-4 w-4" />
                                )}
                                Descargar
                            </button>
                            <a
                                href={current.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
                            >
                                Abrir en pestaña
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
