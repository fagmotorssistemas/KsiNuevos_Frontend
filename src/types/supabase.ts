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
          axles_count: string | null
          brand: string
          color: string | null
          country_origin: string | null
          created_at: string | null
          description: string | null
          engine_displacement: string | null
          engine_number: string | null
          features: Json | null
          fuel_type: string | null
          id: string
          img_gallery_urls: string[] | null
          img_main_url: string | null
          img_prefix: string | null
          is_featured: boolean | null
          location: Database["public"]["Enums"]["car_location"] | null
          mileage: number | null
          model: string
          oracle_id: string | null
          passenger_capacity: string | null
          plate: string | null
          price: number | null
          purchase_date: string | null
          registration_place: string | null
          registration_year: string | null
          slug: string | null
          specs: Json | null
          status: Database["public"]["Enums"]["car_status"] | null
          stock: number | null
          supplier: string | null
          tonnage: string | null
          transmission: string | null
          type_body: string | null
          updated_at: string | null
          version: string | null
          video_url: string | null
          vin: string
          wheels_count: string | null
          year: number
        }
        Insert: {
          axles_count?: string | null
          brand: string
          color?: string | null
          country_origin?: string | null
          created_at?: string | null
          description?: string | null
          engine_displacement?: string | null
          engine_number?: string | null
          features?: Json | null
          fuel_type?: string | null
          id?: string
          img_gallery_urls?: string[] | null
          img_main_url?: string | null
          img_prefix?: string | null
          is_featured?: boolean | null
          location?: Database["public"]["Enums"]["car_location"] | null
          mileage?: number | null
          model: string
          oracle_id?: string | null
          passenger_capacity?: string | null
          plate?: string | null
          price?: number | null
          purchase_date?: string | null
          registration_place?: string | null
          registration_year?: string | null
          slug?: string | null
          specs?: Json | null
          status?: Database["public"]["Enums"]["car_status"] | null
          stock?: number | null
          supplier?: string | null
          tonnage?: string | null
          transmission?: string | null
          type_body?: string | null
          updated_at?: string | null
          version?: string | null
          video_url?: string | null
          vin: string
          wheels_count?: string | null
          year: number
        }
        Update: {
          axles_count?: string | null
          brand?: string
          color?: string | null
          country_origin?: string | null
          created_at?: string | null
          description?: string | null
          engine_displacement?: string | null
          engine_number?: string | null
          features?: Json | null
          fuel_type?: string | null
          id?: string
          img_gallery_urls?: string[] | null
          img_main_url?: string | null
          img_prefix?: string | null
          is_featured?: boolean | null
          location?: Database["public"]["Enums"]["car_location"] | null
          mileage?: number | null
          model?: string
          oracle_id?: string | null
          passenger_capacity?: string | null
          plate?: string | null
          price?: number | null
          purchase_date?: string | null
          registration_place?: string | null
          registration_year?: string | null
          slug?: string | null
          specs?: Json | null
          status?: Database["public"]["Enums"]["car_status"] | null
          stock?: number | null
          supplier?: string | null
          tonnage?: string | null
          transmission?: string | null
          type_body?: string | null
          updated_at?: string | null
          version?: string | null
          video_url?: string | null
          vin?: string
          wheels_count?: string | null
          year?: number
        }
        Relationships: []
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
          first_seen_at: string | null
          id: string
          is_dealer: boolean | null
          last_updated: string | null
          location: string | null
          seller_name: string | null
          total_listings: number | null
        }
        Insert: {
          badges?: string | null
          first_seen_at?: string | null
          id?: string
          is_dealer?: boolean | null
          last_updated?: string | null
          location?: string | null
          seller_name?: string | null
          total_listings?: number | null
        }
        Update: {
          badges?: string | null
          first_seen_at?: string | null
          id?: string
          is_dealer?: boolean | null
          last_updated?: string | null
          location?: string | null
          seller_name?: string | null
          total_listings?: number | null
        }
        Relationships: []
      }
      scraper_vehicles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          location: Database["public"]["Enums"]["scraper_car_location"] | null
          mileage: number | null
          price: number | null
          seller_id: string
          status: Database["public"]["Enums"]["scraper_car_status"] | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          location?: Database["public"]["Enums"]["scraper_car_location"] | null
          mileage?: number | null
          price?: number | null
          seller_id: string
          status?: Database["public"]["Enums"]["scraper_car_status"] | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          location?: Database["public"]["Enums"]["scraper_car_location"] | null
          mileage?: number | null
          price?: number | null
          seller_id?: string
          status?: Database["public"]["Enums"]["scraper_car_status"] | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
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
      sellers: {
        Row: {
          first_seen_at: string | null
          is_dealer: boolean | null
          last_seen_at: string | null
          listing_count: number | null
          seller_id: string
          seller_name: string | null
        }
        Insert: {
          first_seen_at?: string | null
          is_dealer?: boolean | null
          last_seen_at?: string | null
          listing_count?: number | null
          seller_id: string
          seller_name?: string | null
        }
        Update: {
          first_seen_at?: string | null
          is_dealer?: boolean | null
          last_seen_at?: string | null
          listing_count?: number | null
          seller_id?: string
          seller_name?: string | null
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
            foreignKeyName: "showroom_visits_salesperson_id_fkey"
            columns: ["salesperson_id"]
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
          model: string
          notes: string | null
          priority: Database["public"]["Enums"]["request_priority"] | null
          requested_by: string | null
          status: Database["public"]["Enums"]["request_status"] | null
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
          model: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["request_priority"] | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
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
          model?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["request_priority"] | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          updated_at?: string | null
          year_max?: number | null
          year_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string | null
          currency: string | null
          deal_score: number | null
          description: string | null
          fb_id: string
          image_url: string | null
          location: string | null
          mileage: number | null
          model_keyword: string | null
          price: number | null
          seller_id: string | null
          status: string | null
          tags: string[] | null
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          deal_score?: number | null
          description?: string | null
          fb_id: string
          image_url?: string | null
          location?: string | null
          mileage?: number | null
          model_keyword?: string | null
          price?: number | null
          seller_id?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          deal_score?: number | null
          description?: string | null
          fb_id?: string
          image_url?: string | null
          location?: string | null
          mileage?: number | null
          model_keyword?: string | null
          price?: number | null
          seller_id?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["seller_id"]
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
      interaction_type:
        | "llamada"
        | "whatsapp"
        | "email"
        | "visita"
        | "sms"
        | "nota_interna"
        | "kommo"
      lead_status:
        | "nuevo"
        | "contactado"
        | "interesado"
        | "negociando"
        | "ganado"
        | "perdido"
        | "en_proceso"
      lead_temperature: "frio" | "tibio" | "caliente"
      request_priority: "baja" | "media" | "alta"
      request_status: "pendiente" | "aprobado" | "comprado" | "rechazado"
      scraper_car_location: "patio" | "taller" | "cliente"
      scraper_car_status: "NUEVO" | "DESCARTADO" | "VENDIDO" | "MANTENIMIENTO"
      scraper_vehicles_status_enum:
        | "nuevo"
        | "descartado"
        | "contactado"
        | "vendido"
      user_role_enum:
        | "admin"
        | "vendedor"
        | "cliente"
        | "marketing"
        | "finanzas"
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
      interaction_type: [
        "llamada",
        "whatsapp",
        "email",
        "visita",
        "sms",
        "nota_interna",
        "kommo",
      ],
      lead_status: [
        "nuevo",
        "contactado",
        "interesado",
        "negociando",
        "ganado",
        "perdido",
        "en_proceso",
      ],
      lead_temperature: ["frio", "tibio", "caliente"],
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
      user_role_enum: ["admin", "vendedor", "cliente", "marketing", "finanzas"],
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
