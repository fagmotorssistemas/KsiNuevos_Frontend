import { Suspense } from "react";
import LeadsPageClient from "./LeadsPageClient";

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-sm">Cargando leads...</div>}>
      <LeadsPageClient />
    </Suspense>
  );
}