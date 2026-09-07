import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";

const KOMMO_LEAD_DETAIL = "https://marketingfagmotorsurfacom.kommo.com/leads/detail";

export function kommoLeadChatUrl(leadIdKommo: number | string) {
    return `${KOMMO_LEAD_DETAIL}/${leadIdKommo}`;
}

export function openKommoLeadChat(leadIdKommo: number | string) {
    window.open(kommoLeadChatUrl(leadIdKommo), "_blank", "noopener,noreferrer");
}

/** Busca el lead por los últimos 9 dígitos del teléfono y abre el chat en Kommo. */
export async function openKommoChatByPhone(
    supabase: SupabaseClient,
    phone: string | null | undefined
) {
    const last9 = String(phone || "").replace(/\D/g, "").slice(-9);
    if (last9.length < 9) {
        toast.error("Esta visita no tiene un teléfono válido para abrir Kommo.");
        return;
    }

    const { data, error } = await supabase
        .from("leads")
        .select("lead_id_kommo, phone")
        .ilike("phone", `%${last9}%`)
        .limit(8);

    if (error) {
        toast.error("No se pudo buscar el lead en Kommo.");
        return;
    }

    const match = data?.find(
        (row) => String(row.phone || "").replace(/\D/g, "").slice(-9) === last9 && row.lead_id_kommo
    );

    if (!match?.lead_id_kommo) {
        toast.error("No hay un lead de Kommo con este teléfono.");
        return;
    }

    openKommoLeadChat(match.lead_id_kommo);
}
