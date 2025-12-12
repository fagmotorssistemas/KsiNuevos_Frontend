import { Button } from "@/components/ui/buttontable";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const PaginationPageMinimalCenter = ({ page = 1, total = 10, className = "" }: any) => {
    return (
        <div className={`flex items-center justify-between border-t border-slate-200 ${className}`}>
            <Button variant="link-gray" size="sm" disabled={page <= 1}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            <span className="text-sm text-slate-700">
                Página <span className="font-medium">{page}</span> de <span className="font-medium">{total}</span>
            </span>
            <Button variant="link-gray" size="sm" disabled={page >= total}>
                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
    );
};