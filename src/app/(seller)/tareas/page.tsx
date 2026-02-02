"use client";

import { useTodos } from "@/hooks/useTodos";
import { TodoInput, TodoItem, TodoFilters } from "@/components/features/todo/TodoComponents";
import { CheckCircle2, Layout, ShieldCheck } from "lucide-react";

export default function TasksPage() {
    const { 
        tasks, 
        vendedores, 
        isAdmin,    
        isLoading, 
        addTask, 
        updateTask,  // <--- Importamos la nueva función de edición
        toggleTask, 
        deleteTask, 
        filter, 
        setFilter, 
        stats 
    } = useTodos();

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
            <div className="max-w-3xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <Layout className="text-blue-600" />
                            Mis Tareas
                            {isAdmin && (
                                <span className="flex items-center gap-1 bg-blue-100 text-blue-700 text-[10px] uppercase px-2 py-1 rounded-md font-black tracking-wider shadow-sm">
                                    <ShieldCheck size={12} />
                                    Admin
                                </span>
                            )}
                        </h1>
                        <p className="text-slate-500 mt-2">
                            Gestiona tus pendientes diarios y seguimiento de ventas.
                        </p>
                    </div>
                    
                    {/* Resumen rápido */}
                    <div className="hidden md:flex gap-4">
                        <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <span className="font-bold text-lg">{stats.pending}</span>
                            </div>
                            <div className="text-sm">
                                <p className="text-slate-500 font-medium">Pendientes</p>
                                <p className="text-slate-900 font-bold">Por hacer</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Área Principal */}
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
                    
                    {/* Input para nueva tarea */}
                    <TodoInput 
                        onAdd={addTask} 
                        vendedores={vendedores} 
                        isAdmin={isAdmin} 
                    />

                    {/* Filtros */}
                    <TodoFilters 
                        currentFilter={filter} 
                        onFilterChange={setFilter} 
                        stats={stats}
                    />

                    {/* Lista de Tareas */}
                    <div className="space-y-3">
                        {isLoading ? (
                            // Skeleton Loading
                            [1, 2, 3].map((i) => (
                                <div key={i} className="h-16 bg-white rounded-xl border border-slate-100 animate-pulse" />
                            ))
                        ) : tasks.length > 0 ? (
                            tasks.map((task) => (
                                <TodoItem
                                    key={task.id}
                                    task={task}
                                    onToggle={toggleTask}
                                    onDelete={deleteTask}
                                    onUpdate={updateTask} // <--- Pasamos la prop de actualización al Item
                                />
                            ))
                        ) : (
                            // Estado Vacío
                            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                                <div className="mx-auto h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="h-8 w-8 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900">
                                    {filter === 'completed' ? 'No tienes tareas completadas aún' : 'Todo está limpio por aquí'}
                                </h3>
                                <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                                    {filter === 'completed' 
                                        ? 'Completa algunas tareas para verlas aquí.' 
                                        : 'Agrega una nueva tarea arriba para comenzar tu día.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}