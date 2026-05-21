"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  Clock,
  Phone,
  MessageCircle,
  User,
  FileText,
  Loader2,
  Send,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/buttontable";
import {
  showroomService,
  GESTION_TYPE_OPTIONS,
  type GestionType,
} from "@/services/showroom.service";
import type { ShowroomVisit, ShowroomVisitGestion } from "../constants";

interface VisitGestionTabProps {
  visit: ShowroomVisit;
  onGestionAdded?: (gestion: ShowroomVisitGestion) => void;
}

function getGestionIcon(type: string) {
  switch (type) {
    case "llamada":
      return <Phone className="h-4 w-4 text-blue-500" />;
    case "whatsapp":
      return <MessageCircle className="h-4 w-4 text-green-500" />;
    case "visita":
      return <User className="h-4 w-4 text-purple-500" />;
    case "seguimiento":
      return <ClipboardList className="h-4 w-4 text-amber-600" />;
    default:
      return <FileText className="h-4 w-4 text-slate-500" />;
  }
}

export function VisitGestionTab({ visit, onGestionAdded }: VisitGestionTabProps) {
  const { user } = useAuth();
  const [gestiones, setGestiones] = useState<ShowroomVisitGestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [note, setNote] = useState("");
  const [gestionType, setGestionType] = useState<GestionType>("nota");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    showroomService
      .fetchGestiones(visit.id)
      .then((data) => {
        if (!cancelled) setGestiones(data);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visit.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const created = await showroomService.addGestion({
        visitId: visit.id,
        authorId: user.id,
        type: gestionType,
        content: note,
      });
      setGestiones((prev) => [created, ...prev]);
      setNote("");
      onGestionAdded?.(created);
    } catch (err) {
      console.error("Error guardando gestión:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : gestiones.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
            <Clock className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Sin gestiones registradas.</p>
            <p className="text-xs mt-1">Agrega la primera nota de seguimiento abajo.</p>
          </div>
        ) : (
          gestiones.map((g) => (
            <div key={g.id} className="flex gap-4">
              <div className="flex flex-col items-center pt-1">
                <div className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-200 z-10">
                  {getGestionIcon(g.type)}
                </div>
                <div className="w-0.5 h-full bg-slate-200 -mb-6 mt-2" />
              </div>
              <div className="flex-1 pb-2">
                <div className="flex flex-wrap justify-between items-center gap-1 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-slate-600">
                      {g.type}
                    </span>
                    {g.profiles?.full_name && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {g.profiles.full_name}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(g.created_at).toLocaleString("es-EC")}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 p-3 rounded-xl text-sm text-slate-700 shadow-sm">
                  {g.content}
                </div>
                {g.result && (
                  <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium uppercase">
                    {g.result.replace(/_/g, " ")}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200 shrink-0">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {GESTION_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGestionType(opt.value)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all whitespace-nowrap ${
                  gestionType === opt.value
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Escribe el seguimiento de esta visita..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !note.trim()}
              className="shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
