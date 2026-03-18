import { AccountingSidebar } from '@/components/layout/accounting-sidebar';
import { LegalRoleGuard } from '@/components/layout/LegalRoleGuard';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <LegalRoleGuard>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <AccountingSidebar />

        <main className="flex-1 flex flex-col h-full w-full relative">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 w-full">
            <div className="max-w-7xl mx-auto h-full">{children}</div>
          </div>
        </main>
      </div>
    </LegalRoleGuard>
  );
}

