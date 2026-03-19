// Opciones de Estado (Status)
export const STATUS_OPTIONS = [
    { value: 'nuevo', label: 'Nuevo', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { value: 'contactado', label: 'Contactado', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'interesado', label: 'Interesado', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { value: 'negociando', label: 'Negociando', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { value: 'ganado', label: 'Ganado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { value: 'perdido', label: 'Perdido', color: 'bg-red-50 text-red-700 border-red-200' },
    { value: 'en_proceso', label: 'En Proceso', color: 'bg-gray-50 text-gray-700 border-gray-200' },
    { value: 'datos_pedidos', label: 'Info. Faltante', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { value: 'asesoria_financiamiento', label: 'Asesoria Financiamiento', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }

];

// NUEVO: Opciones de Temperatura
export const TEMPERATURE_OPTIONS = [
    { value: 'frio', label: '❄️ Frío', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    { value: 'tibio', label: '🌤️ Tibio', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { value: 'caliente', label: '🔥 Caliente', color: 'bg-red-50 text-red-700 border-red-200' }
];

// Opciones de resultado según el tipo de interacción
export const RESULT_OPTIONS: Record<string, string[]> = {
    llamada: ['contestó', 'buzón', 'ocupado', 'número_equivocado', 'volver_a_llamar'],
    whatsapp: ['enviado', 'leído', 'respondido', 'bloqueado'],
    visita: ['asistió', 'no_asistió', 'reprogramó', 'venta_cerrada'],
    email: ['enviado', 'rebotado', 'respondido'],
    nota_interna: ['informativo', 'urgente'],
    kommo: ['contactado']
};