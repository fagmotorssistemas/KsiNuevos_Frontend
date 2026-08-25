import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
    fetchCallRequests,
    markCallRequestManaged,
    postponeCallRequest,
} from "@/services/leads.service";
import type { LeadCallRequest } from "@/types/leads.types";

const POLL_MS = 20_000;

function isDue(lead: LeadCallRequest, nowMs: number) {
    if (!lead.llamada_posponer_hasta) return true;
    return new Date(lead.llamada_posponer_hasta).getTime() <= nowMs;
}

export function useLeadCallRequests() {
    const { supabase, user, profile, isLoading: isAuthLoading, isAdminLike } = useAuth();
    const [leads, setLeads] = useState<LeadCallRequest[]>([]);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [submitting, setSubmitting] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const assignedScope = useMemo(() => {
        const role = (profile?.role || "").toLowerCase().trim();
        if (!isAdminLike && role === "vendedor" && user?.id) return user.id;
        return "all" as const;
    }, [profile?.role, user?.id, isAdminLike]);

    const load = useCallback(async () => {
        if (!user) return;
        const rows = await fetchCallRequests(supabase, assignedScope);
        setLeads(rows);
        setNowMs(Date.now());
    }, [assignedScope, supabase, user]);

    useEffect(() => {
        if (isAuthLoading || !user) return;
        void load();
    }, [isAuthLoading, load, user]);

    useEffect(() => {
        if (!user) return;
        const interval = window.setInterval(() => void load(), POLL_MS);
        return () => window.clearInterval(interval);
    }, [load, user]);

    useEffect(() => {
        if (!user) return;

        const scheduleReload = () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                void load();
            }, 400);
        };

        const channel = supabase
            .channel("lead-call-requests")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "leads" },
                scheduleReload
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [load, supabase, user]);

    const dueLeads = useMemo(
        () => leads.filter((lead) => isDue(lead, nowMs)),
        [leads, nowMs]
    );

    const nextDueAt = useMemo(() => {
        const future = leads
            .map((lead) =>
                lead.llamada_posponer_hasta
                    ? new Date(lead.llamada_posponer_hasta).getTime()
                    : NaN
            )
            .filter((ms) => Number.isFinite(ms) && ms > nowMs)
            .sort((a, b) => a - b);
        return future[0] ?? null;
    }, [leads, nowMs]);

    useEffect(() => {
        if (nextDueAt == null) return;
        const wait = Math.max(1000, nextDueAt - Date.now() + 400);
        const timer = window.setTimeout(() => {
            setNowMs(Date.now());
            void load();
        }, wait);
        return () => window.clearTimeout(timer);
    }, [load, nextDueAt]);

    const current = dueLeads[0] ?? null;

    const markManaged = useCallback(async () => {
        if (!current || !user || submitting) return;
        setSubmitting(true);
        try {
            await markCallRequestManaged(supabase, current, user.id);
            await load();
        } finally {
            setSubmitting(false);
        }
    }, [current, load, submitting, supabase, user]);

    const postpone = useCallback(
        async (reason: string, untilIso: string) => {
            if (!current || !user || submitting) return;
            setSubmitting(true);
            try {
                await postponeCallRequest(supabase, current, {
                    reason,
                    untilIso,
                    createdBy: user.id,
                });
                await load();
            } finally {
                setSubmitting(false);
            }
        },
        [current, load, submitting, supabase, user]
    );

    return {
        current,
        remaining: dueLeads.length,
        submitting,
        markManaged,
        postpone,
    };
}
