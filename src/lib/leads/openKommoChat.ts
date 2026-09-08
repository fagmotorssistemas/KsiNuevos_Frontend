import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";

const KOMMO_LEAD_DETAIL = "https://marketingfagmotorsurfacom.kommo.com/leads/detail";

export function phoneLast9(phone: string | null | undefined): string {
    return String(phone || "").replace(/\D/g, "").slice(-9);
}

export function kommoLeadChatUrl(leadIdKommo: number | string) {
    return `${KOMMO_LEAD_DETAIL}/${leadIdKommo}`;
}

export function openKommoLeadChat(leadIdKommo: number | string) {
    window.open(kommoLeadChatUrl(leadIdKommo), "_blank", "noopener,noreferrer");
}

type LeadPhoneRow = { phone: string | null; lead_id_kommo: number | null };

/** Formatos habituales en Ecuador para un mismo celular (últimos 9 dígitos). */
function ecuadorPhoneCandidates(last9: string): string[] {
    return [`0${last9}`, `+593${last9}`, `593${last9}`, last9];
}

/** Cruza teléfonos de visitas con leads que sí tienen ID de Kommo. */
export async function mapKommoIdsByPhone(
    supabase: SupabaseClient,
    phones: Array<string | null | undefined>
): Promise<Map<string, number>> {
    const unique = [...new Set(phones.map(phoneLast9).filter((d) => d.length >= 9))];
    const matched = new Map<string, number>();
    if (unique.length === 0) return matched;

    const lookupValues = [...new Set(unique.flatMap(ecuadorPhoneCandidates))];
    const chunkSize = 80;
    const chunks: string[][] = [];
    for (let i = 0; i < lookupValues.length; i += chunkSize) {
        chunks.push(lookupValues.slice(i, i + chunkSize));
    }

    const concurrency = 6;
    for (let i = 0; i < chunks.length; i += concurrency) {
        const batch = chunks.slice(i, i + concurrency);
        const results = await Promise.all(
            batch.map(async (chunk) => {
                const { data, error } = await supabase
                    .from("leads")
                    .select("phone, lead_id_kommo")
                    .in("phone", chunk)
                    .not("lead_id_kommo", "is", null);

                if (error) {
                    console.error("Error cruzando teléfonos con Kommo:", error);
                    return [] as LeadPhoneRow[];
                }
                return (data ?? []) as LeadPhoneRow[];
            })
        );

        for (const rows of results) {
            for (const row of rows) {
                const key = phoneLast9(row.phone);
                if (key.length >= 9 && row.lead_id_kommo && !matched.has(key)) {
                    matched.set(key, row.lead_id_kommo);
                }
            }
        }

        if (matched.size >= unique.length) break;
    }

    return matched;
}

/** Busca el lead por los últimos 9 dígitos del teléfono y abre el chat en Kommo. */
export async function openKommoChatByPhone(
    supabase: SupabaseClient,
    phone: string | null | undefined,
    knownKommoId?: number | null
) {
    if (knownKommoId) {
        openKommoLeadChat(knownKommoId);
        return;
    }

    const last9 = phoneLast9(phone);
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
        (row) => phoneLast9(row.phone) === last9 && row.lead_id_kommo
    );

    if (!match?.lead_id_kommo) {
        toast.error("No hay un lead de Kommo con este teléfono.");
        return;
    }

    openKommoLeadChat(match.lead_id_kommo);
}
