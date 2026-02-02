import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

export interface Task {
    id: number;
    user_id: string;
    title: string;
    is_completed: boolean;
    priority: 'baja' | 'media' | 'alta';
    due_date: string | null;
    created_by: string;
    created_at: string;
}

export interface Vendedor {
    id: string;
    full_name: string;
    role: string;
}

export type TodoFilter = 'all' | 'pending' | 'completed';

export function useTodos() {
    const { supabase, user, isLoading: isAuthLoading } = useAuth();
    
    const [tasks, setTasks] = useState<Task[]>([]);
    const [vendedores, setVendedores] = useState<Vendedor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    
    const [filter, setFilter] = useState<TodoFilter>('pending');

    // 1. Cargar Tareas del usuario actual
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

    // 2. Cargar lista de vendedores y verificar si el usuario es Admin
    const fetchUserRoleAndVendedores = useCallback(async () => {
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const userIsAdmin = profile?.role === 'admin';
        setIsAdmin(userIsAdmin);

        if (userIsAdmin) {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .eq('role', 'vendedor')
                .order('full_name', { ascending: true });
            
            if (!error) setVendedores(data as Vendedor[]);
        }
    }, [supabase, user]);

    // Efecto para carga inicial
    useEffect(() => {
        if (!isAuthLoading && user) {
            fetchTasks();
            fetchUserRoleAndVendedores();
        }
    }, [isAuthLoading, user, fetchTasks, fetchUserRoleAndVendedores]);

    // Suscripción a cambios en tiempo real
    useEffect(() => {
        if (!user) return;
        const channel = supabase
            .channel('realtime tasks')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'tasks', 
                filter: `user_id=eq.${user.id}` 
            }, () => fetchTasks())
            .subscribe();

        return () => { supabase.removeChannel(channel) };
    }, [supabase, user, fetchTasks]);

    // 3. Crear Tarea (Implementación con created_by para asignaciones)
    const addTask = async (
        title: string, 
        priority: Task['priority'] = 'media', 
        dueDate: string | null = null,
        assignedUserId: string | null = null
    ) => {
        if (!user || !title.trim()) return;

        const targetUserId = assignedUserId || user.id;
        setFilter('pending');

        // Actualización optimista local si el usuario se asigna la tarea a sí mismo
        if (targetUserId === user.id) {
            const optimisticTask: Task = {
                id: Date.now(),
                user_id: user.id,
                created_by: user.id,
                title,
                priority,
                is_completed: false,
                due_date: dueDate,
                created_at: new Date().toISOString()
            };
            setTasks(prev => [optimisticTask, ...prev]);
        }

        // Inserción en Supabase guardando quién crea la tarea (created_by)
        const { error } = await supabase
            .from('tasks')
            .insert({
                user_id: targetUserId,
                title,
                priority,
                is_completed: false,
                due_date: dueDate,
                created_by: user.id // <--- ID del administrador que asigna la tarea
            });

        if (error) {
            console.error("Error creando tarea:", error);
        }
        fetchTasks();
    };

    // 4. Actualizar Tarea (Edición de título, prioridad o fecha)
    const updateTask = async (
        taskId: number, 
        updates: { title?: string; priority?: Task['priority']; due_date?: string | null }
    ) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

        const { error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', taskId);

        if (error) {
            console.error("Error al actualizar tarea:", error);
            fetchTasks();
        }
    };

    // 5. Alternar estado completado
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

    // 6. Eliminar Tarea
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

    // Memoized filters and stats
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
        vendedores,
        isAdmin,
        isLoading,
        addTask,
        updateTask,
        toggleTask,
        deleteTask,
        filter,
        setFilter,
        stats
    };
}