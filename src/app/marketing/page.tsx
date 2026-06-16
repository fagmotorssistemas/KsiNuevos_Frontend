import { MarketingDashboardCards } from './MarketingDashboardCards';

export default function MarketingDashboardPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-extrabold text-gray-900">Marketing</h1>
                <p className="text-sm text-gray-500 mt-2 max-w-xl">
                    Herramientas de contenido y automatización. Elige una opción en el menú lateral
                    o accede directamente a las herramientas disponibles para tu rol.
                </p>
            </div>

            <MarketingDashboardCards />
        </div>
    );
}
