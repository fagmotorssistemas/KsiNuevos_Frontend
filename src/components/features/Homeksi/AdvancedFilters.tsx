// AdvancedFilters.tsx
export const AdvancedFilters = () => (
  <div className="bg-white border border-slate-100 shadow-2xl rounded-3xl p-6 flex flex-wrap items-center justify-center gap-4">
    <span className="text-sm font-bold text-slate-400 uppercase mr-4 text-center w-full md:w-auto">Filtros rápidos:</span>
    {['Marca', 'Año', 'Combustible', 'Precio'].map((f) => (
      <button key={f} className="px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-full text-sm font-medium hover:border-red-500 transition-all">
        {f} ↓
      </button>
    ))}
  </div>
);