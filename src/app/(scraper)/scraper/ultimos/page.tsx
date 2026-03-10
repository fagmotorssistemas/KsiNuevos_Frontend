"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ScraperUltimosRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/scraper/todo");
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] bg-slate-50 text-slate-600">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Redirigiendo a todo el inventario...</p>
        </div>
    );
}
