export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string | null
          external_client_name: string | null
          id: number
          lead_id: number | null
          location: string | null
          notes: string | null
          responsible_id: string
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          external_client_name?: string | null
          id?: number
          lead_id?: number | null
          location?: string | null
          notes?: string | null
          responsible_id: string
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          external_client_name?: string | null
          id?: number
          lead_id?: number | null
          location?: string | null
          notes?: string | null
          responsible_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_externos: {
        Row: {
          anio: string | null
          color: string | null
          created_at: string | null
          direccion: string | null
          email: string | null
          id: string
          identificacion: string
          marca: string | null
          modelo: string | null
          nombre_completo: string
          placa_vehiculo: string | null
          telefono: string | null
        }
        Insert: {
          anio?: string | null
          color?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          identificacion: string
          marca?: string | null
          modelo?: string | null
          nombre_completo: string
          placa_vehiculo?: string | null
          telefono?: string | null
        }
        Update: {
          anio?: string | null
          color?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          identificacion?: string
          marca?: string | null
          modelo?: string | null
          nombre_completo?: string
          placa_vehiculo?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      clientespb: {
        Row: {
          calificacion_cliente: string | null
          color_etiqueta: string | null
          created_at: string
          direccion: string | null
          email: string | null
          id: string
          identificacion: string | null
          nombre_completo: string
          observaciones_legales: string | null
          telefono: string | null
        }
        Insert: {
          calificacion_cliente?: string | null
          color_etiqueta?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          identificacion?: string | null
          nombre_completo: string
          observaciones_legales?: string | null
          telefono?: string | null
        }
        Update: {
          calificacion_cliente?: string | null
          color_etiqueta?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          identificacion?: string | null
          nombre_completo?: string
          observaciones_legales?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      concesionarias: {
        Row: {
          created_at: string | null
          direccion: string | null
          email: string | null
          id: string
          nombre: string
          ruc: string
          telefono: string | null
        }
        Insert: {
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombre: string
          ruc: string
          telefono?: string | null
        }
        Update: {
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          ruc?: string
          telefono?: string | null
        }
        Relationships: []
      }
      contratospb: {
        Row: {
          alias_vehiculo: string | null
          chasis: string | null
          cliente_id: string | null
          created_at: string
          estado: string | null
          id: string
          marca: string | null
          notas_internas: string | null
          numero_contrato: string | null
          placa: string | null
          saldo_inicial_total: number | null
          tasa_mora_diaria: number | null
        }
        Insert: {
          alias_vehiculo?: string | null
          chasis?: string | null
          cliente_id?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          marca?: string | null
          notas_internas?: string | null
          numero_contrato?: string | null
          placa?: string | null
          saldo_inicial_total?: number | null
          tasa_mora_diaria?: number | null
        }
        Update: {
          alias_vehiculo?: string | null
          chasis?: string | null
          cliente_id?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          marca?: string | null
          notas_internas?: string | null
          numero_contrato?: string | null
          placa?: string | null
          saldo_inicial_total?: number | null
          tasa_mora_diaria?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratospb_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientespb"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_proformas: {
        Row: {
          client_address: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          created_at: string | null
          created_by: string | null
          down_payment_amount: number | null
          id: string
          interest_rate: number | null
          monthly_payment: number | null
          pdf_url: string | null
          status: string | null
          term_months: number | null
          vehicle_description: string | null
          vehicle_id: string | null
          vehicle_price: number | null
        }
        Insert: {
          client_address?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          down_payment_amount?: number | null
          id?: string
          interest_rate?: number | null
          monthly_payment?: number | null
          pdf_url?: string | null
          status?: string | null
          term_months?: number | null
          vehicle_description?: string | null
          vehicle_id?: string | null
          vehicle_price?: number | null
        }
        Update: {
          client_address?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          down_payment_amount?: number | null
          id?: string
          interest_rate?: number | null
          monthly_payment?: number | null
          pdf_url?: string | null
          status?: string | null
          term_months?: number | null
          vehicle_description?: string | null
          vehicle_id?: string | null
          vehicle_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_proformas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_proformas_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      cuotas_rastreador: {
        Row: {
          created_at: string | null
          estado: Database["public"]["Enums"]["estado_cuota_enum"]
          fecha_vencimiento: string
          id: string
          numero_cuota: number
          valor: number
          venta_id: string
        }
        Insert: {
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_cuota_enum"]
          fecha_vencimiento: string
          id?: string
          numero_cuota: number
          valor: number
          venta_id: string
        }
        Update: {
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_cuota_enum"]
          fecha_vencimiento?: string
          id?: string
          numero_cuota?: number
          valor?: number
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cuota_venta"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas_rastreador"
            referencedColumns: ["id"]
          },
        ]
      }
      cuotaspb: {
        Row: {
          color_fila: string | null
          concepto: string | null
          contrato_id: string | null
          created_at: string
          dias_mora_calculados: number | null
          es_adicional: boolean | null
          estado_pago: string | null
          fecha_pago_realizado: string | null
          fecha_vencimiento: string | null
          id: string
          indice_ordenamiento: number
          numero_cuota_texto: string | null
          observaciones: string | null
          saldo_pendiente: number | null
          valor_capital: number | null
          valor_cuota_total: number | null
          valor_interes: number | null
          valor_mora_cobrado: number | null
          valor_mora_sugerido: number | null
          valor_pagado: number | null
        }
        Insert: {
          color_fila?: string | null
          concepto?: string | null
          contrato_id?: string | null
          created_at?: string
          dias_mora_calculados?: number | null
          es_adicional?: boolean | null
          estado_pago?: string | null
          fecha_pago_realizado?: string | null
          fecha_vencimiento?: string | null
          id?: string
          indice_ordenamiento: number
          numero_cuota_texto?: string | null
          observaciones?: string | null
          saldo_pendiente?: number | null
          valor_capital?: number | null
          valor_cuota_total?: number | null
          valor_interes?: number | null
          valor_mora_cobrado?: number | null
          valor_mora_sugerido?: number | null
          valor_pagado?: number | null
        }
        Update: {
          color_fila?: string | null
          concepto?: string | null
          contrato_id?: string | null
          created_at?: string
          dias_mora_calculados?: number | null
          es_adicional?: boolean | null
          estado_pago?: string | null
          fecha_pago_realizado?: string | null
          fecha_vencimiento?: string | null
          id?: string
          indice_ordenamiento?: number
          numero_cuota_texto?: string | null
          observaciones?: string | null
          saldo_pendiente?: number | null
          valor_capital?: number | null
          valor_cuota_total?: number | null
          valor_interes?: number | null
          valor_mora_cobrado?: number | null
          valor_mora_sugerido?: number | null
          valor_pagado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cuotaspb_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratospb"
            referencedColumns: ["id"]
          },
        ]
      }
      datos_solicitados_clientes: {
        Row: {
          estado: string | null
          fecha_resolucion: string | null
          fecha_solicitud: string | null
          id: number
          lead_id: number
          mensaje_completo: string | null
          notas_vendedor: string | null
        }
        Insert: {
          estado?: string | null
          fecha_resolucion?: string | null
          fecha_solicitud?: string | null
          id?: number
          lead_id: number
          mensaje_completo?: string | null
          notas_vendedor?: string | null
        }
        Update: {
          estado?: string | null
          fecha_resolucion?: string | null
          fecha_solicitud?: string | null
          id?: number
          lead_id?: number
          mensaje_completo?: string | null
          notas_vendedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_lead"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      dispositivos_rastreo: {
        Row: {
          cliente_externo_id: string | null
          cliente_final_identificacion: string | null
          cliente_final_nombre: string | null
          cliente_final_telefono: string | null
          cliente_nombre: string | null
          concesionaria_id: string | null
          costo_compra: number | null
          costo_instalacion: number | null
          created_at: string | null
          es_concesionaria: boolean | null
          es_venta_externa: boolean | null
          estado: Database["public"]["Enums"]["estado_dispositivo_enum"]
          evidencias: string[] | null
          fecha_nota_venta: string | null
          id: string
          identificacion_cliente: string
          imei: string
          instalador: string | null
          instalador_id: string | null
          metodo_pago: string | null
          modelo: string | null
          nombre_concesionaria: string | null
          nota_venta: string | null
          pagado: boolean | null
          plazo_credito: number | null
          precio_venta: number | null
          proveedor: string | null
          registrado_por: string | null
          sim_id: string | null
          tipo_dispositivo: string | null
          tipo_pago: string | null
        }
        Insert: {
          cliente_externo_id?: string | null
          cliente_final_identificacion?: string | null
          cliente_final_nombre?: string | null
          cliente_final_telefono?: string | null
          cliente_nombre?: string | null
          concesionaria_id?: string | null
          costo_compra?: number | null
          costo_instalacion?: number | null
          created_at?: string | null
          es_concesionaria?: boolean | null
          es_venta_externa?: boolean | null
          estado?: Database["public"]["Enums"]["estado_dispositivo_enum"]
          evidencias?: string[] | null
          fecha_nota_venta?: string | null
          id?: string
          identificacion_cliente: string
          imei: string
          instalador?: string | null
          instalador_id?: string | null
          metodo_pago?: string | null
          modelo?: string | null
          nombre_concesionaria?: string | null
          nota_venta?: string | null
          pagado?: boolean | null
          plazo_credito?: number | null
          precio_venta?: number | null
          proveedor?: string | null
          registrado_por?: string | null
          sim_id?: string | null
          tipo_dispositivo?: string | null
          tipo_pago?: string | null
        }
        Update: {
          cliente_externo_id?: string | null
          cliente_final_identificacion?: string | null
          cliente_final_nombre?: string | null
          cliente_final_telefono?: string | null
          cliente_nombre?: string | null
          concesionaria_id?: string | null
          costo_compra?: number | null
          costo_instalacion?: number | null
          created_at?: string | null
          es_concesionaria?: boolean | null
          es_venta_externa?: boolean | null
          estado?: Database["public"]["Enums"]["estado_dispositivo_enum"]
          evidencias?: string[] | null
          fecha_nota_venta?: string | null
          id?: string
          identificacion_cliente?: string
          imei?: string
          instalador?: string | null
          instalador_id?: string | null
          metodo_pago?: string | null
          modelo?: string | null
          nombre_concesionaria?: string | null
          nota_venta?: string | null
          pagado?: boolean | null
          plazo_credito?: number | null
          precio_venta?: number | null
          proveedor?: string | null
          registrado_por?: string | null
          sim_id?: string | null
          tipo_dispositivo?: string | null
          tipo_pago?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispositivos_rastreo_cliente_externo_id_fkey"
            columns: ["cliente_externo_id"]
            isOneToOne: false
            referencedRelation: "clientes_externos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositivos_rastreo_instalador_id_fkey"
            columns: ["instalador_id"]
            isOneToOne: false
            referencedRelation: "gps_instaladores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositivos_rastreo_sim_id_fkey"
            columns: ["sim_id"]
            isOneToOne: false
            referencedRelation: "gps_sims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dispositivo_concesionaria"
            columns: ["concesionaria_id"]
            isOneToOne: false
            referencedRelation: "concesionarias"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_instaladores: {
        Row: {
          activo: boolean
          created_at: string | null
          id: string
          nombre: string
          telefono: string | null
          valor_por_instalacion: number | null
        }
        Insert: {
          activo?: boolean
          created_at?: string | null
          id?: string
          nombre: string
          telefono?: string | null
          valor_por_instalacion?: number | null
        }
        Update: {
          activo?: boolean
          created_at?: string | null
          id?: string
          nombre?: string
          telefono?: string | null
          valor_por_instalacion?: number | null
        }
        Relationships: []
      }
      gps_inventario: {
        Row: {
          costo_compra: number
          created_at: string | null
          estado: string | null
          factura_compra: string | null
          fecha_compra: string | null
          id: string
          imei: string
          modelo_id: string | null
          proveedor_id: string | null
          serie: string | null
          ubicacion: string | null
        }
        Insert: {
          costo_compra: number
          created_at?: string | null
          estado?: string | null
          factura_compra?: string | null
          fecha_compra?: string | null
          id?: string
          imei: string
          modelo_id?: string | null
          proveedor_id?: string | null
          serie?: string | null
          ubicacion?: string | null
        }
        Update: {
          costo_compra?: number
          created_at?: string | null
          estado?: string | null
          factura_compra?: string | null
          fecha_compra?: string | null
          id?: string
          imei?: string
          modelo_id?: string | null
          proveedor_id?: string | null
          serie?: string | null
          ubicacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gps_inventario_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "gps_modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_inventario_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "gps_proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_modelos: {
        Row: {
          costo_referencia: number | null
          id: string
          marca: string | null
          nombre: string
        }
        Insert: {
          costo_referencia?: number | null
          id?: string
          marca?: string | null
          nombre: string
        }
        Update: {
          costo_referencia?: number | null
          id?: string
          marca?: string | null
          nombre?: string
        }
        Relationships: []
      }
      gps_proveedores: {
        Row: {
          created_at: string | null
          id: string
          nombre: string
          ruc_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre: string
          ruc_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre?: string
          ruc_id?: string | null
        }
        Relationships: []
      }
      gps_sims: {
        Row: {
          costo_mensual: number | null
          created_at: string | null
          estado: string | null
          iccid: string
          id: string
          numero: string | null
          operadora: string | null
        }
        Insert: {
          costo_mensual?: number | null
          created_at?: string | null
          estado?: string | null
          iccid: string
          id?: string
          numero?: string | null
          operadora?: string | null
        }
        Update: {
          costo_mensual?: number | null
          created_at?: string | null
          estado?: string | null
          iccid?: string
          id?: string
          numero?: string | null
          operadora?: string | null
        }
        Relationships: []
      }
      interactions: {
        Row: {
          content: string | null
          created_at: string | null
          id: number
          lead_id: number
          responsible_id: string | null
          result: string | null
          type: Database["public"]["Enums"]["interaction_type"]
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: number
          lead_id: number
          responsible_id?: string | null
          result?: string | null
          type: Database["public"]["Enums"]["interaction_type"]
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: number
          lead_id?: number
          responsible_id?: string | null
          result?: string | null
          type?: Database["public"]["Enums"]["interaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interested_cars: {
        Row: {
          brand: string
          color_preference: string | null
          created_at: string | null
          id: number
          lead_id: number
          model: string
          notes: string | null
          updated_at: string | null
          vehicle_uid: string | null
          year: number | null
        }
        Insert: {
          brand: string
          color_preference?: string | null
          created_at?: string | null
          id?: number
          lead_id: number
          model: string
          notes?: string | null
          updated_at?: string | null
          vehicle_uid?: string | null
          year?: number | null
        }
        Update: {
          brand?: string
          color_preference?: string | null
          created_at?: string | null
          id?: number
          lead_id?: number
          model?: string
          notes?: string | null
          updated_at?: string | null
          vehicle_uid?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_interested_lead_id"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          brand: string
          city_registration: string | null
          color: string | null
          condition: string | null
          created_at: string | null
          cylinders: number | null
          description: string | null
          doors: number | null
          drive_type: string | null
          drive_type_detail: string | null
          engine_displacement: string | null
          entry_date: string | null
          features: Json | null
          fuel_type: string | null
          has_maintenance_record: boolean | null
          id: string
          img_gallery_urls: string[] | null
          img_main_url: string | null
          img_prefix: string | null
          interior_color: string | null
          is_certified: boolean | null
          location: Database["public"]["Enums"]["car_location"] | null
          marketing_in_patio: boolean | null
          marketing_posts_count: number | null
          marketing_stories_count: number | null
          marketing_videos_count: number | null
          mileage: number | null
          model: string
          observation: string | null
          ownership: Database["public"]["Enums"]["car_ownership"] | null
          passenger_capacity: number | null
          plate: string | null
          plate_short: string | null
          previous_owners: number | null
          price: number
          slug: string | null
          specs: Json | null
          status: Database["public"]["Enums"]["car_status"] | null
          stock: number | null
          transmission: string | null
          transmission_speeds: number | null
          type_body: string | null
          updated_at: string | null
          upholstery_type: string | null
          version: string | null
          video_url: string | null
          vin: string | null
          year: number
        }
        Insert: {
          brand: string
          city_registration?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string | null
          cylinders?: number | null
          description?: string | null
          doors?: number | null
          drive_type?: string | null
          drive_type_detail?: string | null
          engine_displacement?: string | null
          entry_date?: string | null
          features?: Json | null
          fuel_type?: string | null
          has_maintenance_record?: boolean | null
          id?: string
          img_gallery_urls?: string[] | null
          img_main_url?: string | null
          img_prefix?: string | null
          interior_color?: string | null
          is_certified?: boolean | null
          location?: Database["public"]["Enums"]["car_location"] | null
          marketing_in_patio?: boolean | null
          marketing_posts_count?: number | null
          marketing_stories_count?: number | null
          marketing_videos_count?: number | null
          mileage?: number | null
          model: string
          observation?: string | null
          ownership?: Database["public"]["Enums"]["car_ownership"] | null
          passenger_capacity?: number | null
          plate?: string | null
          plate_short?: string | null
          previous_owners?: number | null
          price?: number
          slug?: string | null
          specs?: Json | null
          status?: Database["public"]["Enums"]["car_status"] | null
          stock?: number | null
          transmission?: string | null
          transmission_speeds?: number | null
          type_body?: string | null
          updated_at?: string | null
          upholstery_type?: string | null
          version?: string | null
          video_url?: string | null
          vin?: string | null
          year: number
        }
        Update: {
          brand?: string
          city_registration?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string | null
          cylinders?: number | null
          description?: string | null
          doors?: number | null
          drive_type?: string | null
          drive_type_detail?: string | null
          engine_displacement?: string | null
          entry_date?: string | null
          features?: Json | null
          fuel_type?: string | null
          has_maintenance_record?: boolean | null
          id?: string
          img_gallery_urls?: string[] | null
          img_main_url?: string | null
          img_prefix?: string | null
          interior_color?: string | null
          is_certified?: boolean | null
          location?: Database["public"]["Enums"]["car_location"] | null
          marketing_in_patio?: boolean | null
          marketing_posts_count?: number | null
          marketing_stories_count?: number | null
          marketing_videos_count?: number | null
          mileage?: number | null
          model?: string
          observation?: string | null
          ownership?: Database["public"]["Enums"]["car_ownership"] | null
          passenger_capacity?: number | null
          plate?: string | null
          plate_short?: string | null
          previous_owners?: number | null
          price?: number
          slug?: string | null
          specs?: Json | null
          status?: Database["public"]["Enums"]["car_status"] | null
          stock?: number | null
          transmission?: string | null
          transmission_speeds?: number | null
          type_body?: string | null
          updated_at?: string | null
          upholstery_type?: string | null
          version?: string | null
          video_url?: string | null
          vin?: string | null
          year?: number
        }
        Relationships: []
      }
      inventory_embeddings: {
        Row: {
          content: string
          embedding: string | null
          id: number
          inventory_id: string
          metadata: Json
        }
        Insert: {
          content: string
          embedding?: string | null
          id?: number
          inventory_id: string
          metadata: Json
        }
        Update: {
          content?: string
          embedding?: string | null
          id?: number
          inventory_id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "inventory_embeddings_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      inventoryoracle: {
        Row: {
          accident_history: string | null
          aesthetic_condition: string | null
          airbags_count: number | null
          autonomy_km: number | null
          axles_count: string | null
          brake_assistance: boolean | null
          brake_type: string | null
          brand: string
          color: string | null
          country_origin: string | null
          created_at: string | null
          cylinder_count: number | null
          description: string | null
          documentation_up_to_date: boolean | null
          doors_count: number | null
          drive_type: string | null
          engine_displacement: string | null
          engine_number: string | null
          engine_type: string | null
          features: Json | null
          fuel_type: string | null
          horse_power: number | null
          id: string
          img_gallery_urls: string[] | null
          img_main_url: string | null
          img_prefix: string | null
          is_featured: boolean | null
          location: Database["public"]["Enums"]["car_location"] | null
          marketing_in_patio: boolean | null
          marketing_posts_count: number | null
          marketing_stories_count: number | null
          marketing_videos_count: number | null
          mechanical_condition: string | null
          mileage: number | null
          model: string
          oracle_id: string | null
          passenger_capacity: string | null
          plate: string | null
          plate_short: string | null
          previous_owners: number | null
          price: number | null
          publication_url: string | null
          purchase_date: string | null
          registration_place: string | null
          registration_year: string | null
          slug: string | null
          specs: Json | null
          status: Database["public"]["Enums"]["car_status"] | null
          steering_type: string | null
          stock: number | null
          supplier: string | null
          tonnage: string | null
          transmission: string | null
          type: string | null
          type_body: string | null
          updated_at: string | null
          upholstery_type: string | null
          version: string | null
          video_url: string | null
          vin: string
          wheels_count: string | null
          year: number
        }
        Insert: {
          accident_history?: string | null
          aesthetic_condition?: string | null
          airbags_count?: number | null
          autonomy_km?: number | null
          axles_count?: string | null
          brake_assistance?: boolean | null
          brake_type?: string | null
          brand: string
          color?: string | null
          country_origin?: string | null
          created_at?: string | null
          cylinder_count?: number | null
          description?: string | null
          documentation_up_to_date?: boolean | null
          doors_count?: number | null
          drive_type?: string | null
          engine_displacement?: string | null
          engine_number?: string | null
          engine_type?: string | null
          features?: Json | null
          fuel_type?: string | null
          horse_power?: number | null
          id?: string
          img_gallery_urls?: string[] | null
          img_main_url?: string | null
          img_prefix?: string | null
          is_featured?: boolean | null
          location?: Database["public"]["Enums"]["car_location"] | null
          marketing_in_patio?: boolean | null
          marketing_posts_count?: number | null
          marketing_stories_count?: number | null
          marketing_videos_count?: number | null
          mechanical_condition?: string | null
          mileage?: number | null
          model: string
          oracle_id?: string | null
          passenger_capacity?: string | null
          plate?: string | null
          plate_short?: string | null
          previous_owners?: number | null
          price?: number | null
          publication_url?: string | null
          purchase_date?: string | null
          registration_place?: string | null
          registration_year?: string | null
          slug?: string | null
          specs?: Json | null
          status?: Database["public"]["Enums"]["car_status"] | null
          steering_type?: string | null
          stock?: number | null
          supplier?: string | null
          tonnage?: string | null
          transmission?: string | null
          type?: string | null
          type_body?: string | null
          updated_at?: string | null
          upholstery_type?: string | null
          version?: string | null
          video_url?: string | null
          vin: string
          wheels_count?: string | null
          year: number
        }
        Update: {
          accident_history?: string | null
          aesthetic_condition?: string | null
          airbags_count?: number | null
          autonomy_km?: number | null
          axles_count?: string | null
          brake_assistance?: boolean | null
          brake_type?: string | null
          brand?: string
          color?: string | null
          country_origin?: string | null
          created_at?: string | null
          cylinder_count?: number | null
          description?: string | null
          documentation_up_to_date?: boolean | null
          doors_count?: number | null
          drive_type?: string | null
          engine_displacement?: string | null
          engine_number?: string | null
          engine_type?: string | null
          features?: Json | null
          fuel_type?: string | null
          horse_power?: number | null
          id?: string
          img_gallery_urls?: string[] | null
          img_main_url?: string | null
          img_prefix?: string | null
          is_featured?: boolean | null
          location?: Database["public"]["Enums"]["car_location"] | null
          marketing_in_patio?: boolean | null
          marketing_posts_count?: number | null
          marketing_stories_count?: number | null
          marketing_videos_count?: number | null
          mechanical_condition?: string | null
          mileage?: number | null
          model?: string
          oracle_id?: string | null
          passenger_capacity?: string | null
          plate?: string | null
          plate_short?: string | null
          previous_owners?: number | null
          price?: number | null
          publication_url?: string | null
          purchase_date?: string | null
          registration_place?: string | null
          registration_year?: string | null
          slug?: string | null
          specs?: Json | null
          status?: Database["public"]["Enums"]["car_status"] | null
          steering_type?: string | null
          stock?: number | null
          supplier?: string | null
          tonnage?: string | null
          transmission?: string | null
          type?: string | null
          type_body?: string | null
          updated_at?: string | null
          upholstery_type?: string | null
          version?: string | null
          video_url?: string | null
          vin?: string
          wheels_count?: string | null
          year?: number
        }
        Relationships: []
      }
      inventoryoracle_embeddings: {
        Row: {
          content: string
          embedding: string | null
          id: number
          inventory_id: string
          metadata: Json
        }
        Insert: {
          content: string
          embedding?: string | null
          id?: number
          inventory_id: string
          metadata: Json
        }
        Update: {
          content?: string
          embedding?: string | null
          id?: number
          inventory_id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "inventoryoracle_embeddings_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_recovery: {
        Row: {
          id: number
          lead_id: number
          response_15d:
            | Database["public"]["Enums"]["lead_message_response"]
            | null
          response_15d_text: string | null
          response_2d:
            | Database["public"]["Enums"]["lead_message_response"]
            | null
          response_2d_text: string | null
          response_30d:
            | Database["public"]["Enums"]["lead_message_response"]
            | null
          response_30d_text: string | null
          response_7d:
            | Database["public"]["Enums"]["lead_message_response"]
            | null
          response_7d_text: string | null
          sent_15d: boolean
          sent_2d: boolean
          sent_30d: boolean
          sent_7d: boolean
        }
        Insert: {
          id?: number
          lead_id: number
          response_15d?:
            | Database["public"]["Enums"]["lead_message_response"]
            | null
          response_15d_text?: string | null
          response_2d?:
            | Database["public"]["Enums"]["lead_message_response"]
            | null
          response_2d_text?: string | null
          response_30d?:
            | Database["public"]["Enums"]["lead_message_response"]
            | null
          response_30d_text?: string | null
          response_7d?:
            | Database["public"]["Enums"]["lead_message_response"]
            | null
          response_7d_text?: string | null
          sent_15d?: boolean
          sent_2d?: boolean
          sent_30d?: boolean
          sent_7d?: boolean
        }
        Update: {
          id?: number
          lead_id?: number
          response_15d?:
            | Database["public"]["Enums"]["lead_message_response"]
            | null
          response_15d_text?: string | null
          response_2d?:
            | Database["public"]["Enums"]["lead_message_response"]
            | null
          response_2d_text?: string | null
          response_30d?:
            | Database["public"]["Enums"]["lead_message_response"]
            | null
          response_30d_text?: string | null
          response_7d?:
            | Database["public"]["Enums"]["lead_message_response"]
            | null
          response_7d_text?: string | null
          sent_15d?: boolean
          sent_2d?: boolean
          sent_30d?: boolean
          sent_7d?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lead_recovery_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          behavior_signals: Json | null
          budget: number | null
          contact_id: number | null
          created_at: string | null
          day_detected: string | null
          email: string | null
          fecha_ultimo_contacto: string | null
          financing: boolean | null
          hour_detected: string | null
          id: number
          lead_id_kommo: number
          mensajes_enviados: string[]
          name: string
          phone: string
          resume: string | null
          source: Database["public"]["Enums"]["acquisition_source"] | null
          status: Database["public"]["Enums"]["lead_status"] | null
          temperature: Database["public"]["Enums"]["lead_temperature"] | null
          time_reference: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          behavior_signals?: Json | null
          budget?: number | null
          contact_id?: number | null
          created_at?: string | null
          day_detected?: string | null
          email?: string | null
          fecha_ultimo_contacto?: string | null
          financing?: boolean | null
          hour_detected?: string | null
          id?: number
          lead_id_kommo: number
          mensajes_enviados?: string[]
          name: string
          phone?: string
          resume?: string | null
          source?: Database["public"]["Enums"]["acquisition_source"] | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          temperature?: Database["public"]["Enums"]["lead_temperature"] | null
          time_reference?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          behavior_signals?: Json | null
          budget?: number | null
          contact_id?: number | null
          created_at?: string | null
          day_detected?: string | null
          email?: string | null
          fecha_ultimo_contacto?: string | null
          financing?: boolean | null
          hour_detected?: string | null
          id?: number
          lead_id_kommo?: number
          mensajes_enviados?: string[]
          name?: string
          phone?: string
          resume?: string | null
          source?: Database["public"]["Enums"]["acquisition_source"] | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          temperature?: Database["public"]["Enums"]["lead_temperature"] | null
          time_reference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string
          role: Database["public"]["Enums"]["user_role_enum"]
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          phone: string
          role?: Database["public"]["Enums"]["user_role_enum"]
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
          role?: Database["public"]["Enums"]["user_role_enum"]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      scraper_sellers: {
        Row: {
          badges: string | null
          fb_seller_id: string
          first_seen_at: string | null
          id: string
          is_dealer: boolean | null
          last_updated: string | null
          location: Database["public"]["Enums"]["scraper_car_location"] | null
          seller_name: string | null
          total_listings: number | null
        }
        Insert: {
          badges?: string | null
          fb_seller_id: string
          first_seen_at?: string | null
          id?: string
          is_dealer?: boolean | null
          last_updated?: string | null
          location?: Database["public"]["Enums"]["scraper_car_location"] | null
          seller_name?: string | null
          total_listings?: number | null
        }
        Update: {
          badges?: string | null
          fb_seller_id?: string
          first_seen_at?: string | null
          id?: string
          is_dealer?: boolean | null
          last_updated?: string | null
          location?: Database["public"]["Enums"]["scraper_car_location"] | null
          seller_name?: string | null
          total_listings?: number | null
        }
        Relationships: []
      }
      scraper_vehicle_price_statistics: {
        Row: {
          avg_mileage: number | null
          avg_price: number | null
          brand: string
          created_at: string | null
          id: string
          last_updated: string | null
          max_price: number | null
          median_price: number | null
          min_price: number | null
          model: string
          price_p25: number | null
          price_p75: number | null
          price_stddev: number | null
          year: string | null
        }
        Insert: {
          avg_mileage?: number | null
          avg_price?: number | null
          brand: string
          created_at?: string | null
          id?: string
          last_updated?: string | null
          max_price?: number | null
          median_price?: number | null
          min_price?: number | null
          model: string
          price_p25?: number | null
          price_p75?: number | null
          price_stddev?: number | null
          year?: string | null
        }
        Update: {
          avg_mileage?: number | null
          avg_price?: number | null
          brand?: string
          created_at?: string | null
          id?: string
          last_updated?: string | null
          max_price?: number | null
          median_price?: number | null
          min_price?: number | null
          model?: string
          price_p25?: number | null
          price_p75?: number | null
          price_stddev?: number | null
          year?: string | null
        }
        Relationships: []
      }
      scraper_vehicles: {
        Row: {
          brand: string
          characteristics: string[] | null
          condition: string | null
          created_at: string | null
          description: string | null
          extras: string[] | null
          id: string
          image_analysis: Json | null
          image_url: string | null
          is_sold: boolean
          listing_image_urls: string[] | null
          location: string | null
          mileage: number | null
          model: string
          motor: string | null
          price: number | null
          publication_date: string
          seller_id: string
          tags: string[] | null
          title: string | null
          transmission: string | null
          updated_at: string | null
          url: string
          year: string | null
        }
        Insert: {
          brand: string
          characteristics?: string[] | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          extras?: string[] | null
          id?: string
          image_analysis?: Json | null
          image_url?: string | null
          is_sold?: boolean
          listing_image_urls?: string[] | null
          location?: string | null
          mileage?: number | null
          model: string
          motor?: string | null
          price?: number | null
          publication_date: string
          seller_id: string
          tags?: string[] | null
          title?: string | null
          transmission?: string | null
          updated_at?: string | null
          url: string
          year?: string | null
        }
        Update: {
          brand?: string
          characteristics?: string[] | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          extras?: string[] | null
          id?: string
          image_analysis?: Json | null
          image_url?: string | null
          is_sold?: boolean
          listing_image_urls?: string[] | null
          location?: string | null
          mileage?: number | null
          model?: string
          motor?: string | null
          price?: number | null
          publication_date?: string
          seller_id?: string
          tags?: string[] | null
          title?: string | null
          transmission?: string | null
          updated_at?: string | null
          url?: string
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_scraper_vehicles_seller"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "scraper_sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seguros_contratos: {
        Row: {
          aseguradora: string
          broker: string
          costo_seguro: number | null
          created_at: string | null
          evidencias: string[] | null
          id: string
          identificacion_cliente: string
          nota_venta: string
          precio_venta: number | null
          registrado_por: string | null
          tipo_seguro: string | null
        }
        Insert: {
          aseguradora: string
          broker: string
          costo_seguro?: number | null
          created_at?: string | null
          evidencias?: string[] | null
          id?: string
          identificacion_cliente: string
          nota_venta: string
          precio_venta?: number | null
          registrado_por?: string | null
          tipo_seguro?: string | null
        }
        Update: {
          aseguradora?: string
          broker?: string
          costo_seguro?: number | null
          created_at?: string | null
          evidencias?: string[] | null
          id?: string
          identificacion_cliente?: string
          nota_venta?: string
          precio_venta?: number | null
          registrado_por?: string | null
          tipo_seguro?: string | null
        }
        Relationships: []
      }
      showroom_visits: {
        Row: {
          client_name: string
          created_at: string | null
          credit_status: Database["public"]["Enums"]["credit_status"] | null
          id: number
          inventory_id: string | null
          inventoryoracle_id: string | null
          manual_vehicle_description: string | null
          observation: string | null
          phone: string | null
          salesperson_id: string | null
          source: Database["public"]["Enums"]["visit_source"] | null
          test_drive: boolean | null
          updated_at: string | null
          visit_end: string | null
          visit_start: string | null
        }
        Insert: {
          client_name: string
          created_at?: string | null
          credit_status?: Database["public"]["Enums"]["credit_status"] | null
          id?: number
          inventory_id?: string | null
          inventoryoracle_id?: string | null
          manual_vehicle_description?: string | null
          observation?: string | null
          phone?: string | null
          salesperson_id?: string | null
          source?: Database["public"]["Enums"]["visit_source"] | null
          test_drive?: boolean | null
          updated_at?: string | null
          visit_end?: string | null
          visit_start?: string | null
        }
        Update: {
          client_name?: string
          created_at?: string | null
          credit_status?: Database["public"]["Enums"]["credit_status"] | null
          id?: number
          inventory_id?: string | null
          inventoryoracle_id?: string | null
          manual_vehicle_description?: string | null
          observation?: string | null
          phone?: string | null
          salesperson_id?: string | null
          source?: Database["public"]["Enums"]["visit_source"] | null
          test_drive?: boolean | null
          updated_at?: string | null
          visit_end?: string | null
          visit_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "showroom_visits_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showroom_visits_inventoryoracle_id_fkey"
            columns: ["inventoryoracle_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showroom_visits_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      taller_clientes: {
        Row: {
          cedula_ruc: string | null
          created_at: string | null
          direccion: string | null
          email: string | null
          es_frecuente: boolean | null
          id: string
          nombre_completo: string
          notas_internas: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          cedula_ruc?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          es_frecuente?: boolean | null
          id?: string
          nombre_completo: string
          notas_internas?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          cedula_ruc?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          es_frecuente?: boolean | null
          id?: string
          nombre_completo?: string
          notas_internas?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      taller_consumos_materiales: {
        Row: {
          cantidad: number
          fecha_consumo: string | null
          id: string
          item_id: string
          orden_id: string
          registrado_por: string | null
        }
        Insert: {
          cantidad: number
          fecha_consumo?: string | null
          id?: string
          item_id: string
          orden_id: string
          registrado_por?: string | null
        }
        Update: {
          cantidad?: number
          fecha_consumo?: string | null
          id?: string
          item_id?: string
          orden_id?: string
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taller_consumos_item_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "taller_inventario_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taller_consumos_orden_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "taller_ordenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taller_consumos_user_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      taller_cuentas: {
        Row: {
          created_at: string | null
          es_caja_chica: boolean | null
          id: string
          nombre_cuenta: string
          numero_cuenta: string | null
          saldo_actual: number | null
        }
        Insert: {
          created_at?: string | null
          es_caja_chica?: boolean | null
          id?: string
          nombre_cuenta: string
          numero_cuenta?: string | null
          saldo_actual?: number | null
        }
        Update: {
          created_at?: string | null
          es_caja_chica?: boolean | null
          id?: string
          nombre_cuenta?: string
          numero_cuenta?: string | null
          saldo_actual?: number | null
        }
        Relationships: []
      }
      taller_detalles_orden: {
        Row: {
          cantidad: number | null
          created_at: string | null
          descripcion: string
          estado_trabajo: string | null
          id: string
          orden_id: string
          precio_unitario: number | null
          total: number | null
        }
        Insert: {
          cantidad?: number | null
          created_at?: string | null
          descripcion: string
          estado_trabajo?: string | null
          id?: string
          orden_id: string
          precio_unitario?: number | null
          total?: number | null
        }
        Update: {
          cantidad?: number | null
          created_at?: string | null
          descripcion?: string
          estado_trabajo?: string | null
          id?: string
          orden_id?: string
          precio_unitario?: number | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "taller_detalles_orden_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "taller_ordenes"
            referencedColumns: ["id"]
          },
        ]
      }
      taller_gastos_fijos: {
        Row: {
          activo: boolean | null
          created_at: string | null
          dia_limite_pago: number | null
          id: string
          monto_habitual: number | null
          nombre: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          dia_limite_pago?: number | null
          id?: string
          monto_habitual?: number | null
          nombre: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          dia_limite_pago?: number | null
          id?: string
          monto_habitual?: number | null
          nombre?: string
        }
        Relationships: []
      }
      taller_gastos_pagos: {
        Row: {
          comprobante_url: string | null
          created_at: string | null
          fecha_pago: string | null
          gasto_fijo_id: string | null
          id: string
          monto_pagado: number
          observacion: string | null
          registrado_por: string | null
        }
        Insert: {
          comprobante_url?: string | null
          created_at?: string | null
          fecha_pago?: string | null
          gasto_fijo_id?: string | null
          id?: string
          monto_pagado: number
          observacion?: string | null
          registrado_por?: string | null
        }
        Update: {
          comprobante_url?: string | null
          created_at?: string | null
          fecha_pago?: string | null
          gasto_fijo_id?: string | null
          id?: string
          monto_pagado?: number
          observacion?: string | null
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taller_gastos_pagos_gasto_fijo_id_fkey"
            columns: ["gasto_fijo_id"]
            isOneToOne: false
            referencedRelation: "taller_gastos_fijos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taller_gastos_pagos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      taller_inventario_items: {
        Row: {
          codigo_interno: string | null
          costo_promedio: number | null
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          precio_venta: number | null
          proveedor_favorito_id: string | null
          stock_actual: number | null
          stock_minimo: number | null
          tipo: Database["public"]["Enums"]["taller_tipo_item"]
          ubicacion_bodega: string | null
          unidad_medida: string | null
          updated_at: string | null
        }
        Insert: {
          codigo_interno?: string | null
          costo_promedio?: number | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          precio_venta?: number | null
          proveedor_favorito_id?: string | null
          stock_actual?: number | null
          stock_minimo?: number | null
          tipo: Database["public"]["Enums"]["taller_tipo_item"]
          ubicacion_bodega?: string | null
          unidad_medida?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo_interno?: string | null
          costo_promedio?: number | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          precio_venta?: number | null
          proveedor_favorito_id?: string | null
          stock_actual?: number | null
          stock_minimo?: number | null
          tipo?: Database["public"]["Enums"]["taller_tipo_item"]
          ubicacion_bodega?: string | null
          unidad_medida?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taller_inventario_proveedor_fkey"
            columns: ["proveedor_favorito_id"]
            isOneToOne: false
            referencedRelation: "taller_proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      taller_ordenes: {
        Row: {
          checklist_ingreso: Json | null
          cliente_id: string
          created_at: string | null
          estado: Database["public"]["Enums"]["taller_estado_orden"] | null
          estado_contable: string | null
          factura_numero: string | null
          factura_url: string | null
          fecha_ingreso: string | null
          fecha_promesa_entrega: string | null
          fecha_salida_real: string | null
          firma_cliente_url: string | null
          fotos_ingreso_urls: string[] | null
          fotos_salida_urls: string[] | null
          id: string
          inventario_pertenencias: Json | null
          kilometraje: number | null
          nivel_gasolina: number | null
          numero_orden: number
          observaciones_ingreso: string | null
          pdf_url: string | null
          total_final_cliente: number | null
          updated_at: string | null
          vehiculo_anio: number | null
          vehiculo_color: string | null
          vehiculo_marca: string | null
          vehiculo_modelo: string | null
          vehiculo_placa: string
          vehiculo_vin: string | null
        }
        Insert: {
          checklist_ingreso?: Json | null
          cliente_id: string
          created_at?: string | null
          estado?: Database["public"]["Enums"]["taller_estado_orden"] | null
          estado_contable?: string | null
          factura_numero?: string | null
          factura_url?: string | null
          fecha_ingreso?: string | null
          fecha_promesa_entrega?: string | null
          fecha_salida_real?: string | null
          firma_cliente_url?: string | null
          fotos_ingreso_urls?: string[] | null
          fotos_salida_urls?: string[] | null
          id?: string
          inventario_pertenencias?: Json | null
          kilometraje?: number | null
          nivel_gasolina?: number | null
          numero_orden?: number
          observaciones_ingreso?: string | null
          pdf_url?: string | null
          total_final_cliente?: number | null
          updated_at?: string | null
          vehiculo_anio?: number | null
          vehiculo_color?: string | null
          vehiculo_marca?: string | null
          vehiculo_modelo?: string | null
          vehiculo_placa: string
          vehiculo_vin?: string | null
        }
        Update: {
          checklist_ingreso?: Json | null
          cliente_id?: string
          created_at?: string | null
          estado?: Database["public"]["Enums"]["taller_estado_orden"] | null
          estado_contable?: string | null
          factura_numero?: string | null
          factura_url?: string | null
          fecha_ingreso?: string | null
          fecha_promesa_entrega?: string | null
          fecha_salida_real?: string | null
          firma_cliente_url?: string | null
          fotos_ingreso_urls?: string[] | null
          fotos_salida_urls?: string[] | null
          id?: string
          inventario_pertenencias?: Json | null
          kilometraje?: number | null
          nivel_gasolina?: number | null
          numero_orden?: number
          observaciones_ingreso?: string | null
          pdf_url?: string | null
          total_final_cliente?: number | null
          updated_at?: string | null
          vehiculo_anio?: number | null
          vehiculo_color?: string | null
          vehiculo_marca?: string | null
          vehiculo_modelo?: string | null
          vehiculo_placa?: string
          vehiculo_vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taller_ordenes_cliente_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "taller_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      taller_personal: {
        Row: {
          activo: boolean | null
          cargo: string | null
          created_at: string | null
          datos_bancarios: string | null
          fecha_ingreso: string | null
          id: string
          profile_id: string | null
          salario_mensual: number | null
        }
        Insert: {
          activo?: boolean | null
          cargo?: string | null
          created_at?: string | null
          datos_bancarios?: string | null
          fecha_ingreso?: string | null
          id?: string
          profile_id?: string | null
          salario_mensual?: number | null
        }
        Update: {
          activo?: boolean | null
          cargo?: string | null
          created_at?: string | null
          datos_bancarios?: string | null
          fecha_ingreso?: string | null
          id?: string
          profile_id?: string | null
          salario_mensual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "taller_personal_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      taller_proveedores: {
        Row: {
          categoria: string | null
          contacto_nombre: string | null
          created_at: string | null
          dia_pago_habitual: number | null
          email: string | null
          id: string
          nombre_comercial: string
          notas: string | null
          ruc: string | null
          telefono: string | null
        }
        Insert: {
          categoria?: string | null
          contacto_nombre?: string | null
          created_at?: string | null
          dia_pago_habitual?: number | null
          email?: string | null
          id?: string
          nombre_comercial: string
          notas?: string | null
          ruc?: string | null
          telefono?: string | null
        }
        Update: {
          categoria?: string | null
          contacto_nombre?: string | null
          created_at?: string | null
          dia_pago_habitual?: number | null
          email?: string | null
          id?: string
          nombre_comercial?: string
          notas?: string | null
          ruc?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      taller_servicios_catalogo: {
        Row: {
          created_at: string | null
          id: string
          nombre_servicio: string
          precio_sugerido: number | null
          tiempo_estimado_horas: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre_servicio: string
          precio_sugerido?: number | null
          tiempo_estimado_horas?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre_servicio?: string
          precio_sugerido?: number | null
          tiempo_estimado_horas?: number | null
        }
        Relationships: []
      }
      taller_transacciones: {
        Row: {
          comprobante_url: string | null
          cuenta_id: string
          descripcion: string | null
          fecha_transaccion: string | null
          id: string
          monto: number
          orden_id: string | null
          registrado_por: string | null
          tipo: Database["public"]["Enums"]["taller_tipo_transaccion"]
        }
        Insert: {
          comprobante_url?: string | null
          cuenta_id: string
          descripcion?: string | null
          fecha_transaccion?: string | null
          id?: string
          monto: number
          orden_id?: string | null
          registrado_por?: string | null
          tipo: Database["public"]["Enums"]["taller_tipo_transaccion"]
        }
        Update: {
          comprobante_url?: string | null
          cuenta_id?: string
          descripcion?: string | null
          fecha_transaccion?: string | null
          id?: string
          monto?: number
          orden_id?: string | null
          registrado_por?: string | null
          tipo?: Database["public"]["Enums"]["taller_tipo_transaccion"]
        }
        Relationships: [
          {
            foreignKeyName: "taller_transacciones_cuenta_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "taller_cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taller_transacciones_orden_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "taller_ordenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taller_transacciones_user_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: number
          is_completed: boolean | null
          priority: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: number
          is_completed?: boolean | null
          priority?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: number
          is_completed?: boolean | null
          priority?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_in_cars: {
        Row: {
          brand: string
          condition: string | null
          created_at: string | null
          estimated_value: number | null
          id: number
          lead_id: number
          mileage: number | null
          model: string
          notes: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          brand: string
          condition?: string | null
          created_at?: string | null
          estimated_value?: number | null
          id?: number
          lead_id: number
          mileage?: number | null
          model: string
          notes?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          brand?: string
          condition?: string | null
          created_at?: string | null
          estimated_value?: number | null
          id?: number
          lead_id?: number
          mileage?: number | null
          model?: string
          notes?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tradein_lead_id"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_requests: {
        Row: {
          brand: string
          budget_max: number | null
          client_name: string | null
          color_preference: string | null
          created_at: string | null
          id: number
          lead_id: number | null
          model: string
          notes: string | null
          priority: Database["public"]["Enums"]["request_priority"] | null
          requested_by: string | null
          status: Database["public"]["Enums"]["request_status"] | null
          type: Database["public"]["Enums"]["vehicle_request_type"] | null
          updated_at: string | null
          year_max: number | null
          year_min: number | null
        }
        Insert: {
          brand: string
          budget_max?: number | null
          client_name?: string | null
          color_preference?: string | null
          created_at?: string | null
          id?: number
          lead_id?: number | null
          model: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["request_priority"] | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          type?: Database["public"]["Enums"]["vehicle_request_type"] | null
          updated_at?: string | null
          year_max?: number | null
          year_min?: number | null
        }
        Update: {
          brand?: string
          budget_max?: number | null
          client_name?: string | null
          color_preference?: string | null
          created_at?: string | null
          id?: number
          lead_id?: number | null
          model?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["request_priority"] | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          type?: Database["public"]["Enums"]["vehicle_request_type"] | null
          updated_at?: string | null
          year_max?: number | null
          year_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas_rastreador: {
        Row: {
          abono_inicial: number | null
          created_at: string | null
          dispositivo_id: string
          entorno: Database["public"]["Enums"]["entorno_venta_enum"]
          id: string
          metodo_pago:
            | Database["public"]["Enums"]["metodo_pago_rastreador_enum"]
            | null
          numero_cuotas: number | null
          precio_total: number
          tipo_pago: Database["public"]["Enums"]["tipo_pago_enum"]
          total_financiado: number | null
          url_comprobante_pago: string | null
        }
        Insert: {
          abono_inicial?: number | null
          created_at?: string | null
          dispositivo_id: string
          entorno: Database["public"]["Enums"]["entorno_venta_enum"]
          id?: string
          metodo_pago?:
            | Database["public"]["Enums"]["metodo_pago_rastreador_enum"]
            | null
          numero_cuotas?: number | null
          precio_total: number
          tipo_pago: Database["public"]["Enums"]["tipo_pago_enum"]
          total_financiado?: number | null
          url_comprobante_pago?: string | null
        }
        Update: {
          abono_inicial?: number | null
          created_at?: string | null
          dispositivo_id?: string
          entorno?: Database["public"]["Enums"]["entorno_venta_enum"]
          id?: string
          metodo_pago?:
            | Database["public"]["Enums"]["metodo_pago_rastreador_enum"]
            | null
          numero_cuotas?: number | null
          precio_total?: number
          tipo_pago?: Database["public"]["Enums"]["tipo_pago_enum"]
          total_financiado?: number | null
          url_comprobante_pago?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_venta_dispositivo"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos_rastreo"
            referencedColumns: ["id"]
          },
        ]
      }
      web_appointments: {
        Row: {
          appointment_date: string
          client_user_id: string
          created_at: string | null
          id: number
          inventory_id: string | null
          notes: string | null
          responsible_id: string | null
          sell_request_id: number | null
          status: Database["public"]["Enums"]["web_appointment_status"] | null
          type: string
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          client_user_id: string
          created_at?: string | null
          id?: never
          inventory_id?: string | null
          notes?: string | null
          responsible_id?: string | null
          sell_request_id?: number | null
          status?: Database["public"]["Enums"]["web_appointment_status"] | null
          type: string
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          client_user_id?: string
          created_at?: string | null
          id?: never
          inventory_id?: string | null
          notes?: string | null
          responsible_id?: string | null
          sell_request_id?: number | null
          status?: Database["public"]["Enums"]["web_appointment_status"] | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "web_appointments_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_appointments_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_appointments_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_appointments_sell_request_id_fkey"
            columns: ["sell_request_id"]
            isOneToOne: false
            referencedRelation: "web_sell_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      web_blog_posts: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: number
          is_published: boolean | null
          main_image_url: string | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: never
          is_published?: boolean | null
          main_image_url?: string | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: never
          is_published?: boolean | null
          main_image_url?: string | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      web_favorites: {
        Row: {
          created_at: string | null
          id: number
          inventory_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          inventory_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: never
          inventory_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_favorites_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      web_sell_requests: {
        Row: {
          brand: string
          client_asking_price: number | null
          color: string | null
          created_at: string | null
          description: string | null
          has_crashes: boolean | null
          id: number
          mileage: number
          model: string
          papers_ok: boolean | null
          photos_urls: string[] | null
          plate_first_letter: string | null
          plate_last_digit: string | null
          state_rating: number | null
          status: string | null
          transmission: string | null
          unique_owner: boolean | null
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          brand: string
          client_asking_price?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          has_crashes?: boolean | null
          id?: never
          mileage: number
          model: string
          papers_ok?: boolean | null
          photos_urls?: string[] | null
          plate_first_letter?: string | null
          plate_last_digit?: string | null
          state_rating?: number | null
          status?: string | null
          transmission?: string | null
          unique_owner?: boolean | null
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          brand?: string
          client_asking_price?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          has_crashes?: boolean | null
          id?: never
          mileage?: number
          model?: string
          papers_ok?: boolean | null
          photos_urls?: string[] | null
          plate_first_letter?: string | null
          plate_last_digit?: string | null
          state_rating?: number | null
          status?: string | null
          transmission?: string | null
          unique_owner?: boolean | null
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "web_sell_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      web_testimonials: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_name: string
          display_on_home: boolean | null
          id: number
          inventory_reference_id: string | null
          photo_url: string | null
          rating: number | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_name: string
          display_on_home?: boolean | null
          id?: never
          inventory_reference_id?: string | null
          photo_url?: string | null
          rating?: number | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_name?: string
          display_on_home?: boolean | null
          id?: never
          inventory_reference_id?: string | null
          photo_url?: string | null
          rating?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "web_testimonials_inventory_reference_id_fkey"
            columns: ["inventory_reference_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_testimonials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_leads_pager: {
        Args: {
          p_assigned: string
          p_date_range: string
          p_exact_date: string
          p_page_number: number
          p_page_size: number
          p_resp_mode: string
          p_search: string
          p_status: string
          p_temp: string
        }
        Returns: {
          assigned_profile_json: Json
          assigned_to: string
          created_at: string
          full_count: number
          id: number
          interested_cars_json: Json
          lead_id_kommo: number
          name: string
          phone: string
          responded_count: number
          resume: string
          status: Database["public"]["Enums"]["lead_status"]
          temperature: Database["public"]["Enums"]["lead_temperature"]
          updated_at: string
        }[]
      }
      get_leads_reactivar_hoy: {
        Args: { desplazamiento?: number; limite?: number }
        Returns: {
          created_at: string
          dias_transcurridos: number
          lead_id: number
          lead_id_kommo: number
          mensajes_previos: string[]
          name: string
          phone: string
          status: string
          tipo_mensaje: string
        }[]
      }
      is_admin_or_marketing: { Args: never; Returns: boolean }
      is_role: { Args: { required_role: string }; Returns: boolean }
      match_inventory: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      match_inventoryoracle: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      normalize_text: { Args: { text_input: string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_price_statistics: {
        Args: { p_brand: string; p_model: string; p_year?: string }
        Returns: undefined
      }
    }
    Enums: {
      acquisition_source:
        | "facebook"
        | "instagram"
        | "whatsapp"
        | "website"
        | "referido"
        | "kommo_legacy"
        | "otro"
        | "waba"
        | "instagram_business"
        | "tiktok_kommo"
      appointment_status:
        | "pendiente"
        | "confirmada"
        | "completada"
        | "cancelada"
        | "reprogramada"
        | "no_asistio"
      car_location: "patio" | "taller" | "showroom" | "otro"
      car_ownership: "propio" | "consignacion" | "intercambio"
      car_status:
        | "disponible"
        | "reservado"
        | "vendido"
        | "devuelto"
        | "mantenimiento"
        | "conwilsonhernan"
        | "consignacion"
      credit_status: "aplica" | "no_aplica" | "pendiente" | "no_interesa"
      entorno_venta_enum: "KSI_NUEVOS" | "EXTERNO"
      estado_cuota_enum: "PENDIENTE" | "PAGADA"
      estado_dispositivo_enum:
        | "PENDIENTE_INSTALACION"
        | "INSTALADO"
        | "ACTIVO"
        | "SUSPENDIDO"
        | "RETIRADO"
      interaction_type:
        | "llamada"
        | "whatsapp"
        | "email"
        | "visita"
        | "sms"
        | "nota_interna"
        | "kommo"
      lead_message_response:
        | "no_le_interesa"
        | "ya_compro"
        | "no_molesten"
        | "no_hubo_respuesta"
        | "continua_conversacion"
      lead_status:
        | "nuevo"
        | "contactado"
        | "interesado"
        | "negociando"
        | "ganado"
        | "perdido"
        | "en_proceso"
        | "datos_pedidos"
      lead_temperature: "frio" | "tibio" | "caliente"
      metodo_pago_rastreador_enum:
        | "EFECTIVO"
        | "TRANSFERENCIA"
        | "DEPOSITO"
        | "CHEQUE"
      request_priority: "baja" | "media" | "alta"
      request_status: "pendiente" | "aprobado" | "comprado" | "rechazado"
      scraper_car_location: "patio" | "taller" | "cliente"
      scraper_car_status: "NUEVO" | "DESCARTADO" | "VENDIDO" | "MANTENIMIENTO"
      scraper_vehicles_status_enum:
        | "nuevo"
        | "descartado"
        | "contactado"
        | "vendido"
      taller_estado_orden:
        | "recepcion"
        | "presupuesto"
        | "en_cola"
        | "en_proceso"
        | "control_calidad"
        | "terminado"
        | "entregado"
        | "cancelado"
      taller_tipo_item: "material" | "herramienta" | "repuesto"
      taller_tipo_transaccion:
        | "ingreso"
        | "gasto_operativo"
        | "pago_proveedor"
        | "nomina"
        | "obligaciones"
        | "otros"
      tipo_pago_enum: "CONTADO" | "CREDITO"
      user_role_enum:
        | "admin"
        | "vendedor"
        | "cliente"
        | "marketing"
        | "finanzas"
        | "contable"
      vehicle_request_type:
        | "sedan"
        | "suv"
        | "camioneta"
        | "deportivo"
        | "hatchback"
        | "van"
      vehicle_status: "NEW" | "DISCARDED" | "CONTACTED" | "BOUGHT"
      visit_source: "showroom" | "redes_sociales" | "referido" | "cita" | "otro"
      web_appointment_status:
        | "pendiente"
        | "aceptado"
        | "cancelado"
        | "reprogramado"
        | "atendido"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      acquisition_source: [
        "facebook",
        "instagram",
        "whatsapp",
        "website",
        "referido",
        "kommo_legacy",
        "otro",
        "waba",
        "instagram_business",
        "tiktok_kommo",
      ],
      appointment_status: [
        "pendiente",
        "confirmada",
        "completada",
        "cancelada",
        "reprogramada",
        "no_asistio",
      ],
      car_location: ["patio", "taller", "showroom", "otro"],
      car_ownership: ["propio", "consignacion", "intercambio"],
      car_status: [
        "disponible",
        "reservado",
        "vendido",
        "devuelto",
        "mantenimiento",
        "conwilsonhernan",
        "consignacion",
      ],
      credit_status: ["aplica", "no_aplica", "pendiente", "no_interesa"],
      entorno_venta_enum: ["KSI_NUEVOS", "EXTERNO"],
      estado_cuota_enum: ["PENDIENTE", "PAGADA"],
      estado_dispositivo_enum: [
        "PENDIENTE_INSTALACION",
        "INSTALADO",
        "ACTIVO",
        "SUSPENDIDO",
        "RETIRADO",
      ],
      interaction_type: [
        "llamada",
        "whatsapp",
        "email",
        "visita",
        "sms",
        "nota_interna",
        "kommo",
      ],
      lead_message_response: [
        "no_le_interesa",
        "ya_compro",
        "no_molesten",
        "no_hubo_respuesta",
        "continua_conversacion",
      ],
      lead_status: [
        "nuevo",
        "contactado",
        "interesado",
        "negociando",
        "ganado",
        "perdido",
        "en_proceso",
        "datos_pedidos",
      ],
      lead_temperature: ["frio", "tibio", "caliente"],
      metodo_pago_rastreador_enum: [
        "EFECTIVO",
        "TRANSFERENCIA",
        "DEPOSITO",
        "CHEQUE",
      ],
      request_priority: ["baja", "media", "alta"],
      request_status: ["pendiente", "aprobado", "comprado", "rechazado"],
      scraper_car_location: ["patio", "taller", "cliente"],
      scraper_car_status: ["NUEVO", "DESCARTADO", "VENDIDO", "MANTENIMIENTO"],
      scraper_vehicles_status_enum: [
        "nuevo",
        "descartado",
        "contactado",
        "vendido",
      ],
      taller_estado_orden: [
        "recepcion",
        "presupuesto",
        "en_cola",
        "en_proceso",
        "control_calidad",
        "terminado",
        "entregado",
        "cancelado",
      ],
      taller_tipo_item: ["material", "herramienta", "repuesto"],
      taller_tipo_transaccion: [
        "ingreso",
        "gasto_operativo",
        "pago_proveedor",
        "nomina",
        "obligaciones",
        "otros",
      ],
      tipo_pago_enum: ["CONTADO", "CREDITO"],
      user_role_enum: [
        "admin",
        "vendedor",
        "cliente",
        "marketing",
        "finanzas",
        "contable",
      ],
      vehicle_request_type: [
        "sedan",
        "suv",
        "camioneta",
        "deportivo",
        "hatchback",
        "van",
      ],
      vehicle_status: ["NEW", "DISCARDED", "CONTACTED", "BOUGHT"],
      visit_source: ["showroom", "redes_sociales", "referido", "cita", "otro"],
      web_appointment_status: [
        "pendiente",
        "aceptado",
        "cancelado",
        "reprogramado",
        "atendido",
      ],
    },
  },
} as const
