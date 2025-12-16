
export type RequestStatusType = 'pendiente' | 'aprobado' | 'comprado' | 'rechazado';
export type RequestPriorityType = 'baja' | 'media' | 'alta';

export interface VehicleRequest {
    id: number;
    brand: string;
    model: string;
    year_min: number | null;
    year_max: number | null;
    color_preference: string | null;
    budget_max: number | null;
    status: RequestStatusType;
    priority: RequestPriorityType;
    client_name: string | null;
    notes: string | null;
    created_at: string;
    requested_by: string;
    profiles?: { full_name: string };
}

// Helpers visuales
export const getPriorityColor = (p: string) => {
    switch(p) {
        case 'alta': return 'bg-red-100 text-red-700 border-red-200';
        case 'media': return 'bg-orange-100 text-orange-700 border-orange-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
};

export const getStatusColor = (s: string) => {
    switch(s) {
        case 'pendiente': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        case 'aprobado': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'comprado': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'rechazado': return 'bg-gray-100 text-gray-500 border-gray-200';
        default: return 'bg-white';
    }
};