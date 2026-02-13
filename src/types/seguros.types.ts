// src/types/seguros.types.ts

// 1. Lectura desde API Legacy (Para el Listado)
export interface SeguroVehicular {
    id: string;
    referencia: string;     // Nota de venta
    fechaEmision: string;
    
    cliente: {
        nombre: string;
        identificacion: string;
        ubicacion: string;
    };

    bienAsegurado: {
        descripcion: string; // Marca + Modelo
        placa: string;
        tipo: string;
    };

    valores: {
        seguro: number;
        rastreo: number;
        total: number;
    };
    
    estado: 'ACTIVO' | 'PENDIENTE';
}

// 2. Escritura hacia Supabase (Para el Formulario)
export interface SeguroPayload {
    identificacion_cliente: string;
    nota_venta: string; // Foreign Key lógica
    broker: string;
    aseguradora: string;
    tipo_seguro: string;
    costo_seguro: number;
    precio_venta: number;
    evidencias?: string[]; // Array de URLs
}
  
// 3. Lectura desde Supabase (Cuando editamos una póliza existente)
export interface SeguroRegistrado extends SeguroPayload {
    id: number;
    created_at: string;
}