export function TimelineBadge({ label, value, icon: Icon, accent = false }: {
    label: string;
    value: string;
    icon: React.ElementType;
    accent?: boolean;
}) {
    return (
        <li className="flex items-start gap-3">
            <div className={`mt-0.5 p-1.5 rounded-md shrink-0 ${accent ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-500'}`}>
                <Icon className="h-3 w-3" />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
                <span className="text-xs font-semibold text-zinc-900 mt-0.5">{value}</span>
            </div>
        </li>
    );
}