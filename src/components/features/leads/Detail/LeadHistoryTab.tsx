import { useState, useEffect, FormEvent } from "react";
import { Clock, Phone, MessageCircle, User, FileText, Loader2, Send, LayoutGrid } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Input, Button } from "./ui-components";
import { RESULT_OPTIONS } from "./constants";
import type { Database } from "@/types/supabase";
import type { LeadWithDetails } from "../../../../hooks/useLeads";

type Interaction = Database['public']['Tables']['interactions']['Row'];

export function LeadHistoryTab({ lead }: { lead: LeadWithDetails }) {
    const { supabase, user } = useAuth();
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [newInteractionNote, setNewInteractionNote] = useState("");
    // Iniciar con llamada o kommo según prefieras
    const [interactionType, setInteractionType] = useState<string>("llamada");
    const [interactionResult, setInteractionResult] = useState<string | null>(null);
    const [isSubmittingInteraction, setIsSubmittingInteraction] = useState(false);

    useEffect(() => {
        const fetchInteractions = async () => {
            const { data } = await supabase
                .from('interactions')
                .select('*')
                .eq('lead_id', lead.id)
                .order('created_at', { ascending: false });
            if (data) setInteractions(data);
        };
        fetchInteractions();
    }, [lead.id, supabase]);

    const handleSubmitInteraction = async (e: FormEvent) => {
        e.preventDefault();
        // Validación: Requiere nota O resultado
        if ((!newInteractionNote.trim() && !interactionResult) || !user) return;

        setIsSubmittingInteraction(true);

        const { data, error } = await supabase
            .from('interactions')
            .insert({
                lead_id: lead.id,
                type: interactionType as any, // 'kommo' se pasará aquí
                content: newInteractionNote,
                result: interactionResult || 'completado',
                responsible_id: user.id
            })
            .select()
            .single();

        if (!error && data) {
            setInteractions([data, ...interactions]);
            setNewInteractionNote("");
            setInteractionResult(null);
        } else {
            console.error("Error guardando interacción:", error);
            // Tip: Si falla aquí, suele ser porque falta agregar 'kommo' al ENUM en la base de datos
        }
        setIsSubmittingInteraction(false);
    };

    const getInteractionIcon = (type: string) => {
        switch (type) {
            case 'llamada': return <Phone className="h-4 w-4 text-blue-500" />;
            case 'whatsapp': return <MessageCircle className="h-4 w-4 text-green-500" />;
            case 'visita': return <User className="h-4 w-4 text-purple-500" />;
            case 'kommo': return <LayoutGrid className="h-4 w-4 text-sky-600" />; // Ícono para Kommo
            case 'email': return <FileText className="h-4 w-4 text-orange-500" />; 
            default: return <FileText className="h-4 w-4 text-gray-500" />;
        }
    };

    return (
        <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
                {interactions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Clock className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Sin interacciones.</p>
                    </div>
                ) : (
                    interactions.map((interaction) => (
                        <div key={interaction.id} className="flex gap-4">
                            <div className="flex flex-col items-center pt-1">
                                <div className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-200 z-10">
                                    {getInteractionIcon(interaction.type)}
                                </div>
                                <div className="w-0.5 h-full bg-slate-200 -mb-6 mt-2"></div>
                            </div>
                            <div className="flex-1 pb-2">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold uppercase text-slate-600">{interaction.type}</span>
                                    <span className="text-[10px] text-slate-400">{new Date(interaction.created_at || '').toLocaleString()}</span>
                                </div>
                                <div className="bg-white border border-slate-200 p-3 rounded-xl text-sm text-slate-700 shadow-sm">
                                    {interaction.content}
                                </div>
                                {interaction.result && (
                                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium uppercase tracking-wide">
                                        {interaction.result.replace('_', ' ')}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200 shadow-up z-20">
                <form onSubmit={handleSubmitInteraction} className="flex flex-col gap-3">
                    {/* Botones de Tipo */}
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {Object.keys(RESULT_OPTIONS).map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => { setInteractionType(type); setInteractionResult(null); }}
                                className={`text-xs px-3 py-1.5 rounded-full border font-medium capitalize transition-all whitespace-nowrap ${interactionType === type ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                            >
                                {type.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                    {/* Opciones de Resultado */}
                    <div className="flex flex-wrap gap-2">
                        {RESULT_OPTIONS[interactionType]?.map(option => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setInteractionResult(option)}
                                className={`text-[10px] px-2.5 py-1 rounded-md border uppercase tracking-wide font-semibold transition-all ${interactionResult === option
                                    ? 'bg-brand-50 border-brand-200 text-brand-700 ring-1 ring-brand-200'
                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                    }`}
                            >
                                {option.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                    {/* Input de Texto */}
                    <div className="relative flex items-center gap-2">
                        <Input
                            placeholder={`Resultado de ${interactionType}...`}
                            value={newInteractionNote}
                            onChange={(e) => setNewInteractionNote(e.target.value)}
                            className="w-full rounded-full border border-slate-300 bg-slate-50 pl-5 pr-14 py-3 text-sm focus:border-brand-500 focus:bg-white shadow-inner"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <Button
                                type="submit"
                                disabled={isSubmittingInteraction}
                                className="h-9 w-9 rounded-full bg-black hover:bg-gray-800 text-white shadow-sm flex items-center justify-center p-0"
                            >
                                {isSubmittingInteraction ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}