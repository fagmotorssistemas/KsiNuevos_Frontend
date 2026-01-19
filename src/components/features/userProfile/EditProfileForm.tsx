import React, { useState } from 'react';

// Tipos de los datos que recibimos
interface EditProfileFormProps {
  initialData: {
    full_name: string;
    phone: string;
  };
  onSave: (data: { full_name: string; phone: string }) => Promise<void>;
  onCancel: () => void;
}

export const EditProfileForm = ({ initialData, onSave, onCancel }: EditProfileFormProps) => {
  const [formData, setFormData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Campo Nombre */}
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
          Nombre Completo
        </label>
        <input
          type="text"
          required
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent text-sm"
        />
      </div>

      {/* Campo Teléfono */}
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
          Teléfono / Celular
        </label>
        <input
          type="tel"
          required
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent text-sm"
        />
      </div>

      {/* Botones de Acción */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-bold hover:bg-black transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
          disabled={loading}
        >
          {loading ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Guardar Cambios'
          )}
        </button>
      </div>
    </form>
  );
};