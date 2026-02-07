import { ReceptionForm } from "@/components/features/taller/recepcion/ReceptionForm";

export default function RecepcionPage() {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Nueva Recepción de Vehículo</h1>
                <p className="text-slate-500">Completa el formulario para generar la orden de ingreso y acta de responsabilidad.</p>
            </div>
            
            <ReceptionForm />
        </div>
    );
}