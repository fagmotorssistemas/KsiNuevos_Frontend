import { useState } from 'react';
import { X, Save, Loader2, Palette } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface CreateClienteModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const COLORS = [
    { name: 'Blanco', value: '#ffffff', border: '#e2e8f0' },
    { name: 'Rojo Alerta', value: '#fee2e2', border: '#ef4444' }, // red-100
    { name: 'Azul Info', value: '#dbeafe', border: '#3b82f6' }, // blue-100
    { name: 'Verde Ok', value: '#dcfce7', border: '#22c55e' }, // green-100
    { name: 'Amarillo Warning', value: '#fef9c3', border: '#eab308' }, // yellow-100
    { name: 'Púrpura', value: '#f3e8ff', border: '#a855f7' }, // purple-100
];

export function CreateClienteModal({ onClose, onSuccess }: CreateClienteModalProps) {
    const { supabase } = useAuth();
    const [loading, setLoading] = useState(false);

    // Estado del Formulario
    const [formData, setFormData] = useState({
        nombre_completo: '',
        identificacion: '',
        telefono: '',
        direccion: '',
        email: '',
        observaciones_legales: '',
        color_etiqueta: '' // Vacío por defecto (blanco)
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.nombre_completo.trim()) {
            alert("El nombre es obligatorio");
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase
                .from('clientespb')
                .insert([{
                    nombre_completo: formData.nombre_completo,
                    identificacion: formData.identificacion || null,
                    telefono: formData.telefono || null,
                    direccion: formData.direccion || null,
                    email: formData.email || null,
                    observaciones_legales: formData.observaciones_legales || null,
                    color_etiqueta: formData.color_etiqueta || null,
                    // La calificación y estado se pueden poner luego o por defecto
                    calificacion_cliente: 'A'
                }]);

            if (error) throw error;

            // Éxito
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creando cliente:', error);
            alert('Error al guardar el cliente');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Nuevo Cliente</h2>
                        <p className="text-sm text-gray-500">Registra un nuevo deudor en la cartera</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body (Scrollable) */}
                <div className="p-6 overflow-y-auto">
                    <form id="create-cliente-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Sección 1: Datos Principales */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-full">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                                <input
                                    name="nombre_completo"
                                    value={formData.nombre_completo}
                                    onChange={handleChange}
                                    placeholder="Ej: Juan Pérez"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Identificación (Cédula/RUC)</label>
                                <input
                                    name="identificacion"
                                    value={formData.identificacion}
                                    onChange={handleChange}
                                    placeholder="010..."
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono / Celular</label>
                                <input
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    placeholder="099..."
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Sección 2: Contacto y Dirección */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-full">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Domiciliaria</label>
                                <input
                                    name="direccion"
                                    value={formData.direccion}
                                    onChange={handleChange}
                                    placeholder="Calle principal..."
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div className="col-span-full">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notas / Observaciones Iniciales</label>
                                <textarea
                                    name="observaciones_legales"
                                    value={formData.observaciones_legales}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Notas sobre ubicación, referencias o estado legal..."
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* Sección 3: Personalización Visual */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div className="flex items-center gap-2 mb-3">
                                <Palette size={16} className="text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Etiqueta de Color (Opcional)</span>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {COLORS.map((color) => (
                                    <button
                                        key={color.name}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, color_etiqueta: color.border })}
                                        className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center ${formData.color_etiqueta === color.border ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                                            }`}
                                        style={{
                                            backgroundColor: color.value,
                                            borderColor: color.border
                                        }}
                                        title={color.name}
                                    >
                                        {formData.color_etiqueta === color.border && <div className="w-2 h-2 bg-gray-800 rounded-full" />}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                Este color se usará para resaltar la tarjeta del cliente en la lista principal.
                            </p>
                        </div>

                    </form>
                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="create-cliente-form"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Guardar Cliente
                    </button>
                </div>

            </div>
        </div>
    );
}