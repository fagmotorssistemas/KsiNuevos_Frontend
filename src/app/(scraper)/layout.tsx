import React from 'react';
import { ScraperSidebar } from '@/components/layout/scraper-sidebar';

export default function ScraperLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-slate-50 overflow-x-hidden">
            <ScraperSidebar />
            <main className="flex-1 flex flex-col h-full w-full relative">
                <div
                    className="flex-1 overflow-y-auto p-4 md:p-6 pt-20 md:pt-6 w-full"
                >
                    <div className="max-w-6xl mx-auto h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
