import type { AppointmentWithDetails } from "@/hooks/useAgenda";
import type { VisitSource } from "./constants";

export const SHOWROOM_VISIT_PREFILL_KEY = "ksi:showroom-visit-prefill";

export type ShowroomVisitPrefill = {
    appointmentId: number;
    client_name: string;
    phone: string;
    source: VisitSource;
    inventoryoracle_id: string;
    vehicle_label: string;
    manual_vehicle: string;
    observation: string;
};

const VEHICLE_NOTE_MARKER_RE = /\[vehículo:([0-9a-f-]{36})\]/i;

function parseInventoryIdFromNotes(notes: string | null | undefined): string | null {
    return notes?.match(VEHICLE_NOTE_MARKER_RE)?.[1] ?? null;
}

function cleanAppointmentNotes(notes: string | null | undefined): string {
    if (!notes) return "";
    return notes
        .split("\n")
        .filter(
            (line) =>
                !VEHICLE_NOTE_MARKER_RE.test(line) &&
                !line.trim().startsWith("Vehículo de interés:")
        )
        .join("\n")
        .trim();
}

export function buildShowroomPrefillFromAppointment(
    appointment: AppointmentWithDetails
): ShowroomVisitPrefill {
    const lead = appointment.lead;
    const client_name =
        lead?.name?.trim() ||
        appointment.external_client_name?.trim() ||
        appointment.title.replace(/^Cita con\s+/i, "").trim();

    const phone = lead?.phone?.trim() || "";
    const car = lead?.interested_cars?.[0] as
        | {
              inventory_id?: string | null;
              brand?: string | null;
              model?: string | null;
              year?: number | string | null;
              inventoryoracle?: { id?: string } | { id?: string }[] | null;
          }
        | undefined;

    const inv = Array.isArray(car?.inventoryoracle)
        ? car.inventoryoracle[0]
        : car?.inventoryoracle;
    const inventoryoracle_id =
        car?.inventory_id || inv?.id || parseInventoryIdFromNotes(appointment.notes) || "";

    const vehicle_label = [car?.brand, car?.model, car?.year].filter(Boolean).join(" ").trim();
    const observation = cleanAppointmentNotes(appointment.notes);

    return {
        appointmentId: appointment.id,
        client_name,
        phone,
        source: "cita",
        inventoryoracle_id,
        vehicle_label: inventoryoracle_id ? vehicle_label : "",
        manual_vehicle: !inventoryoracle_id && vehicle_label ? vehicle_label : "",
        observation,
    };
}

export function writeShowroomVisitPrefill(prefill: ShowroomVisitPrefill) {
    try {
        sessionStorage.setItem(SHOWROOM_VISIT_PREFILL_KEY, JSON.stringify(prefill));
    } catch {
        // ignore quota / private mode
    }
}

export function readShowroomVisitPrefill(): ShowroomVisitPrefill | null {
    try {
        const raw = sessionStorage.getItem(SHOWROOM_VISIT_PREFILL_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as ShowroomVisitPrefill;
    } catch {
        return null;
    }
}

export function clearShowroomVisitPrefill() {
    try {
        sessionStorage.removeItem(SHOWROOM_VISIT_PREFILL_KEY);
    } catch {
        // ignore
    }
}
