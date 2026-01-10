import { useState } from "react";
import { Check, Trash2, Plus, Calendar, Clock, AlertCircle } from "lucide-react";
import type { Task, TodoFilter } from "@/hooks/useTodos";

// --- COMPONENTE 1: INPUT PARA NUEVA TAREA ---
interface TodoInputProps {
    // Actualizamos la firma para aceptar la fecha
    onAdd: (title: string, priority: Task['priority'], dueDate: string | null) => void;
}

export function TodoInput({ onAdd }: TodoInputProps) {
    const [title, setTitle] = useState("");
    const [priority, setPriority] = useState<Task['priority']>('media');
    const [dueDate, setDueDate] = useState(""); // Estado para el input de fecha

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        
        // Convertimos el valor del input a ISO string si existe, o enviamos null
        const finalDate = dueDate ? new Date(dueDate).toISOString() : null;

        onAdd(title, priority, finalDate);
        
        // Limpiamos el formulario
        setTitle("");
        setPriority('media');
        setDueDate(""); 
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col gap-3">
                {/* Input de Título */}
                <div className="flex-1">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="¿Qué tienes pendiente hoy?"
                        className="w-full pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400"
                    />
                </div>
                
                {/* Controles Inferiores */}
                <div className="flex flex-col sm:flex-row gap-2 justify-between">
                    <div className="flex gap-2 flex-1">
                        {/* Selector de Prioridad */}
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as Task['priority'])}
                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:border-slate-300 cursor-pointer"
                        >
                            <option value="baja">Baja</option>
                            <option value="media">Media</option>
                            <option value="alta">Alta</option>
                        </select>

                        {/* Selector de Fecha y Hora */}
                        <div className="relative flex-1 sm:max-w-[220px]">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Calendar size={16} />
                            </div>
                            <input 
                                type="datetime-local"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-slate-300"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!title.trim()}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 sm:w-auto w-full"
                    >
                        <Plus size={18} />
                        <span>Agregar</span>
                    </button>
                </div>
            </div>
        </form>
    );
}

// --- COMPONENTE 2: ITEM DE LA LISTA ---
interface TodoItemProps {
    task: Task;
    onToggle: (id: number, status: boolean) => void;
    onDelete: (id: number) => void;
}

export function TodoItem({ task, onToggle, onDelete }: TodoItemProps) {
    const priorityColors = {
        baja: "bg-slate-100 text-slate-600 border-slate-200",
        media: "bg-blue-50 text-blue-600 border-blue-100",
        alta: "bg-orange-50 text-orange-600 border-orange-100"
    };

    // Función auxiliar para formatear fecha bonita
    const formatDeadline = (dateString: string | null) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('es-ES', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        }).format(date);
    };

    const deadlineText = formatDeadline(task.due_date);
    // Verificamos si la tarea está vencida (solo si no está completada)
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.is_completed;

    return (
        <div className={`group flex items-center justify-between p-4 bg-white border rounded-xl hover:shadow-md transition-all duration-300 ${
            task.is_completed ? 'opacity-60 bg-slate-50 border-slate-100' : 'border-slate-100'
        }`}>
            <div className="flex items-center gap-4 flex-1">
                <button
                    onClick={() => onToggle(task.id, task.is_completed)}
                    className={`flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        task.is_completed 
                            ? "bg-green-500 border-green-500" 
                            : "border-slate-300 hover:border-blue-400"
                    }`}
                >
                    {task.is_completed && <Check size={14} className="text-white" strokeWidth={3} />}
                </button>

                <div className="flex flex-col gap-1 w-full">
                    <span className={`text-sm font-medium transition-all ${
                        task.is_completed ? "text-slate-400 line-through" : "text-slate-700"
                    }`}>
                        {task.title}
                    </span>
                    
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Badge de Prioridad */}
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${priorityColors[task.priority]}`}>
                            {task.priority}
                        </span>

                        {/* Badge de Fecha Límite */}
                        {deadlineText && (
                            <span className={`text-[11px] flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                                isOverdue 
                                    ? "bg-red-50 text-red-600 border-red-100 font-medium" // Estilo rojo si venció
                                    : "bg-slate-50 text-slate-500 border-slate-200"
                            }`}>
                                <Clock size={10} />
                                {deadlineText}
                                {isOverdue && <AlertCircle size={10} />}
                            </span>
                        )}

                        {/* Fecha de creación (se oculta en móviles si ya hay fecha límite para no saturar) */}
                        {!deadlineText && (
                            <span className="text-[10px] text-slate-400 hidden sm:inline-block">
                                {new Date(task.created_at).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <button
                onClick={() => onDelete(task.id)}
                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Eliminar tarea"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}

// --- COMPONENTE 3: FILTROS Y ESTADÍSTICAS ---
interface TodoFiltersProps {
    currentFilter: TodoFilter;
    onFilterChange: (filter: TodoFilter) => void;
    stats: { total: number; pending: number; completed: number };
}

export function TodoFilters({ currentFilter, onFilterChange, stats }: TodoFiltersProps) {
    const filters: { key: TodoFilter; label: string; count: number }[] = [
        { key: 'pending', label: 'Pendientes', count: stats.pending },
        { key: 'completed', label: 'Completadas', count: stats.completed },
        { key: 'all', label: 'Historial', count: stats.total },
    ];

    return (
        <div className="flex flex-wrap gap-2 mb-4">
            {filters.map((f) => (
                <button
                    key={f.key}
                    onClick={() => onFilterChange(f.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        currentFilter === f.key
                            ? "bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-200"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                >
                    {f.label} <span className="ml-1 opacity-60 text-xs">({f.count})</span>
                </button>
            ))}
        </div>
    );
}