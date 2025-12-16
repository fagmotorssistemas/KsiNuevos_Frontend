import { useState, useEffect, FormEvent } from "react";
import { Calendar, Clock, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Input, Button } from "./ui-components";
import type { Database } from "@/types/supabase";
import type { LeadWithDetails } from "../../../../hooks/useLeads";

type Appointment = Database['public']['Tables']['appointments']['Row'];

export function LeadAgendaTab({ lead }: { lead: LeadWithDetails }) {
    const { supabase, user } = useAuth();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [apptDate, setApptDate] = useState("");
    const [apptTime, setApptTime] = useState("");
    const [apptTitle, setApptTitle] = useState("");
    const [isSubmittingAppt, setIsSubmittingAppt] = useState(false);

    useEffect(() => {
        const fetchAppointments = async () => {
            const { data } = await supabase
                .from('appointments')
                .select('*')
                .eq('lead_id', lead.id)
                .order('start_time', { ascending: true });
            if (data) setAppointments(data);
        };
        fetchAppointments();
    }, [lead.id, supabase]);

    const handleSubmitAppointment = async (e: FormEvent) => {
        e.preventDefault();
        if (!apptDate || !apptTime || !apptTitle || !user) return;

        setIsSubmittingAppt(true);

        const startDateTime = new Date(`${apptDate}T${apptTime}`);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

        const { data, error } = await supabase
            .from('appointments')
            .insert({
                lead_id: lead.id,
                responsible_id: user.id,
                title: apptTitle,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                status: 'pendiente',
                location: 'Showroom'
            })
            .select()
            .single();

        if (!error && data) {
            setAppointments([...appointments, data].sort((a, b) =>
                new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            ));
            setApptTitle("");
            setApptTime("");
        } else {
            console.error(error);
            alert("Error al agendar. Verifica los datos.");
        }
        setIsSubmittingAppt(false);
    };

    return (
        <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
                {appointments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Calendar className="h-10 w-10 mb-2 opacity-50" />
                        <p className="text-sm font-medium">Agenda vacía</p>
                        <p className="text-xs">Programa una cita abajo.</p>
                    </div>
                ) : (
                    appointments.map(appt => (
                        <div key={appt.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-brand-200 transition-colors">
                            <div className="bg-brand-50 text-brand-700 p-2.5 rounded-lg flex flex-col items-center min-w-[60px]">
                                <span className="text-xs font-bold uppercase">{new Date(appt.start_time).toLocaleString('es-EC', { month: 'short' })}</span>
                                <span className="text-xl font-bold">{new Date(appt.start_time).getDate()}</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-slate-800">{appt.title}</h4>
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(appt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {appt.location || 'Showroom'}</span>
                                </div>
                            </div>
                            <div className="self-center">
                                <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-wider ${appt.status === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                                    appt.status === 'completada' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {appt.status}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-5 bg-white border-t border-slate-200 shadow-up z-20">
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center gap-2">
                    <Calendar className="h-3 w-3" /> Nueva Cita
                </h4>
                <form onSubmit={handleSubmitAppointment} className="space-y-3">
                    <Input
                        placeholder="Título (Ej: Visita Showroom)"
                        value={apptTitle}
                        onChange={(e) => setApptTitle(e.target.value)}
                        className="bg-slate-50 border-slate-200 focus:bg-white"
                    />
                    <div className="flex gap-3">
                        <Input
                            type="date"
                            value={apptDate}
                            onChange={(e) => setApptDate(e.target.value)}
                            className="bg-slate-50 border-slate-200 focus:bg-white"
                            min={new Date().toISOString().split('T')[0]}
                        />
                        <Input
                            type="time"
                            value={apptTime}
                            onChange={(e) => setApptTime(e.target.value)}
                            className="bg-slate-50 border-slate-200 focus:bg-white"
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={isSubmittingAppt || !apptTitle || !apptDate || !apptTime}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white h-10 rounded-lg shadow-sm mt-1"
                    >
                        {isSubmittingAppt ? "Agendando..." : "Agendar Cita"}
                    </Button>
                </form>
            </div>
        </>
    );
}