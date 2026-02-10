import { MessageSquare, DollarSign, ThumbsUp, Ban, AlertCircle } from "lucide-react";

// Tus Enums (Sin cambios)
export type LeadMessageResponse = 
  | 'no_le_interesa'
  | 'ya_compro'
  | 'no_molesten'
  | 'no_hubo_respuesta'
  | 'continua_conversacion'
  | null;

// ACTUALIZADO: Agregamos los campos _text
export interface LeadRecoveryRow {
  id: number;
  lead_id: number;
  sent_2d: boolean;
  sent_7d: boolean;
  sent_15d: boolean;
  sent_30d: boolean;
  response_2d: LeadMessageResponse;
  response_7d: LeadMessageResponse;
  response_15d: LeadMessageResponse;
  response_30d: LeadMessageResponse;
  
  // Nuevas columnas de texto
  response_2d_text: string | null;
  response_7d_text: string | null;
  response_15d_text: string | null;
  response_30d_text: string | null;
}

// Configuración de Pasos (Sin cambios)
export const RECOVERY_STEPS = [
  { key: '2d', label: '2 Días', title: 'Primer Contacto' },
  { key: '7d', label: '7 Días', title: 'Seguimiento Semanal' },
  { key: '15d', label: '15 Días', title: 'Opciones Financiamiento' },
  { key: '30d', label: '30 Días', title: 'Último Intento' }
] as const;

// Configuración Visual (Sin cambios)
export const RESPONSE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  'continua_conversacion': { label: 'Conversando', bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: MessageSquare },
  'ya_compro':             { label: 'Ya Compró', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: DollarSign },
  'no_le_interesa':        { label: 'No Interesado', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', icon: ThumbsUp },
  'no_molesten':           { label: 'No Molestar', bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: Ban },
  'no_hubo_respuesta':     { label: 'Sin Respuesta', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-500', icon: AlertCircle },
};