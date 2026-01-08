export const TeamSection = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
    {[1, 2, 3].map((i) => (
      <div key={i} className="p-6 bg-slate-800 rounded-3xl border border-slate-700 hover:border-red-600 transition-colors text-center">
        <div className="w-30 h-30 mx-auto mb-4 rounded-full overflow-hidden border-2 border-red-600">
          <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200" alt="Team" className="w-full h-full object-cover" />
        </div>
        <h4 className="font-bold text-white">Staff K-si {i}</h4>
        <p className="text-slate-400 text-xs uppercase tracking-tighter">Asesor Comercial</p>
      </div>
    ))}
  </div>
);