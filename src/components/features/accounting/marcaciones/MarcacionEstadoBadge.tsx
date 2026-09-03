import { AlertTriangle } from "lucide-react";
import { estadoUi } from "@/components/features/accounting/marcaciones/marcaciones-display";

export function MarcacionEstadoBadge({ estado }: { estado?: string | null }) {
    const ui = estadoUi(estado);
    if (!ui) return null;

    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${ui.className}`}>
            {ui.label}
        </span>
    );
}

export function MarcacionAlertas({ alertas }: { alertas?: string[] }) {
    if (!alertas?.length) return null;

    return (
        <ul className="space-y-1">
            {alertas.map((alerta) => (
                <li
                    key={alerta}
                    className="flex items-start gap-1.5 text-xs font-medium text-amber-800"
                >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{alerta}</span>
                </li>
            ))}
        </ul>
    );
}
