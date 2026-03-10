"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ScraperRootPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/scraper/todo");
    }, [router]);
    return (
        <div className="flex items-center justify-center min-h-[40vh]">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
}
