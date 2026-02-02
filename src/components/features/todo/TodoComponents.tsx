import { useState } from "react";
import { Check, Trash2, Plus, Calendar, Clock, AlertCircle, UserPlus, Pencil, Save, X, ShieldCheck } from "lucide-react";
import type { Task, TodoFilter, Vendedor } from "@/hooks/useTodos";

// --- COMPONENTE: MODAL DE EDICIÓN ---
interface EditTaskModalProps {
    task: Task;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: number, updates: Partial<Task>) => void;
}

function EditTaskModal({ task, isOpen, onClose, onSave }: EditTaskModalProps) {
    const [title, setTitle] = useState(task.title);
    const [priority, setPriority] = useState<Task['priority']>(task.priority);
    const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 16) : "");

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(task.id, {
            title,
            priority,
            due_date: dueDate ? new Date(dueDate).toISOString() : null
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Pencil size={18} className="text-blue-600" />
                        Editar Tarea
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Título de la tarea</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-700"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Prioridad</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                                className="w-full px-3 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-blue-500 transition-all cursor-pointer"
                            >
                                <option value="baja">Baja</option>
                                <option value="media">Media</option>
                                <option value="alta">Alta</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Vencimiento</label>
                            <input
                                type="datetime-local"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-3 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95">
                            <Save size={18} /> Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- COMPONENTE 1: INPUT PARA NUEVA TAREA ---
interface TodoInputProps {
    onAdd: (title: string, priority: Task['priority'], dueDate: string | null, assignedUserId: string | null) => void;
    vendedores: Vendedor[];
    isAdmin: boolean;
}

export function TodoInput({ onAdd, vendedores, isAdmin }: TodoInputProps) {
    const [title, setTitle] = useState("");
    const [priority, setPriority] = useState<Task['priority']>('media');
    const [dueDate, setDueDate] = useState(""); 
    const [assignedUserId, setAssignedUserId] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        const finalDate = dueDate ? new Date(dueDate).toISOString() : null;
        onAdd(title, priority, finalDate, assignedUserId || null);
        setTitle("");
        setPriority('media');
        setDueDate(""); 
        setAssignedUserId("");
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col gap-3">
                <div className="flex-1">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="¿Qué tienes pendiente hoy?"
                        className="w-full pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400"
                    />
                </div>
                
                <div className="flex flex-col lg:flex-row gap-2 justify-between">
                    <div className="flex flex-wrap gap-2 flex-1">
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as Task['priority'])}
                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:border-slate-300 cursor-pointer"
                        >
                            <option value="baja">Baja</option>
                            <option value="media">Media</option>
                            <option value="alta">Alta</option>
                        </select>

                        <div className="relative flex-1 min-w-[180px] max-w-[220px]">
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

                        {isAdmin && (
                            <div className="relative flex-1 min-w-[180px] max-w-[220px]">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-500">
                                    <UserPlus size={16} />
                                </div>
                                <select
                                    value={assignedUserId}
                                    onChange={(e) => setAssignedUserId(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 bg-blue-50/50 border border-blue-100 rounded-xl text-sm font-medium text-blue-700 focus:outline-none focus:border-blue-300 cursor-pointer appearance-none"
                                >
                                    <option value="">Asignar a mí</option>
                                    {vendedores.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.full_name} {v.role === 'admin' ? '(Admin)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!title.trim()}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 lg:w-auto w-full"
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
    onUpdate: (id: number, updates: Partial<Task>) => void;
}

export function TodoItem({ task, onToggle, onDelete, onUpdate }: TodoItemProps) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // LÓGICA CLAVE: Si created_by existe y es distinto al dueño de la tarea (user_id), fue asignada.
    const isAssignedByOther = task.created_by && task.created_by !== task.user_id;

    const priorityColors = {
        baja: "bg-slate-100 text-slate-600 border-slate-200",
        media: "bg-blue-50 text-blue-600 border-blue-100",
        alta: "bg-orange-50 text-orange-600 border-orange-100"
    };

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
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.is_completed;

    return (
        <>
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
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${priorityColors[task.priority]}`}>
                                {task.priority}
                            </span>

                            <div className="flex items-center gap-2">
                                {deadlineText && (
                                    <span className={`text-[11px] flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                                        isOverdue 
                                            ? "bg-red-50 text-red-600 border-red-100 font-medium" 
                                            : "bg-slate-50 text-slate-500 border-slate-200"
                                    }`}>
                                        <Clock size={10} />
                                        {deadlineText}
                                        {isOverdue && <AlertCircle size={10} />}
                                    </span>
                                )}

                                {/* BADGE DE ASIGNACIÓN IMPLEMENTADO */}
                                {isAssignedByOther && (
                                    <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-md shadow-sm">
                                        <ShieldCheck size={10} strokeWidth={3} className="text-amber-600" />
                                        Asignada por Admin
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Editar tarea"
                    >
                        <Pencil size={16} />
                    </button>

                    <button
                        onClick={() => onDelete(task.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar tarea"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <EditTaskModal 
                task={task}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={onUpdate}
            />
        </>
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