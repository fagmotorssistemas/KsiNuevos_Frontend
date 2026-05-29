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
      agent_prompts: {
        Row: {
          content: string
          created_at: string | null
          id: number
          name: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: number
          name: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          created_at: string | null
          external_client_name: string | null
          id: number
          is_completed: boolean
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
          is_completed?: boolean
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
          is_completed?: boolean
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
      aseguradoras: {
        Row: {
          activa: boolean | null
          created_at: string | null
          direccion: string | null
          email: string | null
          id: string
          nombre: string
          observaciones: string | null
          porcentaje_base_seguro: number | null
          ruc: string | null
          telefono: string | null
          trabaja_con_gps: boolean | null
        }
        Insert: {
          activa?: boolean | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombre: string
          observaciones?: string | null
          porcentaje_base_seguro?: number | null
          ruc?: string | null
          telefono?: string | null
          trabaja_con_gps?: boolean | null
        }
        Update: {
          activa?: boolean | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          observaciones?: string | null
          porcentaje_base_seguro?: number | null
          ruc?: string | null
          telefono?: string | null
          trabaja_con_gps?: boolean | null
        }
        Relationships: []
      }
      asesoria_financiamiento: {
        Row: {
          estado: Database["public"]["Enums"]["estado_financiamiento"] | null
          fecha_resolucion: string | null
          fecha_solicitud: string | null
          id: number
          lead_id: number
          mensaje_completo: string | null
          notas_vendedor: string | null
        }
        Insert: {
          estado?: Database["public"]["Enums"]["estado_financiamiento"] | null
          fecha_resolucion?: string | null
          fecha_solicitud?: string | null
          id?: number
          lead_id: number
          mensaje_completo?: string | null
          notas_vendedor?: string | null
        }
        Update: {
          estado?: Database["public"]["Enums"]["estado_financiamiento"] | null
          fecha_resolucion?: string | null
          fecha_solicitud?: string | null
          id?: number
          lead_id?: number
          mensaje_completo?: string | null
          notas_vendedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_asesoria_financiamiento_lead"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      asesoria_financiamiento_evidencia: {
        Row: {
          created_at: string
          created_by: string | null
          file_name: string | null
          gestion_id: number
          id: number
          mime_type: string | null
          size_bytes: number | null
          storage_bucket: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          gestion_id: number
          id?: number
          mime_type?: string | null
          size_bytes?: number | null
          storage_bucket?: string
          storage_path: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          gestion_id?: number
          id?: number
          mime_type?: string | null
          size_bytes?: number | null
          storage_bucket?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "asesoria_financiamiento_evidencia_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asesoria_financiamiento_evidencia_gestion_id_fkey"
            columns: ["gestion_id"]
            isOneToOne: false
            referencedRelation: "asesoria_financiamiento_gestion"
            referencedColumns: ["id"]
          },
        ]
      }
      asesoria_financiamiento_gestion: {
        Row: {
          aplica: boolean | null
          asesor_contactado_nombre: string | null
          asesor_contactado_telefono: string | null
          asesoria_id: number
          banco_deseado: string | null
          cedula: string | null
          created_at: string
          created_by: string | null
          garante_detalle: string | null
          gestion_detalle: string | null
          id: number
          image_urls: string[]
          monto_aprobable_max: number | null
          motivo_no_aplica: string | null
          pdf_urls: string[]
          plazo_meses_max: number | null
          requiere_garante: boolean
          se_solicito_cedula: boolean
          tipo: Database["public"]["Enums"]["tipo_gestion_financiamiento"]
        }
        Insert: {
          aplica?: boolean | null
          asesor_contactado_nombre?: string | null
          asesor_contactado_telefono?: string | null
          asesoria_id: number
          banco_deseado?: string | null
          cedula?: string | null
          created_at?: string
          created_by?: string | null
          garante_detalle?: string | null
          gestion_detalle?: string | null
          id?: number
          image_urls?: string[]
          monto_aprobable_max?: number | null
          motivo_no_aplica?: string | null
          pdf_urls?: string[]
          plazo_meses_max?: number | null
          requiere_garante?: boolean
          se_solicito_cedula?: boolean
          tipo: Database["public"]["Enums"]["tipo_gestion_financiamiento"]
        }
        Update: {
          aplica?: boolean | null
          asesor_contactado_nombre?: string | null
          asesor_contactado_telefono?: string | null
          asesoria_id?: number
          banco_deseado?: string | null
          cedula?: string | null
          created_at?: string
          created_by?: string | null
          garante_detalle?: string | null
          gestion_detalle?: string | null
          id?: number
          image_urls?: string[]
          monto_aprobable_max?: number | null
          motivo_no_aplica?: string | null
          pdf_urls?: string[]
          plazo_meses_max?: number | null
          requiere_garante?: boolean
          se_solicito_cedula?: boolean
          tipo?: Database["public"]["Enums"]["tipo_gestion_financiamiento"]
        }
        Relationships: [
          {
            foreignKeyName: "asesoria_financiamiento_gestion_asesoria_id_fkey"
            columns: ["asesoria_id"]
            isOneToOne: false
            referencedRelation: "asesoria_financiamiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asesoria_financiamiento_gestion_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_recovery_markers: {
        Row: {
          marker_key: string
          run_day: string
          updated_at: string
        }
        Insert: {
          marker_key: string
          run_day: string
          updated_at?: string
        }
        Update: {
          marker_key?: string
          run_day?: string
          updated_at?: string
        }
        Relationships: []
      }
      brokers: {
        Row: {
          activo: boolean | null
          created_at: string | null
          email: string | null
          empresa: string | null
          id: string
          nombre: string
          porcentaje_comision: number | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          email?: string | null
          empresa?: string | null
          id?: string
          nombre: string
          porcentaje_comision?: number | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          email?: string | null
          empresa?: string | null
          id?: string
          nombre?: string
          porcentaje_comision?: number | null
          telefono?: string | null
        }
        Relationships: []
      }
      cartera_clientes: {
        Row: {
          cliente_id: string
          created_at: string
          deuda: number
          estado: string
          etapa_cobranza: string | null
          fecha_notificacion: string | null
          fecha_ultimo_envio: string | null
          fecha_vencimiento: string | null
          id: number
          nombre: string | null
          notificado: boolean
          proximo_envio_at: string | null
          telefono: string | null
          ultima_etapa_enviada: string | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          deuda?: number
          estado?: string
          etapa_cobranza?: string | null
          fecha_notificacion?: string | null
          fecha_ultimo_envio?: string | null
          fecha_vencimiento?: string | null
          id?: number
          nombre?: string | null
          notificado?: boolean
          proximo_envio_at?: string | null
          telefono?: string | null
          ultima_etapa_enviada?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          deuda?: number
          estado?: string
          etapa_cobranza?: string | null
          fecha_notificacion?: string | null
          fecha_ultimo_envio?: string | null
          fecha_vencimiento?: string | null
          id?: number
          nombre?: string | null
          notificado?: boolean
          proximo_envio_at?: string | null
          telefono?: string | null
          ultima_etapa_enviada?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cartera_manual: {
        Row: {
          activo: boolean
          created_at: string
          created_by: string | null
          dias_mora: number
          direccion: string | null
          email: string | null
          estado_operacion: string
          fecha_venta: string | null
          frecuencia_pago: string | null
          garante_direccion: string | null
          garante_identificacion: string | null
          garante_nombre: string | null
          garante_telefono: string | null
          id: string
          identificacion: string | null
          monto_original: number | null
          nombre_completo: string
          notas_internas: string | null
          numero_cuotas_pagadas: number
          numero_cuotas_total: number | null
          proximo_vencimiento: string | null
          saldo_actual: number
          telefono_1: string | null
          telefono_2: string | null
          updated_at: string
          valor_cuota: number | null
          vehiculo_anio: string | null
          vehiculo_marca: string | null
          vehiculo_modelo: string | null
          vehiculo_placa: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          created_by?: string | null
          dias_mora?: number
          direccion?: string | null
          email?: string | null
          estado_operacion?: string
          fecha_venta?: string | null
          frecuencia_pago?: string | null
          garante_direccion?: string | null
          garante_identificacion?: string | null
          garante_nombre?: string | null
          garante_telefono?: string | null
          id?: string
          identificacion?: string | null
          monto_original?: number | null
          nombre_completo: string
          notas_internas?: string | null
          numero_cuotas_pagadas?: number
          numero_cuotas_total?: number | null
          proximo_vencimiento?: string | null
          saldo_actual?: number
          telefono_1?: string | null
          telefono_2?: string | null
          updated_at?: string
          valor_cuota?: number | null
          vehiculo_anio?: string | null
          vehiculo_marca?: string | null
          vehiculo_modelo?: string | null
          vehiculo_placa?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          created_by?: string | null
          dias_mora?: number
          direccion?: string | null
          email?: string | null
          estado_operacion?: string
          fecha_venta?: string | null
          frecuencia_pago?: string | null
          garante_direccion?: string | null
          garante_identificacion?: string | null
          garante_nombre?: string | null
          garante_telefono?: string | null
          id?: string
          identificacion?: string | null
          monto_original?: number | null
          nombre_completo?: string
          notas_internas?: string | null
          numero_cuotas_pagadas?: number
          numero_cuotas_total?: number | null
          proximo_vencimiento?: string | null
          saldo_actual?: number
          telefono_1?: string | null
          telefono_2?: string | null
          updated_at?: string
          valor_cuota?: number | null
          vehiculo_anio?: string | null
          vehiculo_marca?: string | null
          vehiculo_modelo?: string | null
          vehiculo_placa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cartera_manual_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cartera_manual_delete_requests: {
        Row: {
          cartera_manual_id: string
          created_at: string
          estado: string
          id: string
          motivo: string
          requested_by: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          cartera_manual_id: string
          created_at?: string
          estado?: string
          id?: string
          motivo: string
          requested_by: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          cartera_manual_id?: string
          created_at?: string
          estado?: string
          id?: string
          motivo?: string
          requested_by?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cartera_manual_delete_requests_cartera_manual_id_fkey"
            columns: ["cartera_manual_id"]
            isOneToOne: false
            referencedRelation: "cartera_manual"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartera_manual_delete_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartera_manual_delete_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_events: {
        Row: {
          canal: string | null
          case_id: string
          descripcion: string | null
          detalle: string | null
          documento_id: string | null
          etapa_id: string | null
          fecha: string
          id: string
          imagenes_ids: string[] | null
          resultado: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          canal?: string | null
          case_id: string
          descripcion?: string | null
          detalle?: string | null
          documento_id?: string | null
          etapa_id?: string | null
          fecha?: string
          id?: string
          imagenes_ids?: string[] | null
          resultado?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          canal?: string | null
          case_id?: string
          descripcion?: string | null
          detalle?: string | null
          documento_id?: string | null
          etapa_id?: string | null
          fecha?: string
          id?: string
          imagenes_ids?: string[] | null
          resultado?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_events_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "proceso_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_case_events_case"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_status_history: {
        Row: {
          case_id: string
          estado_anterior: string | null
          estado_nuevo: string | null
          fecha: string | null
          id: string
          usuario_id: string | null
        }
        Insert: {
          case_id: string
          estado_anterior?: string | null
          estado_nuevo?: string | null
          fecha?: string | null
          id?: string
          usuario_id?: string | null
        }
        Update: {
          case_id?: string
          estado_anterior?: string | null
          estado_nuevo?: string | null
          fecha?: string | null
          id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_case_status_case"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_tasks: {
        Row: {
          case_id: string
          completed_at: string | null
          created_at: string | null
          descripcion: string | null
          estado: string | null
          etapa_id: string | null
          fecha_limite: string
          id: string
          tipo: string | null
          usuario_id: string | null
        }
        Insert: {
          case_id: string
          completed_at?: string | null
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          etapa_id?: string | null
          fecha_limite: string
          id?: string
          tipo?: string | null
          usuario_id?: string | null
        }
        Update: {
          case_id?: string
          completed_at?: string | null
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          etapa_id?: string | null
          fecha_limite?: string
          id?: string
          tipo?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_tasks_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "proceso_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_case_tasks_case"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          abogado_id: string | null
          cartera_manual_id: string | null
          contactabilidad:
            | Database["public"]["Enums"]["contactabilidad_enum"]
            | null
          created_at: string | null
          estado: Database["public"]["Enums"]["estado_caso_enum"]
          estado_vehiculo:
            | Database["public"]["Enums"]["estado_vehiculo_enum"]
            | null
          etapa_actual_id: string | null
          fecha_inicio: string | null
          fecha_proxima_accion: string | null
          fecha_ultima_gestion: string | null
          id: string
          id_sistema: number | null
          intencion_pago:
            | Database["public"]["Enums"]["intencion_pago_enum"]
            | null
          monto_referencia: number | null
          objetivo_caso:
            | Database["public"]["Enums"]["objetivo_caso_enum"]
            | null
          prioridad: string | null
          proxima_accion: string | null
          riesgo: string | null
          tipo_proceso: Database["public"]["Enums"]["tipo_proceso_enum"] | null
          updated_at: string | null
        }
        Insert: {
          abogado_id?: string | null
          cartera_manual_id?: string | null
          contactabilidad?:
            | Database["public"]["Enums"]["contactabilidad_enum"]
            | null
          created_at?: string | null
          estado: Database["public"]["Enums"]["estado_caso_enum"]
          estado_vehiculo?:
            | Database["public"]["Enums"]["estado_vehiculo_enum"]
            | null
          etapa_actual_id?: string | null
          fecha_inicio?: string | null
          fecha_proxima_accion?: string | null
          fecha_ultima_gestion?: string | null
          id?: string
          id_sistema?: number | null
          intencion_pago?:
            | Database["public"]["Enums"]["intencion_pago_enum"]
            | null
          monto_referencia?: number | null
          objetivo_caso?:
            | Database["public"]["Enums"]["objetivo_caso_enum"]
            | null
          prioridad?: string | null
          proxima_accion?: string | null
          riesgo?: string | null
          tipo_proceso?: Database["public"]["Enums"]["tipo_proceso_enum"] | null
          updated_at?: string | null
        }
        Update: {
          abogado_id?: string | null
          cartera_manual_id?: string | null
          contactabilidad?:
            | Database["public"]["Enums"]["contactabilidad_enum"]
            | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_caso_enum"]
          estado_vehiculo?:
            | Database["public"]["Enums"]["estado_vehiculo_enum"]
            | null
          etapa_actual_id?: string | null
          fecha_inicio?: string | null
          fecha_proxima_accion?: string | null
          fecha_ultima_gestion?: string | null
          id?: string
          id_sistema?: number | null
          intencion_pago?:
            | Database["public"]["Enums"]["intencion_pago_enum"]
            | null
          monto_referencia?: number | null
          objetivo_caso?:
            | Database["public"]["Enums"]["objetivo_caso_enum"]
            | null
          prioridad?: string | null
          proxima_accion?: string | null
          riesgo?: string | null
          tipo_proceso?: Database["public"]["Enums"]["tipo_proceso_enum"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_cartera_manual_id_fkey"
            columns: ["cartera_manual_id"]
            isOneToOne: false
            referencedRelation: "cartera_manual"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_etapa_actual_id_fkey"
            columns: ["etapa_actual_id"]
            isOneToOne: false
            referencedRelation: "proceso_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_externos: {
        Row: {
          created_at: string | null
          direccion: string | null
          email: string | null
          id: string
          identificacion: string | null
          nombre_completo: string
          telefono: string | null
        }
        Insert: {
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          identificacion?: string | null
          nombre_completo: string
          telefono?: string | null
        }
        Update: {
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          identificacion?: string | null
          nombre_completo?: string
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
      daily_metrics_report: {
        Row: {
          alertas: Json | null
          analisis_guiones: string | null
          analisis_marcas: string | null
          autos_publicados: number
          autos_sin_leads: number
          conversion_vs_ayer: number | null
          costo_por_lead: number
          created_at: string
          generated_at: string
          id: string
          leads_directo: number
          leads_organico: number
          leads_pagado: number
          leads_sin_vehiculo: number
          leads_total: number
          leads_vs_ayer: number | null
          mejor_marca: string | null
          mejor_tipo_guion: string | null
          peor_tipo_guion: string | null
          raw_data: Json | null
          recomendaciones: string | null
          report_date: string
          resumen_ejecutivo: string | null
          spend_total: number
        }
        Insert: {
          alertas?: Json | null
          analisis_guiones?: string | null
          analisis_marcas?: string | null
          autos_publicados?: number
          autos_sin_leads?: number
          conversion_vs_ayer?: number | null
          costo_por_lead?: number
          created_at?: string
          generated_at?: string
          id?: string
          leads_directo?: number
          leads_organico?: number
          leads_pagado?: number
          leads_sin_vehiculo?: number
          leads_total?: number
          leads_vs_ayer?: number | null
          mejor_marca?: string | null
          mejor_tipo_guion?: string | null
          peor_tipo_guion?: string | null
          raw_data?: Json | null
          recomendaciones?: string | null
          report_date: string
          resumen_ejecutivo?: string | null
          spend_total?: number
        }
        Update: {
          alertas?: Json | null
          analisis_guiones?: string | null
          analisis_marcas?: string | null
          autos_publicados?: number
          autos_sin_leads?: number
          conversion_vs_ayer?: number | null
          costo_por_lead?: number
          created_at?: string
          generated_at?: string
          id?: string
          leads_directo?: number
          leads_organico?: number
          leads_pagado?: number
          leads_sin_vehiculo?: number
          leads_total?: number
          leads_vs_ayer?: number | null
          mejor_marca?: string | null
          mejor_tipo_guion?: string | null
          peor_tipo_guion?: string | null
          raw_data?: Json | null
          recomendaciones?: string | null
          report_date?: string
          resumen_ejecutivo?: string | null
          spend_total?: number
        }
        Relationships: []
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
      generated_artifacts: {
        Row: {
          car_image_url: string
          created_at: string
          id: string
          kind: string
          output_path: string | null
          output_url: string | null
          overlay_text: Json | null
          price: string | null
          template_id: string | null
          title: string | null
        }
        Insert: {
          car_image_url: string
          created_at?: string
          id?: string
          kind?: string
          output_path?: string | null
          output_url?: string | null
          overlay_text?: Json | null
          price?: string | null
          template_id?: string | null
          title?: string | null
        }
        Update: {
          car_image_url?: string
          created_at?: string
          id?: string
          kind?: string
          output_path?: string | null
          output_url?: string | null
          overlay_text?: Json | null
          price?: string | null
          template_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_artifacts_template_fk"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
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
          estado_coneccion: string | null
          factura_compra: string | null
          fecha_compra: string | null
          id: string
          imei: string
          modelo_id: string | null
          proveedor_id: string | null
          serie: string | null
        }
        Insert: {
          costo_compra: number
          created_at?: string | null
          estado?: string | null
          estado_coneccion?: string | null
          factura_compra?: string | null
          fecha_compra?: string | null
          id?: string
          imei: string
          modelo_id?: string | null
          proveedor_id?: string | null
          serie?: string | null
        }
        Update: {
          costo_compra?: number
          created_at?: string | null
          estado?: string | null
          estado_coneccion?: string | null
          factura_compra?: string | null
          fecha_compra?: string | null
          id?: string
          imei?: string
          modelo_id?: string | null
          proveedor_id?: string | null
          serie?: string | null
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
          provedor_id: string | null
        }
        Insert: {
          costo_referencia?: number | null
          id?: string
          marca?: string | null
          provedor_id?: string | null
        }
        Update: {
          costo_referencia?: number | null
          id?: string
          marca?: string | null
          provedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gps_modelos_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "gps_proveedores"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string | null
          gps_id: string | null
          iccid: string
          id: string
          imsi: string | null
        }
        Insert: {
          created_at?: string | null
          gps_id?: string | null
          iccid: string
          id?: string
          imsi?: string | null
        }
        Update: {
          created_at?: string | null
          gps_id?: string | null
          iccid?: string
          id?: string
          imsi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gps_sims_gps_id_fkey"
            columns: ["gps_id"]
            isOneToOne: false
            referencedRelation: "gps_inventario"
            referencedColumns: ["id"]
          },
        ]
      }
      informative_posts: {
        Row: {
          attempt_count: number
          caption_facebook: string | null
          caption_instagram: string | null
          carousel_format: string | null
          created_at: string
          error_message: string | null
          facebook_permalink: string | null
          facebook_post_id: string | null
          headline: string
          id: string
          image_path: string | null
          image_url: string | null
          image_urls: Json | null
          instagram_media_id: string | null
          instagram_permalink: string | null
          next_retry_at: string | null
          published_at: string | null
          scheduled_for: string | null
          source_snippet: string | null
          source_title: string | null
          source_url: string | null
          source_url_hash: string
          status: string
          story_hash: string | null
          summary_es: string | null
          topic_key: string | null
          type: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          caption_facebook?: string | null
          caption_instagram?: string | null
          carousel_format?: string | null
          created_at?: string
          error_message?: string | null
          facebook_permalink?: string | null
          facebook_post_id?: string | null
          headline: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          image_urls?: Json | null
          instagram_media_id?: string | null
          instagram_permalink?: string | null
          next_retry_at?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          source_snippet?: string | null
          source_title?: string | null
          source_url?: string | null
          source_url_hash: string
          status?: string
          story_hash?: string | null
          summary_es?: string | null
          topic_key?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          caption_facebook?: string | null
          caption_instagram?: string | null
          carousel_format?: string | null
          created_at?: string
          error_message?: string | null
          facebook_permalink?: string | null
          facebook_post_id?: string | null
          headline?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          image_urls?: Json | null
          instagram_media_id?: string | null
          instagram_permalink?: string | null
          next_retry_at?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          source_snippet?: string | null
          source_title?: string | null
          source_url?: string | null
          source_url_hash?: string
          status?: string
          story_hash?: string | null
          summary_es?: string | null
          topic_key?: string | null
          type?: string
          updated_at?: string
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
          created_at: string | null
          id: number
          inventory_id: string | null
          lead_id: number
          updated_at: string | null
          vehicle_uid: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          inventory_id?: string | null
          lead_id: number
          updated_at?: string | null
          vehicle_uid?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          inventory_id?: string | null
          lead_id?: number
          updated_at?: string | null
          vehicle_uid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_interested_lead_id"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interested_cars_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
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
      inventory_auto_publication: {
        Row: {
          attempt_count: number
          caption_facebook: string | null
          caption_instagram: string | null
          created_at: string
          error_message: string | null
          facebook_permalink: string | null
          facebook_post_id: string | null
          id: string
          instagram_media_id: string | null
          instagram_permalink: string | null
          kind: string
          next_retry_at: string | null
          scheduled_for: string | null
          status: string
          theme_id: string | null
          updated_at: string
          vehicle_id: string | null
          vehicle_ids: string[] | null
        }
        Insert: {
          attempt_count?: number
          caption_facebook?: string | null
          caption_instagram?: string | null
          created_at?: string
          error_message?: string | null
          facebook_permalink?: string | null
          facebook_post_id?: string | null
          id?: string
          instagram_media_id?: string | null
          instagram_permalink?: string | null
          kind: string
          next_retry_at?: string | null
          scheduled_for?: string | null
          status?: string
          theme_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_ids?: string[] | null
        }
        Update: {
          attempt_count?: number
          caption_facebook?: string | null
          caption_instagram?: string | null
          created_at?: string
          error_message?: string | null
          facebook_permalink?: string | null
          facebook_post_id?: string | null
          id?: string
          instagram_media_id?: string | null
          instagram_permalink?: string | null
          kind?: string
          next_retry_at?: string | null
          scheduled_for?: string | null
          status?: string
          theme_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_auto_publication_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_vehicle_debts: {
        Row: {
          amount: number | null
          created_at: string
          debt_type: string
          detail_text: string | null
          id: string
          institution: string | null
          inventoryoracle_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          debt_type: string
          detail_text?: string | null
          id?: string
          institution?: string | null
          inventoryoracle_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          debt_type?: string
          detail_text?: string | null
          id?: string
          institution?: string | null
          inventoryoracle_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_vehicle_debts_inventoryoracle_id_fkey"
            columns: ["inventoryoracle_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_vehicle_document_files: {
        Row: {
          created_at: string
          document_id: string
          file_name: string
          file_path: string
          file_url: string
          id: string
          mime_type: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_id: string
          file_name: string
          file_path: string
          file_url: string
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string
          file_name?: string
          file_path?: string
          file_url?: string
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_vehicle_document_files_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "inventory_vehicle_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_vehicle_document_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_vehicle_documents: {
        Row: {
          category: string
          created_at: string
          detail_text: string | null
          doc_type: string
          expires_at: string | null
          file_name: string | null
          file_path: string | null
          file_url: string | null
          id: string
          inventoryoracle_id: string
          mime_type: string | null
          status: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          detail_text?: string | null
          doc_type: string
          expires_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          inventoryoracle_id: string
          mime_type?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          detail_text?: string | null
          doc_type?: string
          expires_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          inventoryoracle_id?: string
          mime_type?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_vehicle_documents_inventoryoracle_id_fkey"
            columns: ["inventoryoracle_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_vehicle_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_vehicle_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_type: string
          id: string
          inventoryoracle_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          inventoryoracle_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          inventoryoracle_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_vehicle_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_vehicle_events_inventoryoracle_id_fkey"
            columns: ["inventoryoracle_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_vehicle_fines: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          fine_date: string | null
          id: string
          inventoryoracle_id: string
          location: string | null
          payer_notes: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          fine_date?: string | null
          id?: string
          inventoryoracle_id: string
          location?: string | null
          payer_notes?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          fine_date?: string | null
          id?: string
          inventoryoracle_id?: string
          location?: string | null
          payer_notes?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_vehicle_fines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_vehicle_fines_inventoryoracle_id_fkey"
            columns: ["inventoryoracle_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_vehicle_internal_notes: {
        Row: {
          author_name: string
          created_at: string
          created_by: string | null
          id: string
          inventoryoracle_id: string
          note_text: string
          updated_at: string
        }
        Insert: {
          author_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          inventoryoracle_id: string
          note_text: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inventoryoracle_id?: string
          note_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_vehicle_internal_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_vehicle_internal_notes_inventoryoracle_id_fkey"
            columns: ["inventoryoracle_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_vehicle_owners: {
        Row: {
          created_at: string
          from_date: string | null
          id: string
          id_number: string | null
          inventoryoracle_id: string
          is_current: boolean
          notes: string | null
          owner_name: string
          sort_order: number
          to_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_date?: string | null
          id?: string
          id_number?: string | null
          inventoryoracle_id: string
          is_current?: boolean
          notes?: string | null
          owner_name: string
          sort_order?: number
          to_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_date?: string | null
          id?: string
          id_number?: string | null
          inventoryoracle_id?: string
          is_current?: boolean
          notes?: string | null
          owner_name?: string
          sort_order?: number
          to_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_vehicle_owners_inventoryoracle_id_fkey"
            columns: ["inventoryoracle_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
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
          listing_checklist: Json
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
          listing_checklist?: Json
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
          listing_checklist?: Json
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
          stop: boolean | null
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
          stop?: boolean | null
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
          stop?: boolean | null
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
      lead_temperature_history: {
        Row: {
          campaign_month: string
          id: number
          lead_id: number
          recorded_at: string
          temperature: Database["public"]["Enums"]["lead_temperature"]
        }
        Insert: {
          campaign_month: string
          id?: never
          lead_id: number
          recorded_at?: string
          temperature: Database["public"]["Enums"]["lead_temperature"]
        }
        Update: {
          campaign_month?: string
          id?: never
          lead_id?: number
          recorded_at?: string
          temperature?: Database["public"]["Enums"]["lead_temperature"]
        }
        Relationships: [
          {
            foreignKeyName: "lead_temperature_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          behavior_signals: Json | null
          budget: string | null
          contact_id: number | null
          created_at: string | null
          day_detected: string | null
          email: string | null
          fecha_ultimo_contacto: string | null
          financing: boolean | null
          fotos_enviadas_at: string | null
          hour_detected: string | null
          id: number
          lead_id_kommo: number
          mensaje_post_fotos_enviado: boolean | null
          mensajes_enviados: string[]
          name: string
          phone: string
          presupuesto_cliente: string | null
          respondio_post_fotos: boolean | null
          resume: string | null
          resume_updated_at: string | null
          source: Database["public"]["Enums"]["acquisition_source"] | null
          status: Database["public"]["Enums"]["lead_status"] | null
          temperature: Database["public"]["Enums"]["lead_temperature"] | null
          time_reference: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          behavior_signals?: Json | null
          budget?: string | null
          contact_id?: number | null
          created_at?: string | null
          day_detected?: string | null
          email?: string | null
          fecha_ultimo_contacto?: string | null
          financing?: boolean | null
          fotos_enviadas_at?: string | null
          hour_detected?: string | null
          id?: number
          lead_id_kommo: number
          mensaje_post_fotos_enviado?: boolean | null
          mensajes_enviados?: string[]
          name: string
          phone?: string
          presupuesto_cliente?: string | null
          respondio_post_fotos?: boolean | null
          resume?: string | null
          resume_updated_at?: string | null
          source?: Database["public"]["Enums"]["acquisition_source"] | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          temperature?: Database["public"]["Enums"]["lead_temperature"] | null
          time_reference?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          behavior_signals?: Json | null
          budget?: string | null
          contact_id?: number | null
          created_at?: string | null
          day_detected?: string | null
          email?: string | null
          fecha_ultimo_contacto?: string | null
          financing?: boolean | null
          fotos_enviadas_at?: string | null
          hour_detected?: string | null
          id?: number
          lead_id_kommo?: number
          mensaje_post_fotos_enviado?: boolean | null
          mensajes_enviados?: string[]
          name?: string
          phone?: string
          presupuesto_cliente?: string | null
          respondio_post_fotos?: boolean | null
          resume?: string | null
          resume_updated_at?: string | null
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
      leads_updated_at_audit: {
        Row: {
          auth_uid: string | null
          changed_columns: string[]
          id: number
          lead_id: number
          new_updated_at: string
          old_updated_at: string | null
          only_mensajes_enviados: boolean
          recorded_at: string
        }
        Insert: {
          auth_uid?: string | null
          changed_columns?: string[]
          id?: never
          lead_id: number
          new_updated_at: string
          old_updated_at?: string | null
          only_mensajes_enviados?: boolean
          recorded_at?: string
        }
        Update: {
          auth_uid?: string | null
          changed_columns?: string[]
          id?: never
          lead_id?: number
          new_updated_at?: string
          old_updated_at?: string | null
          only_mensajes_enviados?: boolean
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_updated_at_audit_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_dev_request_attachments: {
        Row: {
          created_at: string
          created_by: string
          file_name: string
          file_path: string
          id: string
          mime_type: string
          request_id: string
          size_bytes: number
        }
        Insert: {
          created_at?: string
          created_by: string
          file_name: string
          file_path: string
          id?: string
          mime_type: string
          request_id: string
          size_bytes: number
        }
        Update: {
          created_at?: string
          created_by?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string
          request_id?: string
          size_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketing_dev_request_attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_dev_request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "marketing_dev_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_dev_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          created_by: string
          description: string
          environment_info: string | null
          expected_outcome: string | null
          id: string
          page_url: string | null
          priority: Database["public"]["Enums"]["marketing_dev_request_priority"]
          reference_code: string
          request_type: Database["public"]["Enums"]["marketing_dev_request_type"]
          requester_email: string | null
          requester_name: string
          requester_phone: string | null
          requester_role: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["marketing_dev_request_status"]
          status_changed_at: string
          steps_to_reproduce: string | null
          target_module: Database["public"]["Enums"]["marketing_dev_target_module"]
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          created_by: string
          description: string
          environment_info?: string | null
          expected_outcome?: string | null
          id?: string
          page_url?: string | null
          priority?: Database["public"]["Enums"]["marketing_dev_request_priority"]
          reference_code: string
          request_type?: Database["public"]["Enums"]["marketing_dev_request_type"]
          requester_email?: string | null
          requester_name: string
          requester_phone?: string | null
          requester_role?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["marketing_dev_request_status"]
          status_changed_at?: string
          steps_to_reproduce?: string | null
          target_module?: Database["public"]["Enums"]["marketing_dev_target_module"]
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          created_by?: string
          description?: string
          environment_info?: string | null
          expected_outcome?: string | null
          id?: string
          page_url?: string | null
          priority?: Database["public"]["Enums"]["marketing_dev_request_priority"]
          reference_code?: string
          request_type?: Database["public"]["Enums"]["marketing_dev_request_type"]
          requester_email?: string | null
          requester_name?: string
          requester_phone?: string | null
          requester_role?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["marketing_dev_request_status"]
          status_changed_at?: string
          steps_to_reproduce?: string | null
          target_module?: Database["public"]["Enums"]["marketing_dev_target_module"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_dev_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_planner_event_vehicles: {
        Row: {
          created_at: string
          event_id: string
          id: string
          inventory_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          inventory_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          inventory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_planner_event_vehicles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "marketing_planner_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_planner_event_vehicles_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_planner_events: {
        Row: {
          all_day: boolean
          color: string
          created_at: string
          created_by: string
          description: string | null
          end_at: string
          event_type: Database["public"]["Enums"]["marketing_planner_event_type"]
          id: string
          inventory_id: string | null
          location: string | null
          owner_id: string
          recurrence_parent_id: string | null
          recurrence_rule: Json | null
          start_at: string
          status: Database["public"]["Enums"]["marketing_planner_event_status"]
          title: string
          updated_at: string
          video_plan_item_id: string | null
          visibility: Database["public"]["Enums"]["marketing_planner_visibility"]
        }
        Insert: {
          all_day?: boolean
          color?: string
          created_at?: string
          created_by: string
          description?: string | null
          end_at: string
          event_type?: Database["public"]["Enums"]["marketing_planner_event_type"]
          id?: string
          inventory_id?: string | null
          location?: string | null
          owner_id: string
          recurrence_parent_id?: string | null
          recurrence_rule?: Json | null
          start_at: string
          status?: Database["public"]["Enums"]["marketing_planner_event_status"]
          title: string
          updated_at?: string
          video_plan_item_id?: string | null
          visibility?: Database["public"]["Enums"]["marketing_planner_visibility"]
        }
        Update: {
          all_day?: boolean
          color?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_at?: string
          event_type?: Database["public"]["Enums"]["marketing_planner_event_type"]
          id?: string
          inventory_id?: string | null
          location?: string | null
          owner_id?: string
          recurrence_parent_id?: string | null
          recurrence_rule?: Json | null
          start_at?: string
          status?: Database["public"]["Enums"]["marketing_planner_event_status"]
          title?: string
          updated_at?: string
          video_plan_item_id?: string | null
          visibility?: Database["public"]["Enums"]["marketing_planner_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "marketing_planner_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_planner_events_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_planner_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_planner_events_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "marketing_planner_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_planner_events_video_plan_item_id_fkey"
            columns: ["video_plan_item_id"]
            isOneToOne: false
            referencedRelation: "marketing_video_plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_planner_resources: {
        Row: {
          category: Database["public"]["Enums"]["marketing_planner_resource_category"]
          created_at: string
          created_by: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string | null
          owner_id: string
          tags: string[]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["marketing_planner_visibility"]
        }
        Insert: {
          category?: Database["public"]["Enums"]["marketing_planner_resource_category"]
          created_at?: string
          created_by: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          mime_type?: string | null
          owner_id: string
          tags?: string[]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["marketing_planner_visibility"]
        }
        Update: {
          category?: Database["public"]["Enums"]["marketing_planner_resource_category"]
          created_at?: string
          created_by?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string | null
          owner_id?: string
          tags?: string[]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["marketing_planner_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "marketing_planner_resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_planner_resources_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_planner_tasks: {
        Row: {
          category: string
          completed_at: string | null
          completed_by: string | null
          completion_note: string | null
          completion_proof_file_path: string | null
          completion_proof_url: string | null
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          id: string
          inventory_id: string | null
          linked_event_id: string | null
          owner_id: string
          parent_id: string | null
          priority: Database["public"]["Enums"]["marketing_planner_priority"]
          sort_order: number
          status: Database["public"]["Enums"]["marketing_planner_task_status"]
          title: string
          updated_at: string
          video_plan_item_id: string | null
          visibility: Database["public"]["Enums"]["marketing_planner_visibility"]
        }
        Insert: {
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          completion_note?: string | null
          completion_proof_file_path?: string | null
          completion_proof_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_at?: string | null
          id?: string
          inventory_id?: string | null
          linked_event_id?: string | null
          owner_id: string
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["marketing_planner_priority"]
          sort_order?: number
          status?: Database["public"]["Enums"]["marketing_planner_task_status"]
          title: string
          updated_at?: string
          video_plan_item_id?: string | null
          visibility?: Database["public"]["Enums"]["marketing_planner_visibility"]
        }
        Update: {
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          completion_note?: string | null
          completion_proof_file_path?: string | null
          completion_proof_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          id?: string
          inventory_id?: string | null
          linked_event_id?: string | null
          owner_id?: string
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["marketing_planner_priority"]
          sort_order?: number
          status?: Database["public"]["Enums"]["marketing_planner_task_status"]
          title?: string
          updated_at?: string
          video_plan_item_id?: string | null
          visibility?: Database["public"]["Enums"]["marketing_planner_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "marketing_planner_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_planner_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_planner_tasks_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_planner_tasks_linked_event_id_fkey"
            columns: ["linked_event_id"]
            isOneToOne: false
            referencedRelation: "marketing_planner_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_planner_tasks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_planner_tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "marketing_planner_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_planner_tasks_video_plan_item_id_fkey"
            columns: ["video_plan_item_id"]
            isOneToOne: false
            referencedRelation: "marketing_video_plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_video_plan_items: {
        Row: {
          assigned_seller_id: string | null
          created_at: string
          created_by: string
          id: string
          inventory_id: string
          notes: string | null
          planned_date: string
          status: string
          updated_at: string
          video_kind: string
        }
        Insert: {
          assigned_seller_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          inventory_id: string
          notes?: string | null
          planned_date: string
          status?: string
          updated_at?: string
          video_kind?: string
        }
        Update: {
          assigned_seller_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          inventory_id?: string
          notes?: string | null
          planned_date?: string
          status?: string
          updated_at?: string
          video_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_video_plan_items_assigned_seller_id_fkey"
            columns: ["assigned_seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_video_plan_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_video_plan_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ad_pause_log: {
        Row: {
          ad_id: string
          ad_name: string | null
          campaign_id: string | null
          campaign_name: string | null
          id: number
          inventory_id: string | null
          meta_confirmed: boolean
          meta_response: Json | null
          paused_at: string
          paused_by: string
        }
        Insert: {
          ad_id: string
          ad_name?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          id?: number
          inventory_id?: string | null
          meta_confirmed?: boolean
          meta_response?: Json | null
          paused_at?: string
          paused_by?: string
        }
        Update: {
          ad_id?: string
          ad_name?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          id?: number
          inventory_id?: string | null
          meta_confirmed?: boolean
          meta_response?: Json | null
          paused_at?: string
          paused_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ad_pause_log_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ad_vehicle_metrics: {
        Row: {
          ad_ids: string[] | null
          ads_count: number
          campaign_id: string
          campaign_name: string | null
          clicks: number
          clicks_sum: number
          cost_per_lead: number
          created_at: string
          id: number
          impressions: number
          impressions_sum: number
          inventory_id: string
          leads_count: number
          raw_data: Json | null
          reach: number
          reach_sum: number
          spend: number
          updated_at: string
        }
        Insert: {
          ad_ids?: string[] | null
          ads_count?: number
          campaign_id: string
          campaign_name?: string | null
          clicks?: number
          clicks_sum?: number
          cost_per_lead?: number
          created_at?: string
          id?: number
          impressions?: number
          impressions_sum?: number
          inventory_id: string
          leads_count?: number
          raw_data?: Json | null
          reach?: number
          reach_sum?: number
          spend?: number
          updated_at?: string
        }
        Update: {
          ad_ids?: string[] | null
          ads_count?: number
          campaign_id?: string
          campaign_name?: string | null
          clicks?: number
          clicks_sum?: number
          cost_per_lead?: number
          created_at?: string
          id?: number
          impressions?: number
          impressions_sum?: number
          inventory_id?: string
          leads_count?: number
          raw_data?: Json | null
          reach?: number
          reach_sum?: number
          spend?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ad_vehicle_metrics_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_campaign_metrics: {
        Row: {
          campaign_id: string
          campaign_name: string | null
          clicks: number
          cost_per_lead: number
          created_at: string
          date_start: string | null
          date_stop: string | null
          id: string
          impressions: number
          inventory_id: string | null
          leads_count: number
          raw_data: Json | null
          reach: number
          spend: number
          updated_at: string
          video_thruplay: number
        }
        Insert: {
          campaign_id: string
          campaign_name?: string | null
          clicks?: number
          cost_per_lead?: number
          created_at?: string
          date_start?: string | null
          date_stop?: string | null
          id?: string
          impressions?: number
          inventory_id?: string | null
          leads_count?: number
          raw_data?: Json | null
          reach?: number
          spend?: number
          updated_at?: string
          video_thruplay?: number
        }
        Update: {
          campaign_id?: string
          campaign_name?: string | null
          clicks?: number
          cost_per_lead?: number
          created_at?: string
          date_start?: string | null
          date_stop?: string | null
          id?: string
          impressions?: number
          inventory_id?: string | null
          leads_count?: number
          raw_data?: Json | null
          reach?: number
          spend?: number
          updated_at?: string
          video_thruplay?: number
        }
        Relationships: [
          {
            foreignKeyName: "meta_campaign_metrics_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_video_metrics: {
        Row: {
          avg_time_watched_s: number
          caption: string | null
          comments_count: number
          content_kind: string
          created_time: string | null
          fetched_at: string
          inventory_vehicle_id: string | null
          parsed_brand: string | null
          parsed_model: string | null
          parsed_year: number | null
          permalink_url: string | null
          retention_rate: number
          shares_count: number
          title: string | null
          video_id: string
          views: number
        }
        Insert: {
          avg_time_watched_s?: number
          caption?: string | null
          comments_count?: number
          content_kind?: string
          created_time?: string | null
          fetched_at?: string
          inventory_vehicle_id?: string | null
          parsed_brand?: string | null
          parsed_model?: string | null
          parsed_year?: number | null
          permalink_url?: string | null
          retention_rate?: number
          shares_count?: number
          title?: string | null
          video_id: string
          views?: number
        }
        Update: {
          avg_time_watched_s?: number
          caption?: string | null
          comments_count?: number
          content_kind?: string
          created_time?: string | null
          fetched_at?: string
          inventory_vehicle_id?: string | null
          parsed_brand?: string | null
          parsed_model?: string | null
          parsed_year?: number | null
          permalink_url?: string | null
          retention_rate?: number
          shares_count?: number
          title?: string | null
          video_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "meta_video_metrics_inventory_vehicle_id_fkey"
            columns: ["inventory_vehicle_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
        ]
      }
      module_audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          module: string
          summary: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          module: string
          summary?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          module?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      music_tracks_v2: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          file_path: string
          id: string
          is_active: boolean | null
          name: string
          public_url: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          file_path: string
          id?: string
          is_active?: boolean | null
          name: string
          public_url: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          file_path?: string
          id?: string
          is_active?: boolean | null
          name?: string
          public_url?: string
        }
        Relationships: []
      }
      n8n_chat_histories: {
        Row: {
          created_at: string | null
          id: number | null
          message: Json | null
          session_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number | null
          message?: Json | null
          session_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number | null
          message?: Json | null
          session_id?: string | null
        }
        Relationships: []
      }
      noticiero_config: {
        Row: {
          avatar_rotation: string[]
          created_at: string
          creative_mode: string
          creative_topics: string[]
          day_type_config: Json
          id: string
          is_active: boolean
          last_run_at: string | null
          next_run_at: string | null
          publish_days: string[]
          publish_time: string
          updated_at: string
          vehicle_order: string
        }
        Insert: {
          avatar_rotation?: string[]
          created_at?: string
          creative_mode?: string
          creative_topics?: string[]
          day_type_config?: Json
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          publish_days?: string[]
          publish_time?: string
          updated_at?: string
          vehicle_order?: string
        }
        Update: {
          avatar_rotation?: string[]
          created_at?: string
          creative_mode?: string
          creative_topics?: string[]
          day_type_config?: Json
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          publish_days?: string[]
          publish_time?: string
          updated_at?: string
          vehicle_order?: string
        }
        Relationships: []
      }
      noticiero_history: {
        Row: {
          avatar_id: string
          content_type: string
          creative_topic: string | null
          day_of_week: string
          error_message: string | null
          facebook_post_id: string | null
          final_video_url: string | null
          generated_script: string
          heygen_video_url: string | null
          id: string
          instagram_post_id: string | null
          published_at: string
          status: string
          vehicle_id: string | null
        }
        Insert: {
          avatar_id: string
          content_type: string
          creative_topic?: string | null
          day_of_week: string
          error_message?: string | null
          facebook_post_id?: string | null
          final_video_url?: string | null
          generated_script?: string
          heygen_video_url?: string | null
          id?: string
          instagram_post_id?: string | null
          published_at?: string
          status?: string
          vehicle_id?: string | null
        }
        Update: {
          avatar_id?: string
          content_type?: string
          creative_topic?: string | null
          day_of_week?: string
          error_message?: string | null
          facebook_post_id?: string | null
          final_video_url?: string | null
          generated_script?: string
          heygen_video_url?: string | null
          id?: string
          instagram_post_id?: string | null
          published_at?: string
          status?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "noticiero_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
        ]
      }
      noticiero_jobs: {
        Row: {
          banner_title: string | null
          created_at: string
          created_by: string | null
          creatomate_render_id: string | null
          current_step: string | null
          custom_topic: string | null
          error_message: string | null
          final_video_url: string | null
          heygen_avatar_id: string | null
          heygen_background_url: string | null
          heygen_video_id: string | null
          heygen_video_url: string | null
          heygen_voice_id: string | null
          id: string
          job_name: string | null
          mode: string
          progress_percentage: number
          script_text: string | null
          social_publish_stage: string | null
          status: string
          updated_at: string
          vehicle_id: string | null
          vehicle_snapshot: Json | null
        }
        Insert: {
          banner_title?: string | null
          created_at?: string
          created_by?: string | null
          creatomate_render_id?: string | null
          current_step?: string | null
          custom_topic?: string | null
          error_message?: string | null
          final_video_url?: string | null
          heygen_avatar_id?: string | null
          heygen_background_url?: string | null
          heygen_video_id?: string | null
          heygen_video_url?: string | null
          heygen_voice_id?: string | null
          id?: string
          job_name?: string | null
          mode: string
          progress_percentage?: number
          script_text?: string | null
          social_publish_stage?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_snapshot?: Json | null
        }
        Update: {
          banner_title?: string | null
          created_at?: string
          created_by?: string | null
          creatomate_render_id?: string | null
          current_step?: string | null
          custom_topic?: string | null
          error_message?: string | null
          final_video_url?: string | null
          heygen_avatar_id?: string | null
          heygen_background_url?: string | null
          heygen_video_id?: string | null
          heygen_video_url?: string | null
          heygen_voice_id?: string | null
          id?: string
          job_name?: string | null
          mode?: string
          progress_percentage?: number
          script_text?: string | null
          social_publish_stage?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "noticiero_jobs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
        ]
      }
      noticiero_publishing_queue: {
        Row: {
          caption: string
          created_at: string
          id: string
          noticiero_job_id: string
          platforms: string[]
          scheduled_at: string
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          caption: string
          created_at?: string
          id?: string
          noticiero_job_id: string
          platforms: string[]
          scheduled_at: string
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          noticiero_job_id?: string
          platforms?: string[]
          scheduled_at?: string
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "noticiero_publishing_queue_noticiero_job_id_fkey"
            columns: ["noticiero_job_id"]
            isOneToOne: false
            referencedRelation: "noticiero_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noticiero_publishing_queue_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
        ]
      }
      noticiero_publishing_results: {
        Row: {
          attempted_at: string
          error_message: string | null
          id: string
          platform: string
          platform_post_id: string | null
          queue_id: string
          status: string
        }
        Insert: {
          attempted_at?: string
          error_message?: string | null
          id?: string
          platform: string
          platform_post_id?: string | null
          queue_id: string
          status: string
        }
        Update: {
          attempted_at?: string
          error_message?: string | null
          id?: string
          platform?: string
          platform_post_id?: string | null
          queue_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "noticiero_publishing_results_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "noticiero_publishing_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_runs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          payload: Json
          result: Json | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          result?: Json | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          result?: Json | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      proceso_etapas: {
        Row: {
          created_at: string | null
          id: string
          nombre: string
          orden: number
          tipo_proceso: Database["public"]["Enums"]["tipo_proceso_enum"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre: string
          orden: number
          tipo_proceso: Database["public"]["Enums"]["tipo_proceso_enum"]
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre?: string
          orden?: number
          tipo_proceso?: Database["public"]["Enums"]["tipo_proceso_enum"]
        }
        Relationships: []
      }
      profile_permissions: {
        Row: {
          can_delete: boolean
          can_read: boolean
          can_write: boolean
          created_at: string
          profile_id: string
          submodule_id: string
          updated_at: string
        }
        Insert: {
          can_delete?: boolean
          can_read?: boolean
          can_write?: boolean
          created_at?: string
          profile_id: string
          submodule_id: string
          updated_at?: string
        }
        Update: {
          can_delete?: boolean
          can_read?: boolean
          can_write?: boolean
          created_at?: string
          profile_id?: string
          submodule_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_permissions_submodule_id_fkey"
            columns: ["submodule_id"]
            isOneToOne: false
            referencedRelation: "submodules"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_roles: {
        Row: {
          assigned_at: string
          profile_id: string
          role_id: string
        }
        Insert: {
          assigned_at?: string
          profile_id: string
          role_id: string
        }
        Update: {
          assigned_at?: string
          profile_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
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
      role_permissions: {
        Row: {
          can_delete: boolean
          can_read: boolean
          can_write: boolean
          id: string
          role_id: string
          submodule_id: string
        }
        Insert: {
          can_delete?: boolean
          can_read?: boolean
          can_write?: boolean
          id?: string
          role_id: string
          submodule_id: string
        }
        Update: {
          can_delete?: boolean
          can_read?: boolean
          can_write?: boolean
          id?: string
          role_id?: string
          submodule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_submodule_id_fkey"
            columns: ["submodule_id"]
            isOneToOne: false
            referencedRelation: "submodules"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          base_role: string
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          base_role: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          base_role?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
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
          pic: string | null
          rating: number | null
          rating_count: number | null
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
          pic?: string | null
          rating?: number | null
          rating_count?: number | null
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
          pic?: string | null
          rating?: number | null
          rating_count?: number | null
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
          image_url: string | null
          is_sold: boolean
          listing_image_urls: string[] | null
          location: string | null
          mileage: number | null
          model: string
          motor: string | null
          price: number | null
          publication_date: string
          region: string | null
          seller_id: string
          tags: string[] | null
          title: string | null
          transmission: string | null
          trim: string | null
          updated_at: string | null
          url: string
          year: number | null
        }
        Insert: {
          brand: string
          characteristics?: string[] | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          extras?: string[] | null
          id?: string
          image_url?: string | null
          is_sold?: boolean
          listing_image_urls?: string[] | null
          location?: string | null
          mileage?: number | null
          model: string
          motor?: string | null
          price?: number | null
          publication_date: string
          region?: string | null
          seller_id: string
          tags?: string[] | null
          title?: string | null
          transmission?: string | null
          trim?: string | null
          updated_at?: string | null
          url: string
          year?: number | null
        }
        Update: {
          brand?: string
          characteristics?: string[] | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          extras?: string[] | null
          id?: string
          image_url?: string | null
          is_sold?: boolean
          listing_image_urls?: string[] | null
          location?: string | null
          mileage?: number | null
          model?: string
          motor?: string | null
          price?: number | null
          publication_date?: string
          region?: string | null
          seller_id?: string
          tags?: string[] | null
          title?: string | null
          transmission?: string | null
          trim?: string | null
          updated_at?: string | null
          url?: string
          year?: number | null
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
      script_vehicle_assignments: {
        Row: {
          created_at: string
          fecha_asignacion: string
          guion_tipo: string | null
          id: string
          palabras_clave: string[]
          palabras_clave_at: string | null
          palabras_clave_por: string | null
          status: string
          vehicle_id: string
          vendedor_id: string
        }
        Insert: {
          created_at?: string
          fecha_asignacion: string
          guion_tipo?: string | null
          id?: string
          palabras_clave?: string[]
          palabras_clave_at?: string | null
          palabras_clave_por?: string | null
          status?: string
          vehicle_id: string
          vendedor_id: string
        }
        Update: {
          created_at?: string
          fecha_asignacion?: string
          guion_tipo?: string | null
          id?: string
          palabras_clave?: string[]
          palabras_clave_at?: string | null
          palabras_clave_por?: string | null
          status?: string
          vehicle_id?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_vehicle_assignments_palabras_clave_por_fkey"
            columns: ["palabras_clave_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_vehicle_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_vehicle_assignments_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      script_vehicle_assignments_archive: {
        Row: {
          created_at: string
          fecha_asignacion: string
          guion_tipo: string | null
          id: string
          palabras_clave: string[]
          palabras_clave_at: string | null
          palabras_clave_por: string | null
          status: string
          vehicle_id: string
          vendedor_id: string
        }
        Insert: {
          created_at?: string
          fecha_asignacion: string
          guion_tipo?: string | null
          id: string
          palabras_clave?: string[]
          palabras_clave_at?: string | null
          palabras_clave_por?: string | null
          status?: string
          vehicle_id: string
          vendedor_id: string
        }
        Update: {
          created_at?: string
          fecha_asignacion?: string
          guion_tipo?: string | null
          id?: string
          palabras_clave?: string[]
          palabras_clave_at?: string | null
          palabras_clave_por?: string | null
          status?: string
          vehicle_id?: string
          vendedor_id?: string
        }
        Relationships: []
      }
      seguros_polizas: {
        Row: {
          activo: boolean | null
          aseguradora_id: string | null
          broker_id: string | null
          cliente_email: string | null
          cliente_identificacion: string | null
          cliente_nombre: string | null
          cliente_telefono: string | null
          costo_compra: number
          created_at: string | null
          evidencias: string[] | null
          factura_aseguradora: string | null
          fecha_compra: string | null
          fecha_venta: string | null
          id: string
          nota_venta: string | null
          numero_certificado: string | null
          observaciones_compra: string | null
          observaciones_venta: string | null
          plan_tipo: string | null
          precio_venta: number
          referencia: string | null
          updated_at: string | null
          vehiculo_descripcion: string | null
          vehiculo_placa: string | null
          vendido: boolean | null
          vigencia_desde: string | null
          vigencia_hasta: string | null
        }
        Insert: {
          activo?: boolean | null
          aseguradora_id?: string | null
          broker_id?: string | null
          cliente_email?: string | null
          cliente_identificacion?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          costo_compra?: number
          created_at?: string | null
          evidencias?: string[] | null
          factura_aseguradora?: string | null
          fecha_compra?: string | null
          fecha_venta?: string | null
          id?: string
          nota_venta?: string | null
          numero_certificado?: string | null
          observaciones_compra?: string | null
          observaciones_venta?: string | null
          plan_tipo?: string | null
          precio_venta?: number
          referencia?: string | null
          updated_at?: string | null
          vehiculo_descripcion?: string | null
          vehiculo_placa?: string | null
          vendido?: boolean | null
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
        }
        Update: {
          activo?: boolean | null
          aseguradora_id?: string | null
          broker_id?: string | null
          cliente_email?: string | null
          cliente_identificacion?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          costo_compra?: number
          created_at?: string | null
          evidencias?: string[] | null
          factura_aseguradora?: string | null
          fecha_compra?: string | null
          fecha_venta?: string | null
          id?: string
          nota_venta?: string | null
          numero_certificado?: string | null
          observaciones_compra?: string | null
          observaciones_venta?: string | null
          plan_tipo?: string | null
          precio_venta?: number
          referencia?: string | null
          updated_at?: string | null
          vehiculo_descripcion?: string | null
          vehiculo_placa?: string | null
          vendido?: boolean | null
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seguros_polizas_aseguradora_id_fkey"
            columns: ["aseguradora_id"]
            isOneToOne: false
            referencedRelation: "aseguradoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguros_polizas_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      showroom_visit_gestiones: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: number
          result: string | null
          type: string
          visit_id: number
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: number
          result?: string | null
          type?: string
          visit_id: number
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: number
          result?: string | null
          type?: string
          visit_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "showroom_visit_gestiones_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showroom_visit_gestiones_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "showroom_visits"
            referencedColumns: ["id"]
          },
        ]
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
      social_weekly_publication: {
        Row: {
          caption: string | null
          caption_facebook: string | null
          caption_instagram: string | null
          created_at: string
          error_message: string | null
          facebook_permalink: string | null
          facebook_post_id: string | null
          id: string
          instagram_media_id: string | null
          instagram_permalink: string | null
          slot: number
          status: string
          theme_id: string | null
          updated_at: string
          vehicle_id: string
          year_week: string
        }
        Insert: {
          caption?: string | null
          caption_facebook?: string | null
          caption_instagram?: string | null
          created_at?: string
          error_message?: string | null
          facebook_permalink?: string | null
          facebook_post_id?: string | null
          id?: string
          instagram_media_id?: string | null
          instagram_permalink?: string | null
          slot: number
          status?: string
          theme_id?: string | null
          updated_at?: string
          vehicle_id: string
          year_week: string
        }
        Update: {
          caption?: string | null
          caption_facebook?: string | null
          caption_instagram?: string | null
          created_at?: string
          error_message?: string | null
          facebook_permalink?: string | null
          facebook_post_id?: string | null
          id?: string
          instagram_media_id?: string | null
          instagram_permalink?: string | null
          slot?: number
          status?: string
          theme_id?: string | null
          updated_at?: string
          vehicle_id?: string
          year_week?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_weekly_publication_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
        ]
      }
      submodules: {
        Row: {
          id: string
          module_id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: string
          module_id: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          id?: string
          module_id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "submodules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
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
          forma_pago:
            | Database["public"]["Enums"]["metodo_pago_rastreador_enum"]
            | null
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
          forma_pago?:
            | Database["public"]["Enums"]["metodo_pago_rastreador_enum"]
            | null
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
          forma_pago?:
            | Database["public"]["Enums"]["metodo_pago_rastreador_enum"]
            | null
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
      templates: {
        Row: {
          config: Json
          created_at: string
          id: string
          image_path: string | null
          image_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
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
      vehiculos: {
        Row: {
          anio: number | null
          cliente_id: string
          color: string | null
          created_at: string | null
          id: string
          marca: string | null
          modelo: string | null
          placa: string
        }
        Insert: {
          anio?: number | null
          cliente_id: string
          color?: string | null
          created_at?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          placa: string
        }
        Update: {
          anio?: number | null
          cliente_id?: string
          color?: string | null
          created_at?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          placa?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_externos"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas_rastreador: {
        Row: {
          abono_inicial: number | null
          asesor_id: string | null
          cliente_id: string | null
          concesionaria_id: string | null
          costo_instalacion: number | null
          created_at: string | null
          entorno: Database["public"]["Enums"]["entorno_venta_enum"]
          es_venta_externa: boolean | null
          fecha_entrega: string | null
          fecha_instalacion: string | null
          gps_id: string | null
          id: string
          instalador_id: string | null
          metodo_pago:
            | Database["public"]["Enums"]["metodo_pago_rastreador_enum"]
            | null
          nota_venta: string | null
          numero_cuotas: number | null
          observacion: string | null
          precio_total: number
          tipo_pago: Database["public"]["Enums"]["tipo_pago_enum"]
          total_financiado: number | null
          url_comprobante_pago: string | null
          url_evidencia_gps: string | null
          vehiculo_id: string | null
        }
        Insert: {
          abono_inicial?: number | null
          asesor_id?: string | null
          cliente_id?: string | null
          concesionaria_id?: string | null
          costo_instalacion?: number | null
          created_at?: string | null
          entorno: Database["public"]["Enums"]["entorno_venta_enum"]
          es_venta_externa?: boolean | null
          fecha_entrega?: string | null
          fecha_instalacion?: string | null
          gps_id?: string | null
          id?: string
          instalador_id?: string | null
          metodo_pago?:
            | Database["public"]["Enums"]["metodo_pago_rastreador_enum"]
            | null
          nota_venta?: string | null
          numero_cuotas?: number | null
          observacion?: string | null
          precio_total: number
          tipo_pago: Database["public"]["Enums"]["tipo_pago_enum"]
          total_financiado?: number | null
          url_comprobante_pago?: string | null
          url_evidencia_gps?: string | null
          vehiculo_id?: string | null
        }
        Update: {
          abono_inicial?: number | null
          asesor_id?: string | null
          cliente_id?: string | null
          concesionaria_id?: string | null
          costo_instalacion?: number | null
          created_at?: string | null
          entorno?: Database["public"]["Enums"]["entorno_venta_enum"]
          es_venta_externa?: boolean | null
          fecha_entrega?: string | null
          fecha_instalacion?: string | null
          gps_id?: string | null
          id?: string
          instalador_id?: string | null
          metodo_pago?:
            | Database["public"]["Enums"]["metodo_pago_rastreador_enum"]
            | null
          nota_venta?: string | null
          numero_cuotas?: number | null
          observacion?: string | null
          precio_total?: number
          tipo_pago?: Database["public"]["Enums"]["tipo_pago_enum"]
          total_financiado?: number | null
          url_comprobante_pago?: string | null
          url_evidencia_gps?: string | null
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_venta_cliente"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_externos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venta_concesionaria"
            columns: ["concesionaria_id"]
            isOneToOne: false
            referencedRelation: "concesionarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venta_gps"
            columns: ["gps_id"]
            isOneToOne: true
            referencedRelation: "gps_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venta_instalador"
            columns: ["instalador_id"]
            isOneToOne: false
            referencedRelation: "gps_instaladores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_venta_vehiculo"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_rastreador_asesor_id_fkey"
            columns: ["asesor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_automation_jobs: {
        Row: {
          ai_generated_prompt: string | null
          created_at: string | null
          descript_project_id: string | null
          descript_project_url: string | null
          error_log: string | null
          final_export_url: string | null
          id: string
          raw_video_url: string
          status: string
          target_duration_seconds: number
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          ai_generated_prompt?: string | null
          created_at?: string | null
          descript_project_id?: string | null
          descript_project_url?: string | null
          error_log?: string | null
          final_export_url?: string | null
          id?: string
          raw_video_url: string
          status?: string
          target_duration_seconds?: number
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          ai_generated_prompt?: string | null
          created_at?: string | null
          descript_project_id?: string | null
          descript_project_url?: string | null
          error_log?: string | null
          final_export_url?: string | null
          id?: string
          raw_video_url?: string
          status?: string
          target_duration_seconds?: number
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_automation_jobs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
        ]
      }
      video_jobs_v2: {
        Row: {
          adjusted_srt: string | null
          assemblyai_transcript_id: string | null
          created_at: string | null
          creatomate_render_id: string | null
          current_step: string | null
          error_message: string | null
          final_video_duration: number | null
          final_video_url: string | null
          flow_type: string
          gemini_analysis: Json | null
          id: string
          job_name: string | null
          music_track_url: string | null
          progress_percentage: number | null
          raw_video_paths: string[]
          script_pdf_path: string | null
          script_text: string | null
          segment_map: Json | null
          selected_clips: Json | null
          social_publish_stage: string | null
          srt_content: string | null
          status: string
          subtitle_blocks_override: Json | null
          updated_at: string | null
        }
        Insert: {
          adjusted_srt?: string | null
          assemblyai_transcript_id?: string | null
          created_at?: string | null
          creatomate_render_id?: string | null
          current_step?: string | null
          error_message?: string | null
          final_video_duration?: number | null
          final_video_url?: string | null
          flow_type: string
          gemini_analysis?: Json | null
          id?: string
          job_name?: string | null
          music_track_url?: string | null
          progress_percentage?: number | null
          raw_video_paths: string[]
          script_pdf_path?: string | null
          script_text?: string | null
          segment_map?: Json | null
          selected_clips?: Json | null
          social_publish_stage?: string | null
          srt_content?: string | null
          status?: string
          subtitle_blocks_override?: Json | null
          updated_at?: string | null
        }
        Update: {
          adjusted_srt?: string | null
          assemblyai_transcript_id?: string | null
          created_at?: string | null
          creatomate_render_id?: string | null
          current_step?: string | null
          error_message?: string | null
          final_video_duration?: number | null
          final_video_url?: string | null
          flow_type?: string
          gemini_analysis?: Json | null
          id?: string
          job_name?: string | null
          music_track_url?: string | null
          progress_percentage?: number | null
          raw_video_paths?: string[]
          script_pdf_path?: string | null
          script_text?: string | null
          segment_map?: Json | null
          selected_clips?: Json | null
          social_publish_stage?: string | null
          srt_content?: string | null
          status?: string
          subtitle_blocks_override?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      video_publishing_queue: {
        Row: {
          caption: string
          created_at: string
          id: string
          platforms: string[]
          scheduled_at: string
          status: string
          updated_at: string
          vehicle_id: string | null
          video_id: string
        }
        Insert: {
          caption: string
          created_at?: string
          id?: string
          platforms: string[]
          scheduled_at: string
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          video_id: string
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          platforms?: string[]
          scheduled_at?: string
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_publishing_queue_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_publishing_queue_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_jobs_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      video_publishing_results: {
        Row: {
          attempted_at: string
          error_message: string | null
          id: string
          platform: string
          platform_post_id: string | null
          queue_id: string
          status: string
        }
        Insert: {
          attempted_at?: string
          error_message?: string | null
          id?: string
          platform: string
          platform_post_id?: string | null
          queue_id: string
          status: string
        }
        Update: {
          attempted_at?: string
          error_message?: string | null
          id?: string
          platform?: string
          platform_post_id?: string | null
          queue_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_publishing_results_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "video_publishing_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      video_script_metrics: {
        Row: {
          comments_count: number
          created_at: string
          engaged_users: number
          metrics_updated_at: string | null
          performance_score: number | null
          reactions: Json
          retention_rate: number
          script_id: string
          shares_count: number
          updated_at: string
          views: number
        }
        Insert: {
          comments_count?: number
          created_at?: string
          engaged_users?: number
          metrics_updated_at?: string | null
          performance_score?: number | null
          reactions?: Json
          retention_rate?: number
          script_id: string
          shares_count?: number
          updated_at?: string
          views?: number
        }
        Update: {
          comments_count?: number
          created_at?: string
          engaged_users?: number
          metrics_updated_at?: string | null
          performance_score?: number | null
          reactions?: Json
          retention_rate?: number
          script_id?: string
          shares_count?: number
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_script_metrics_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: true
            referencedRelation: "video_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      video_scripts: {
        Row: {
          assignment_id: string | null
          created_at: string
          facebook_post_id: string | null
          fecha_generacion: string
          fecha_publicacion: string | null
          guion_escenas: Json | null
          guion_objetivo: string | null
          guion_tipo: string
          guion_titulo: string | null
          id: string
          objecion_tipo: string | null
          palabras_clave: string[]
          palabras_count: number
          semana_tipo: number
          status: string
          texto_guion: string
          texto_hablado: string | null
          texto_hash: string
          updated_at: string
          vehicle_data: Json | null
          vehicle_id: string
          vendedor_id: string
          vendedor_nombre: string | null
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string
          facebook_post_id?: string | null
          fecha_generacion: string
          fecha_publicacion?: string | null
          guion_escenas?: Json | null
          guion_objetivo?: string | null
          guion_tipo: string
          guion_titulo?: string | null
          id?: string
          objecion_tipo?: string | null
          palabras_clave?: string[]
          palabras_count: number
          semana_tipo: number
          status?: string
          texto_guion: string
          texto_hablado?: string | null
          texto_hash: string
          updated_at?: string
          vehicle_data?: Json | null
          vehicle_id: string
          vendedor_id: string
          vendedor_nombre?: string | null
        }
        Update: {
          assignment_id?: string | null
          created_at?: string
          facebook_post_id?: string | null
          fecha_generacion?: string
          fecha_publicacion?: string | null
          guion_escenas?: Json | null
          guion_objetivo?: string | null
          guion_tipo?: string
          guion_titulo?: string | null
          id?: string
          objecion_tipo?: string | null
          palabras_clave?: string[]
          palabras_count?: number
          semana_tipo?: number
          status?: string
          texto_guion?: string
          texto_hablado?: string | null
          texto_hash?: string
          updated_at?: string
          vehicle_data?: Json | null
          vehicle_id?: string
          vendedor_id?: string
          vendedor_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_scripts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "script_vehicle_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_scripts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "inventoryoracle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_scripts_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_scripts_archive: {
        Row: {
          assignment_id: string | null
          created_at: string
          facebook_post_id: string | null
          fecha_generacion: string
          fecha_publicacion: string | null
          guion_escenas: Json | null
          guion_objetivo: string | null
          guion_tipo: string
          guion_titulo: string | null
          id: string
          objecion_tipo: string | null
          palabras_clave: string[]
          palabras_count: number
          semana_tipo: number
          status: string
          texto_guion: string
          texto_hablado: string | null
          texto_hash: string
          updated_at: string
          vehicle_data: Json | null
          vehicle_id: string
          vendedor_id: string
          vendedor_nombre: string | null
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string
          facebook_post_id?: string | null
          fecha_generacion: string
          fecha_publicacion?: string | null
          guion_escenas?: Json | null
          guion_objetivo?: string | null
          guion_tipo: string
          guion_titulo?: string | null
          id?: string
          objecion_tipo?: string | null
          palabras_clave?: string[]
          palabras_count: number
          semana_tipo: number
          status?: string
          texto_guion: string
          texto_hablado?: string | null
          texto_hash: string
          updated_at?: string
          vehicle_data?: Json | null
          vehicle_id: string
          vendedor_id: string
          vendedor_nombre?: string | null
        }
        Update: {
          assignment_id?: string | null
          created_at?: string
          facebook_post_id?: string | null
          fecha_generacion?: string
          fecha_publicacion?: string | null
          guion_escenas?: Json | null
          guion_objetivo?: string | null
          guion_tipo?: string
          guion_titulo?: string | null
          id?: string
          objecion_tipo?: string | null
          palabras_clave?: string[]
          palabras_count?: number
          semana_tipo?: number
          status?: string
          texto_guion?: string
          texto_hablado?: string | null
          texto_hash?: string
          updated_at?: string
          vehicle_data?: Json | null
          vehicle_id?: string
          vendedor_id?: string
          vendedor_nombre?: string | null
        }
        Relationships: []
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
      view_scraper_price_statistics: {
        Row: {
          average_price: number | null
          brand: string | null
          max_price: number | null
          min_price: number | null
          model: string | null
          region: string | null
          total_listings: number | null
          trim: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activity_date_from_timestamptz: {
        Args: { p_ts: string }
        Returns: string
      }
      activity_date_now_ecuador: { Args: never; Returns: string }
      admin_rbac_dashboard: { Args: never; Returns: Json }
      campaign_month_from_timestamptz: {
        Args: { p_ts: string }
        Returns: string
      }
      campaign_month_now_ecuador: { Args: never; Returns: string }
      can_use_marketing_dev_requests: { Args: never; Returns: boolean }
      can_view_planner_row: {
        Args: {
          p_created_by: string
          p_owner: string
          p_visibility: Database["public"]["Enums"]["marketing_planner_visibility"]
        }
        Returns: boolean
      }
      current_profile_role: { Args: never; Returns: string }
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
      get_my_effective_permissions: {
        Args: never
        Returns: {
          can_delete: boolean
          can_read: boolean
          can_write: boolean
          submodule_slug: string
        }[]
      }
      is_admin_or_marketing: { Args: never; Returns: boolean }
      is_cartera_manual_staff: { Args: never; Returns: boolean }
      is_legal_staff: { Args: never; Returns: boolean }
      is_marketing_dev_request_admin: { Args: never; Returns: boolean }
      is_marketing_planner_admin: { Args: never; Returns: boolean }
      is_marketing_planner_member: { Args: never; Returns: boolean }
      is_profile_admin: { Args: never; Returns: boolean }
      is_role: { Args: { required_role: string }; Returns: boolean }
      lead_temperature_append_state: {
        Args: {
          p_new: Database["public"]["Enums"]["lead_temperature"]
          p_states: Database["public"]["Enums"]["lead_temperature"][]
        }
        Returns: Database["public"]["Enums"]["lead_temperature"][]
      }
      lead_temperature_max: {
        Args: {
          p_a: Database["public"]["Enums"]["lead_temperature"]
          p_b: Database["public"]["Enums"]["lead_temperature"]
        }
        Returns: Database["public"]["Enums"]["lead_temperature"]
      }
      lead_temperature_rank: {
        Args: { p_temp: Database["public"]["Enums"]["lead_temperature"] }
        Returns: number
      }
      leads_sin_respuesta: {
        Args: never
        Returns: {
          brand: string
          color: string
          contact_id: number
          fuel_type: string
          lead_id_kommo: number
          mileage: number
          model: string
          name: string
          passenger_capacity: string
          phone: string
          plate_short: string
          price: number
          year: number
        }[]
      }
      mark_overdue_case_tasks: { Args: never; Returns: number }
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
      reassign_stale_unmanaged_leads: { Args: never; Returns: number }
      reset_leads_temperature_monthly: { Args: never; Returns: number }
      rpc_cases_without_gestion: {
        Args: { p_days: number }
        Returns: {
          abogado_id: string | null
          cartera_manual_id: string | null
          contactabilidad:
            | Database["public"]["Enums"]["contactabilidad_enum"]
            | null
          created_at: string | null
          estado: Database["public"]["Enums"]["estado_caso_enum"]
          estado_vehiculo:
            | Database["public"]["Enums"]["estado_vehiculo_enum"]
            | null
          etapa_actual_id: string | null
          fecha_inicio: string | null
          fecha_proxima_accion: string | null
          fecha_ultima_gestion: string | null
          id: string
          id_sistema: number | null
          intencion_pago:
            | Database["public"]["Enums"]["intencion_pago_enum"]
            | null
          monto_referencia: number | null
          objetivo_caso:
            | Database["public"]["Enums"]["objetivo_caso_enum"]
            | null
          prioridad: string | null
          proxima_accion: string | null
          riesgo: string | null
          tipo_proceso: Database["public"]["Enums"]["tipo_proceso_enum"] | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "cases"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rpc_change_case_process:
        | {
            Args: {
              p_case_id: string
              p_event_descripcion?: string
              p_tipo_proceso: Database["public"]["Enums"]["tipo_proceso_enum"]
            }
            Returns: undefined
          }
        | {
            Args: {
              p_case_id: string
              p_contactabilidad?: Database["public"]["Enums"]["contactabilidad_enum"]
              p_estado_vehiculo: Database["public"]["Enums"]["estado_vehiculo_enum"]
              p_event_descripcion?: string
              p_fecha_proxima_accion?: string
              p_intencion_pago?: Database["public"]["Enums"]["intencion_pago_enum"]
              p_objetivo_caso: Database["public"]["Enums"]["objetivo_caso_enum"]
              p_proxima_accion?: string
              p_tipo_proceso: Database["public"]["Enums"]["tipo_proceso_enum"]
            }
            Returns: undefined
          }
      rpc_change_case_status:
        | {
            Args: {
              p_case_id: string
              p_estado_nuevo: Database["public"]["Enums"]["estado_caso_enum"]
              p_etapa_nueva_id?: string
              p_event_descripcion: string
              p_fecha_proxima_accion: string
              p_proxima_accion: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_case_id: string
              p_documento_id?: string
              p_estado_nuevo: Database["public"]["Enums"]["estado_caso_enum"]
              p_event_canal?: string
              p_event_descripcion: string
              p_event_detalle?: string
              p_event_resultado?: string
              p_event_tipo: string
              p_fecha_proxima_accion: string
              p_imagenes_ids?: string[]
              p_proxima_accion: string
            }
            Returns: undefined
          }
      rpc_complete_case_task: {
        Args: { p_event_descripcion?: string; p_task_id: string }
        Returns: undefined
      }
      rpc_create_case:
        | {
            Args: {
              p_abogado_id?: string
              p_cartera_manual_id?: string
              p_contactabilidad?: Database["public"]["Enums"]["contactabilidad_enum"]
              p_documento_id?: string
              p_estado?: Database["public"]["Enums"]["estado_caso_enum"]
              p_estado_vehiculo?: Database["public"]["Enums"]["estado_vehiculo_enum"]
              p_event_canal?: string
              p_event_descripcion?: string
              p_event_detalle?: string
              p_event_resultado?: string
              p_event_tipo?: string
              p_fecha_proxima_accion?: string
              p_id_sistema?: number
              p_imagenes_ids?: string[]
              p_intencion_pago?: Database["public"]["Enums"]["intencion_pago_enum"]
              p_monto_referencia?: number
              p_objetivo_caso?: Database["public"]["Enums"]["objetivo_caso_enum"]
              p_prioridad?: string
              p_proxima_accion?: string
              p_riesgo?: string
              p_tipo_proceso?: Database["public"]["Enums"]["tipo_proceso_enum"]
            }
            Returns: string
          }
        | {
            Args: {
              p_abogado_id: string
              p_contactabilidad?: Database["public"]["Enums"]["contactabilidad_enum"]
              p_documento_id?: string
              p_estado: Database["public"]["Enums"]["estado_caso_enum"]
              p_estado_vehiculo?: Database["public"]["Enums"]["estado_vehiculo_enum"]
              p_event_canal?: string
              p_event_descripcion?: string
              p_event_detalle?: string
              p_event_resultado?: string
              p_event_tipo?: string
              p_fecha_proxima_accion: string
              p_id_sistema: number
              p_imagenes_ids?: string[]
              p_intencion_pago?: Database["public"]["Enums"]["intencion_pago_enum"]
              p_monto_referencia: number
              p_objetivo_caso?: Database["public"]["Enums"]["objetivo_caso_enum"]
              p_prioridad: string
              p_proxima_accion: string
              p_riesgo: string
              p_tipo_proceso?: Database["public"]["Enums"]["tipo_proceso_enum"]
            }
            Returns: string
          }
      rpc_create_case_task: {
        Args: {
          p_case_id: string
          p_descripcion: string
          p_fecha_limite: string
          p_tipo: string
        }
        Returns: string
      }
      rpc_get_case_full: { Args: { p_case_id: string }; Returns: Json }
      rpc_get_cases_by_lawyer: { Args: never; Returns: Json }
      rpc_get_cases_by_process_type: { Args: never; Returns: Json }
      rpc_get_critical_cases: {
        Args: never
        Returns: {
          abogado_id: string | null
          cartera_manual_id: string | null
          contactabilidad:
            | Database["public"]["Enums"]["contactabilidad_enum"]
            | null
          created_at: string | null
          estado: Database["public"]["Enums"]["estado_caso_enum"]
          estado_vehiculo:
            | Database["public"]["Enums"]["estado_vehiculo_enum"]
            | null
          etapa_actual_id: string | null
          fecha_inicio: string | null
          fecha_proxima_accion: string | null
          fecha_ultima_gestion: string | null
          id: string
          id_sistema: number | null
          intencion_pago:
            | Database["public"]["Enums"]["intencion_pago_enum"]
            | null
          monto_referencia: number | null
          objetivo_caso:
            | Database["public"]["Enums"]["objetivo_caso_enum"]
            | null
          prioridad: string | null
          proxima_accion: string | null
          riesgo: string | null
          tipo_proceso: Database["public"]["Enums"]["tipo_proceso_enum"] | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "cases"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rpc_register_case_event:
        | {
            Args: {
              p_canal?: string
              p_case_id: string
              p_descripcion: string
              p_detalle?: string
              p_documento_id?: string
              p_etapa_id?: string
              p_imagenes_ids?: string[]
              p_resultado?: string
              p_tipo: string
            }
            Returns: string
          }
        | {
            Args: {
              p_canal?: string
              p_case_id: string
              p_descripcion: string
              p_detalle?: string
              p_documento_id?: string
              p_fecha_proxima_accion?: string
              p_imagenes_ids?: string[]
              p_proxima_accion?: string
              p_resultado?: string
              p_tipo: string
            }
            Returns: string
          }
      seed_profile_permissions_from_role: {
        Args: { p_profile_id: string; p_role_id: string }
        Returns: undefined
      }
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
      canal_enum: "telefono" | "whatsapp" | "email" | "presencial" | "sistema"
      car_location: "patio" | "taller" | "showroom" | "otro" | "conwilsonhernan"
      car_ownership: "propio" | "consignacion" | "intercambio"
      car_status:
        | "disponible"
        | "reservado"
        | "vendido"
        | "devuelto"
        | "mantenimiento"
        | "conwilsonhernan"
        | "consignacion"
      contactabilidad_enum: "contactado" | "no_contesta" | "ilocalizable"
      credit_status: "aplica" | "no_aplica" | "pendiente" | "no_interesa"
      entorno_venta_enum: "KSI_NUEVOS" | "EXTERNO"
      estado_caso_enum:
        | "nuevo"
        | "gestionando"
        | "pre_judicial"
        | "judicial"
        | "cerrado"
        | "castigado"
      estado_cuota_enum: "PENDIENTE" | "PAGADA"
      estado_dispositivo_enum:
        | "PENDIENTE_INSTALACION"
        | "INSTALADO"
        | "ACTIVO"
        | "SUSPENDIDO"
        | "RETIRADO"
      estado_financiamiento: "pendiente" | "en_proceso" | "resuelto"
      estado_vehiculo_enum:
        | "poder_cliente"
        | "retenido"
        | "abandonado"
        | "taller"
        | "recuperado"
      intencion_pago_enum: "alta" | "media" | "baja" | "nula"
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
        | "asesoria_financiamiento"
      lead_temperature: "frio" | "tibio" | "caliente"
      marketing_dev_request_priority: "low" | "medium" | "high" | "urgent"
      marketing_dev_request_status:
        | "new"
        | "in_review"
        | "in_progress"
        | "blocked"
        | "resolved"
        | "rejected"
        | "cancelled"
      marketing_dev_request_type:
        | "bug"
        | "feature"
        | "improvement"
        | "support"
        | "other"
      marketing_dev_target_module:
        | "home"
        | "ventas"
        | "contabilidad"
        | "taller"
        | "legal"
        | "marketing"
        | "seguros"
        | "rastreadores"
        | "admin"
        | "auth"
        | "general"
        | "other"
      marketing_planner_event_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
      marketing_planner_event_type:
        | "event"
        | "meeting"
        | "task_reminder"
        | "content"
      marketing_planner_priority: "baja" | "media" | "alta"
      marketing_planner_resource_category:
        | "document"
        | "image"
        | "video"
        | "brand"
        | "template"
        | "other"
      marketing_planner_task_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
      marketing_planner_visibility: "personal" | "team"
      metodo_pago_rastreador_enum:
        | "EFECTIVO"
        | "TRANSFERENCIA"
        | "DEPOSITO"
        | "CHEQUE"
      objetivo_caso_enum:
        | "recuperar_cartera"
        | "retener_vehiculo"
        | "renegociar"
        | "recuperacion"
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
      tipo_evento_enum:
        | "llamada"
        | "mensaje"
        | "nota"
        | "notificacion"
        | "sistema"
      tipo_gestion_financiamiento: "llamada" | "mensaje" | "personal"
      tipo_pago_enum: "CONTADO" | "CREDITO"
      tipo_proceso_enum:
        | "extrajudicial"
        | "demanda_ejecutiva"
        | "mediacion"
        | "judicial"
      user_role_enum:
        | "admin"
        | "vendedor"
        | "cliente"
        | "marketing"
        | "finanzas"
        | "contable"
        | "abogado"
        | "taller"
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
      canal_enum: ["telefono", "whatsapp", "email", "presencial", "sistema"],
      car_location: ["patio", "taller", "showroom", "otro", "conwilsonhernan"],
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
      contactabilidad_enum: ["contactado", "no_contesta", "ilocalizable"],
      credit_status: ["aplica", "no_aplica", "pendiente", "no_interesa"],
      entorno_venta_enum: ["KSI_NUEVOS", "EXTERNO"],
      estado_caso_enum: [
        "nuevo",
        "gestionando",
        "pre_judicial",
        "judicial",
        "cerrado",
        "castigado",
      ],
      estado_cuota_enum: ["PENDIENTE", "PAGADA"],
      estado_dispositivo_enum: [
        "PENDIENTE_INSTALACION",
        "INSTALADO",
        "ACTIVO",
        "SUSPENDIDO",
        "RETIRADO",
      ],
      estado_financiamiento: ["pendiente", "en_proceso", "resuelto"],
      estado_vehiculo_enum: [
        "poder_cliente",
        "retenido",
        "abandonado",
        "taller",
        "recuperado",
      ],
      intencion_pago_enum: ["alta", "media", "baja", "nula"],
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
        "asesoria_financiamiento",
      ],
      lead_temperature: ["frio", "tibio", "caliente"],
      marketing_dev_request_priority: ["low", "medium", "high", "urgent"],
      marketing_dev_request_status: [
        "new",
        "in_review",
        "in_progress",
        "blocked",
        "resolved",
        "rejected",
        "cancelled",
      ],
      marketing_dev_request_type: [
        "bug",
        "feature",
        "improvement",
        "support",
        "other",
      ],
      marketing_dev_target_module: [
        "home",
        "ventas",
        "contabilidad",
        "taller",
        "legal",
        "marketing",
        "seguros",
        "rastreadores",
        "admin",
        "auth",
        "general",
        "other",
      ],
      marketing_planner_event_status: [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      marketing_planner_event_type: [
        "event",
        "meeting",
        "task_reminder",
        "content",
      ],
      marketing_planner_priority: ["baja", "media", "alta"],
      marketing_planner_resource_category: [
        "document",
        "image",
        "video",
        "brand",
        "template",
        "other",
      ],
      marketing_planner_task_status: [
        "pending",
        "in_progress",
        "completed",
        "cancelled",
      ],
      marketing_planner_visibility: ["personal", "team"],
      metodo_pago_rastreador_enum: [
        "EFECTIVO",
        "TRANSFERENCIA",
        "DEPOSITO",
        "CHEQUE",
      ],
      objetivo_caso_enum: [
        "recuperar_cartera",
        "retener_vehiculo",
        "renegociar",
        "recuperacion",
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
      tipo_evento_enum: [
        "llamada",
        "mensaje",
        "nota",
        "notificacion",
        "sistema",
      ],
      tipo_gestion_financiamiento: ["llamada", "mensaje", "personal"],
      tipo_pago_enum: ["CONTADO", "CREDITO"],
      tipo_proceso_enum: [
        "extrajudicial",
        "demanda_ejecutiva",
        "mediacion",
        "judicial",
      ],
      user_role_enum: [
        "admin",
        "vendedor",
        "cliente",
        "marketing",
        "finanzas",
        "contable",
        "abogado",
        "taller",
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
