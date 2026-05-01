import { MarketingSidebar } from '@/components/layout/marketing-sidebar';
import { MarketingRoleGuard } from '@/components/layout/MarketingRoleGuard';
import { MarketingTopNav } from '@/components/marketing/MarketingTopNav';

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <MarketingRoleGuard>
            <div className="flex h-screen bg-gray-50 overflow-hidden">
                <MarketingSidebar />
                <main className="flex-1 flex flex-col h-full w-full relative">
                    <div className="print:hidden">
                        <MarketingTopNav />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-24 md:pt-10 w-full">
                        <div className="max-w-7xl mx-auto h-full">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </MarketingRoleGuard>
    );
}
