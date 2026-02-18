import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    startIndex: number;
    endIndex: number;
    onPageChange: (page: number) => void;
    onNextPage: () => void;
    onPrevPage: () => void;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export function Pagination({
    currentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    onPageChange,
    onNextPage,
    onPrevPage,
    hasNextPage,
    hasPrevPage,
}: PaginationProps) {
    // Generar números de página para mostrar
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            // Mostrar todas las páginas si son pocas
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Lógica para mostrar páginas con ellipsis
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-white border-t border-zinc-200 rounded-2xl">
            {/* Info de items */}
            <div className="text-sm text-zinc-600">
                Mostrando <span className="font-semibold text-zinc-900">{startIndex}</span> a{" "}
                <span className="font-semibold text-zinc-900">{endIndex}</span> de{" "}
                <span className="font-semibold text-zinc-900">{totalItems}</span> resultados
            </div>

            {/* Controles de paginación */}
            <div className="flex items-center gap-2">
                {/* Primera página */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={!hasPrevPage}
                    className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Primera página"
                >
                    <ChevronsLeft className="h-4 w-4 text-zinc-600" />
                </button>

                {/* Página anterior */}
                <button
                    onClick={onPrevPage}
                    disabled={!hasPrevPage}
                    className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Página anterior"
                >
                    <ChevronLeft className="h-4 w-4 text-zinc-600" />
                </button>

                {/* Números de página */}
                <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => {
                        if (page === '...') {
                            return (
                                <span key={`ellipsis-${index}`} className="px-3 py-2 text-zinc-400">
                                    ...
                                </span>
                            );
                        }

                        const pageNum = page as number;
                        const isActive = pageNum === currentPage;

                        return (
                            <button
                                key={pageNum}
                                onClick={() => onPageChange(pageNum)}
                                className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-semibold transition-all ${isActive
                                    ? 'bg-zinc-900 text-white shadow-sm'
                                    : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                                    }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                {/* Página siguiente */}
                <button
                    onClick={onNextPage}
                    disabled={!hasNextPage}
                    className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Página siguiente"
                >
                    <ChevronRight className="h-4 w-4 text-zinc-600" />
                </button>

                {/* Última página */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={!hasNextPage}
                    className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Última página"
                >
                    <ChevronsRight className="h-4 w-4 text-zinc-600" />
                </button>
            </div>
        </div>
    );
}