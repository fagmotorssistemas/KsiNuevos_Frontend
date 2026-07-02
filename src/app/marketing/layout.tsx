import { MarketingSidebar } from '@/components/layout/marketing-sidebar';
import { MarketingRoleGuard } from '@/components/layout/MarketingRoleGuard';

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <MarketingRoleGuard>
            <div className="flex h-[calc(100dvh-4rem)] bg-gray-50 overflow-hidden" data-marketing-shell>
                <MarketingSidebar />
                <main className="flex-1 flex flex-col min-h-0 w-full relative">
                    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-4 md:px-6 py-4 md:py-6 pt-20 md:pt-6 w-full">
                        <div className="max-w-[1800px] mx-auto w-full">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </MarketingRoleGuard>
    );
}
