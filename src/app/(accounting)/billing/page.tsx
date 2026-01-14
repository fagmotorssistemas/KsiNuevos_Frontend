"use client";

import React, { useState, useEffect } from 'react';
import { Construction, ArrowLeft, Terminal, Hammer, AlertTriangle, Code2 } from 'lucide-react';

export default function DevelopmentPage() {
    const [dots, setDots] = useState('');
    const [mounted, setMounted] = useState(false);

    // Efecto de montaje para animaciones suaves de entrada
    useEffect(() => {
        setMounted(true);
    }, []);

    // Animación de puntos suspensivos
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length < 3 ? prev + '.' : '');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className=" text-neutral-900 font-sans selection:bg-red-100 selection:text-red-900 flex flex-col relative overflow-hidden">

            {/* Background Gradients & Noise Texture Overlay (Simulated) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>

            {/* Decorative Blobs */}
            {/* <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-neutral-200/50 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-red-100/40 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" /> */}

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 w-full text-center relative">

                {/* Central Card */}
                <div className={`transition-all duration-1000 ease-out transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>

                    {/* Animated Icon Container */}
                    <div className="relative mb-10 mx-auto w-32 h-32">
                        {/* Rotating Rings */}
                        <div className="absolute inset-0 border-2 border-dashed border-neutral-300 rounded-full animate-[spin_10s_linear_infinite]" />
                        <div className="absolute inset-2 border border-neutral-200 rounded-full animate-[spin_15s_linear_infinite_reverse]" />

                        {/* Center Icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative bg-neutral-900 w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl rotate-6 hover:rotate-0 transition-transform duration-500 cursor-default group">
                                <Hammer className="text-white w-8 h-8 group-hover:scale-110 transition-transform" />
                                <div className="absolute -top-2 -right-2 bg-red-600 w-6 h-6 rounded flex items-center justify-center shadow-lg animate-bounce">
                                    <Construction className="text-white w-3 h-3" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Typography */}
                    <div className="space-y-6 max-w-2xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-neutral-200 shadow-sm text-xs font-semibold tracking-wide uppercase text-neutral-600">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            Work In Progress
                        </div>

                        <h1 className="text-5xl md:text-7xl font-extrabold text-neutral-900 tracking-tight leading-tight">
                            Módulo en <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-red-500 to-red-600 animate-pulse">Desarrollo</span>
                        </h1>

                        <p className="text-lg md:text-xl text-neutral-500 font-light max-w-lg mx-auto leading-relaxed">
                            Estamos trabajando en esta funcionalidad.
                            {/* <span className="block mt-2 font-medium text-neutral-800">
                                Compilando cambios{dots}
                            </span> */}
                        </p>
                    </div>

                    {/* Code Snippet Visual
                    <div className="mt-12 mx-auto max-w-md bg-white rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-neutral-200 overflow-hidden text-left transform hover:-translate-y-1 transition-transform duration-300">
                        <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                <div className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
                                <div className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
                            </div>
                            <span className="text-xs font-mono text-neutral-400">status_check.ts</span>
                        </div>
                        <div className="p-4 font-mono text-xs md:text-sm space-y-2 bg-white">
                            <div className="flex text-neutral-400">
                                <span className="w-6 select-none text-right mr-3 opacity-30">1</span>
                                <span>interface <span className="text-yellow-600">ModuleStatus</span> {'{'}</span>
                            </div>
                            <div className="flex text-neutral-800">
                                <span className="w-6 select-none text-right mr-3 text-neutral-300">2</span>
                                <span className="pl-4">isReady: <span className="text-red-600">false</span>;</span>
                            </div>
                            <div className="flex text-neutral-800">
                                <span className="w-6 select-none text-right mr-3 text-neutral-300">3</span>
                                <span className="pl-4">eta: <span className="text-green-600">'Coming Soon'</span>;</span>
                            </div>
                            <div className="flex text-neutral-400">
                                <span className="w-6 select-none text-right mr-3 opacity-30">4</span>
                                <span>{'}'}</span>
                            </div>
                        </div>
                    </div> */}

                    {/* Back Button
                    <div className="mt-12">
                        <button
                            onClick={() => window.history.back()}
                            className="group relative inline-flex items-center gap-2.5 px-6 py-3 bg-neutral-900 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-600/25 hover:-translate-y-0.5"
                        >
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            <span>Regresar al Dashboard</span>
                        </button>
                    </div> */}
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full py-6 text-center z-10">
                <p className="text-xs text-neutral-400 flex items-center justify-center gap-2">
                    <AlertTriangle className="w-3 h-3" />
                    Esta sección no está disponible en producción
                </p>
            </footer>
        </div>
    );
}