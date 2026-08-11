import { DynamicStaffSidebar } from '@/components/layout/DynamicStaffSidebar';
import { Suspense } from "react";

export default function SharedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden print:h-auto print:overflow-visible print:block">
            <div className="print:hidden">
                <Suspense fallback={null}>
                    <DynamicStaffSidebar />
                </Suspense>
            </div>

            <main className="flex-1 flex flex-col h-full w-full relative print:h-auto print:block">
                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 w-full print:overflow-visible print:h-auto print:p-0">
                    <div className="max-w-7xl mx-auto h-full print:h-auto print:w-full print:max-w-none">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}