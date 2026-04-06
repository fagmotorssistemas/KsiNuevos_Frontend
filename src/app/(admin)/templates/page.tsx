"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { Plus, X, Upload, FileImage, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Template {
  id: string;
  slug: string;
  name: string;
  image_path: string | null;
  image_url: string | null;
  config: any;
  created_at: string;
  updated_at: string;
}

export default function TemplatesPage() {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.role === "admin") {
      fetchTemplates();
    }
  }, [profile]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from("templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching templates:", error);
    } else {
      setTemplates(data || []);
    }
    setIsLoading(false);
  };

  const handleOpenModal = () => {
    setName("");
    setSlug("");
    setFile(null);
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta plantilla?")) return;
    
    const { error } = await (supabase as any).from("templates").delete().eq("id", id);
    if (error) {
      alert("Error al eliminar la plantilla: " + error.message);
    } else {
      fetchTemplates();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) {
      setError("El nombre y el slug son obligatorios.");
      return;
    }
    if (!file) {
      setError("Debes seleccionar una imagen para la plantilla.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Upload to Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${slug}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("plantillas-campaigns")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error("Error al subir la imagen: " + uploadError.message);
      }

      // 2. Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("plantillas-campaigns")
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;

      // 3. Insert into DB
      const { error: insertError } = await (supabase as any).from("templates").insert([
        {
          name,
          slug,
          image_path: filePath,
          image_url: imageUrl,
          config: {}
        },
      ]);

      if (insertError) {
        throw new Error("Error al guardar en base de datos: " + insertError.message);
      }

      setIsModalOpen(false);
      fetchTemplates();
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthLoading && profile?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-600">
        <h1 className="text-xl font-bold">Acceso Restringido</h1>
        <p>No tienes permisos para ver el panel de plantillas.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Plantillas</h1>
          <p className="text-slate-500 mt-1">
            Gestión de plantillas del sistema
          </p>
        </div>
        <Button onClick={handleOpenModal} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva Plantilla
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center shadow-sm">
          <FileImage className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900">No hay plantillas</h3>
          <p className="text-slate-500 mt-1">Aún no has creado ninguna plantilla.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="h-48 bg-slate-100 relative group">
                {template.image_url ? (
                  <img
                    src={template.image_url}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <FileImage className="h-10 w-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button 
                    onClick={() => handleDelete(template.id)}
                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-slate-900 truncate">{template.name}</h3>
                <p className="text-sm text-slate-500 truncate">Slug: {template.slug}</p>
                <div className="mt-4 text-xs text-slate-400">
                  Creado: {new Date(template.created_at).toLocaleDateString('es-EC')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR PLANTILLA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Subir Nueva Plantilla
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Plantilla</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Plantilla Comercial"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Slug (Identificador único)</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    placeholder="ej-plantilla-comercial"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Imagen de la Plantilla</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-slate-400" />
                      <div className="flex text-sm text-slate-600 justify-center">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                        >
                          <span>Subir un archivo</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setFile(e.target.files[0]);
                            }
                          }} />
                        </label>
                      </div>
                      <p className="text-xs text-slate-500">PNG, JPG, GIF hasta 10MB</p>
                      {file && (
                        <p className="text-sm font-medium text-green-600 mt-2 truncate">
                          Seleccionado: {file.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Guardar Plantilla"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}