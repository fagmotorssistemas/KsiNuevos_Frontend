// Tipos de Base de Datos
export type VisitSource = 'showroom' | 'redes_sociales' | 'referido' | 'cita' | 'otro';
export type CreditStatus = 'aplica' | 'no_aplica' | 'pendiente' | 'no_interesa';

export interface InventoryItem {
    id: string; // CORRECCIÓN: UUID es string
    brand: string;
    model: string;
    year: number;
    price: number;
    status: string;
}

export interface ShowroomVisit {
    id: number;
    salesperson_id: string;
    inventoryoracle_id: string | null; // CORRECCIÓN: UUID es string
    client_name: string;
    visit_start: string;
    visit_end: string | null;
    source: VisitSource;
    test_drive: boolean;
    credit_status: CreditStatus | null;
    observation: string | null;
    created_at: string;
    
    // Relaciones (Joins)
    inventoryoracle?: InventoryItem; // Cambiado de inventory a inventoryoracle
    profiles?: { full_name: string, email: string };
}

// Helpers UI
export const getSourceLabel = (source: VisitSource) => {
    switch(source) {
        case 'showroom': return { label: 'Pasó Caminando', color: 'bg-emerald-100 text-emerald-700' };
        case 'redes_sociales': return { label: 'Redes Sociales', color: 'bg-blue-100 text-blue-700' };
        case 'referido': return { label: 'Referido', color: 'bg-purple-100 text-purple-700' };
        case 'cita': return { label: 'Cita Agendada', color: 'bg-orange-100 text-orange-700' };
        default: return { label: 'Otro', color: 'bg-slate-100 text-slate-600' };
    }
};

export const getCreditLabel = (status: CreditStatus | null) => {
    if (!status) return { label: '-', color: 'text-slate-400' };
    switch(status) {
        case 'aplica': return { label: 'Aplica Crédito', color: 'text-green-600 bg-green-50 border-green-200' };
        case 'no_aplica': return { label: 'No Aplica', color: 'text-red-600 bg-red-50 border-red-200' };
        case 'no_interesa': return { label: 'Contado / No interesa', color: 'text-slate-600 bg-slate-50 border-slate-200' };
        default: return { label: 'Pendiente', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    }
};