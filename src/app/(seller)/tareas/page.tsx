import { Wrench } from "lucide-react";

export default function TasksPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-black">
            <Wrench size={48} className="mb-4" />
            <h1 className="text-4xl font-semibold">Modulo en desarrollo</h1>
            <p className="mt-2 text-base">Estamos trabajando para traerte esta sección pronto.</p>
        </div>
    );
}