import { DynamicStaffSidebar } from '@/components/layout/DynamicStaffSidebar'

export default function SolicitudesDesarrolloLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <DynamicStaffSidebar />
      <main className="flex-1 flex flex-col h-full w-full relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 w-full">
          <div className="max-w-7xl mx-auto h-full">{children}</div>
        </div>
      </main>
    </div>
  )
}
