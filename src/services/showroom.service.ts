import { createClient } from "@/lib/supabase/client";
import type { ShowroomVisit, ShowroomVisitGestion } from "@/components/features/showroom/constants";

const supabase = createClient();

export type GestionType = "llamada" | "whatsapp" | "nota" | "visita" | "seguimiento";

export const GESTION_TYPE_OPTIONS: { value: GestionType; label: string }[] = [
  { value: "llamada", label: "Llamada" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "nota", label: "Nota" },
  { value: "visita", label: "Visita" },
  { value: "seguimiento", label: "Seguimiento" },
];

export const showroomService = {
  async fetchGestiones(visitId: number): Promise<ShowroomVisitGestion[]> {
    const { data, error } = await supabase
      .from("showroom_visit_gestiones")
      .select("*, profiles:author_id(full_name)")
      .eq("visit_id", visitId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as ShowroomVisitGestion[];
  },

  async addGestion(params: {
    visitId: number;
    authorId: string;
    type: GestionType;
    content: string;
    result?: string | null;
  }): Promise<ShowroomVisitGestion> {
    const { data, error } = await supabase
      .from("showroom_visit_gestiones")
      .insert({
        visit_id: params.visitId,
        author_id: params.authorId,
        type: params.type,
        content: params.content.trim(),
        result: params.result ?? null,
      })
      .select("*, profiles:author_id(full_name)")
      .single();

    if (error) throw error;
    return data as ShowroomVisitGestion;
  },

  async updateVisitFields(
    visitId: number,
    fields: Partial<Pick<ShowroomVisit, "credit_status" | "observation" | "visit_end">>
  ): Promise<void> {
    const { error } = await supabase
      .from("showroom_visits")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", visitId);

    if (error) throw error;
  },
};
