import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

export interface Task {
    id: number;
    user_id: string;
    title: string;
    is_completed: boolean;
    priority: 'baja' | 'media' | 'alta';
    due_date: string | null;
    created_at: string;
}

export type TodoFilter = 'all' | 'pending' | 'completed';

export function useTodos() {
    const { supabase, user, isLoading: isAuthLoading } = useAuth();
    
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // CAMBIO: El filtro por defecto ahora es 'pending' (Pendientes)
    const [filter, setFilter] = useState<TodoFilter>('pending');

    // 1. Cargar Tareas
    const fetchTasks = useCallback(async () => {
        if (!user) return;
        
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('is_completed', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error al cargar tareas:", error);
        } else {
            setTasks(data as unknown as Task[]);
        }
        setIsLoading(false);
    }, [supabase, user]);

    useEffect(() => {
        if (!isAuthLoading && user) {
            fetchTasks();
        }
    }, [isAuthLoading, user, fetchTasks]);

    useEffect(() => {
        if (!user) return;
        const channel = supabase
            .channel('realtime tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, 
                () => fetchTasks()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel) };
    }, [supabase, user, fetchTasks]);

    // 2. Crear Tarea
    const addTask = async (title: string, priority: Task['priority'] = 'media') => {
        if (!user || !title.trim()) return;

        // Al crear, forzamos la vista a 'pending' para que el usuario vea su nueva tarea
        setFilter('pending');

        const optimisticTask: Task = {
            id: Date.now(),
            user_id: user.id,
            title,
            priority,
            is_completed: false,
            due_date: null,
            created_at: new Date().toISOString()
        };
        
        setTasks(prev => [optimisticTask, ...prev]);

        const { error } = await supabase
            .from('tasks')
            .insert({
                user_id: user.id,
                title,
                priority,
                is_completed: false
            });

        if (error) {
            console.error("Error creando tarea:", error);
            fetchTasks();
        } else {
            fetchTasks();
        }
    };

    // 3. Toggle Completado
    const toggleTask = async (taskId: number, currentStatus: boolean) => {
        setTasks(prev => prev.map(t => 
            t.id === taskId ? { ...t, is_completed: !currentStatus } : t
        ));

        const { error } = await supabase
            .from('tasks')
            .update({ is_completed: !currentStatus })
            .eq('id', taskId);

        if (error) {
            console.error("Error actualizando tarea:", error);
            fetchTasks();
        }
    };

    // 4. Eliminar Tarea
    const deleteTask = async (taskId: number) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));

        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            console.error("Error eliminando tarea:", error);
            fetchTasks();
        }
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            if (filter === 'pending') return !task.is_completed;
            if (filter === 'completed') return task.is_completed;
            return true;
        });
    }, [tasks, filter]);

    const stats = useMemo(() => ({
        total: tasks.length,
        pending: tasks.filter(t => !t.is_completed).length,
        completed: tasks.filter(t => t.is_completed).length
    }), [tasks]);

    return {
        tasks: filteredTasks,
        isLoading,
        addTask,
        toggleTask,
        deleteTask,
        filter,
        setFilter,
        stats
    };
}