"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, FolderOpen } from "lucide-react";
import { CreateCaseForm } from "@/components/features/accounting/wallet/CreateCaseForm";

export default function NewLegalCasePage() {
  const router = useRouter();

  const [idSistema, setIdSistema] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);

  const onContinue = () => {
    const id = Number(idSistema);
    if (!Number.isFinite(id) || id <= 0) {
      alert("id_sistema inválido");
      return;
    }
    setClientId(id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/legal/cases"
            className="h-10 w-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition flex items-center justify-center"
            title="Volver"
          >
            <ArrowLeft className="h-4 w-4 text-slate-700" />
          </Link>
          <div>
            <div className="text-xs text-slate-500 font-mono">LEGAL</div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nuevo caso</h1>
          </div>
        </div>
      </div>

      {clientId === null ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <FolderOpen className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900">Selecciona el cliente (Oracle)</h2>
              <p className="text-sm text-slate-500 mt-1">
                Aquí solo necesitamos el <span className="font-mono">id_sistema</span>. El resto de datos vive en Oracle.
              </p>
            </div>
          </div>

          <div className="mt-6 max-w-md">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">id_sistema</label>
            <input
              value={idSistema}
              onChange={(e) => setIdSistema(e.target.value)}
              placeholder="Ej: 323"
              className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-mono transition"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              onClick={onContinue}
              className="h-11 px-6 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition text-sm font-bold flex items-center gap-2"
            >
              Continuar
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <CreateCaseForm
          source="oracle"
          clientId={clientId}
          onCancel={() => setClientId(null)}
          onSuccess={() => router.replace("/legal/cases")}
        />
      )}
    </div>
  );
}

