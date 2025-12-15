import { Button } from "@/components/ui/buttontable";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface PaginationProps {
    page: number;
    total: number; // Total de items
    limit?: number; // Items por página (opcional, por defecto 10 para calcular totalPages)
    className?: string;
    onChange: (newPage: number) => void;
}

export const PaginationPageMinimalCenter = ({ 
    page = 1, 
    total = 0, 
    limit = 10,
    className = "",
    onChange 
}: PaginationProps) => {
    // Calculamos cuántas páginas hay en total basándonos en los items
    const totalPages = Math.ceil(total / limit);

    return (
        <div className={`flex items-center justify-between border-t border-slate-200 ${className}`}>
            <Button 
                variant="link-gray" 
                size="sm" 
                disabled={page <= 1}
                onClick={() => onChange(page - 1)} // <--- AGREGADO
            >
                <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            
            <span className="text-sm text-slate-700">
                Página <span className="font-medium">{page}</span> de <span className="font-medium">{totalPages || 1}</span>
            </span>
            
            <Button 
                variant="link-gray" 
                size="sm" 
                disabled={page >= totalPages} // Usar totalPages en lugar de total
                onClick={() => onChange(page + 1)} // <--- AGREGADO
            >
                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
    );
};