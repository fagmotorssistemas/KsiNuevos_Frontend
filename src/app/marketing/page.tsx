import Link from 'next/link';
import { ArrowRight, ScrollText, Megaphone, BarChart3, CalendarDays, Sparkles } from 'lucide-react';

export default function MarketingDashboardPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-extrabold text-gray-900">Marketing</h1>
                <p className="text-sm text-gray-500 mt-2 max-w-xl">
                    Herramientas de contenido y automatización. Elige una opción en el menú lateral
                    o accede directamente a Videos.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Link
                    href="/marketing/guiones"
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-slate-200 hover:shadow-md"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/10">
                            <ScrollText className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Guiones del Día</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Guiones por fecha, agrupados por vendedor y por vehículo.
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-900 shrink-0 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                    href="/marketing/publicaciones"
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
                            <Megaphone className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Publicaciones</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Videos publicados con métricas y posts informativos/educativos.
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-violet-600 shrink-0 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                    href="/marketing/metricas"
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Métricas</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                KPI general + Top/Bottom por retención + huérfanos.
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-emerald-600 shrink-0 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                    href="/marketing/planificador"
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
                            <CalendarDays className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Planificador</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Arrastra vehículos a fechas y asigna vendedor + estado.
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-violet-600 shrink-0 transition-transform group-hover:translate-x-1" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Link
                    href="/marketing/videos"
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Videos ✨</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Fábrica automatizada de Reels (AssemblyAI + Gemini + Creatomate).
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-violet-600 shrink-0 transition-transform group-hover:translate-x-1" />
                </Link>
            </div>
        </div>
    );
}
