import Link from 'next/link';
import { Film, ArrowRight } from 'lucide-react';

export default function MarketingDashboardPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-extrabold text-gray-900">Marketing</h1>
                <p className="text-sm text-gray-500 mt-2 max-w-xl">
                    Herramientas de contenido y automatización. Elige una opción en el menú lateral
                    o accede directamente a Videos IA.
                </p>
            </div>

            <Link
                href="/marketing/video-automation"
                className="group flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
            >
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
                        <Film className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">La Máquina de Videos</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Automatización de edición con IA para redes sociales (Gemini + Descript).
                        </p>
                    </div>
                </div>
                <ArrowRight className="w-5 h-5 text-violet-600 shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
        </div>
    );
}
