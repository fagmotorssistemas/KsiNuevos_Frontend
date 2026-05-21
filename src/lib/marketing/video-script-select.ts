/** Campos Supabase para listar guiones con estructura nueva + vehículo. */
export const VIDEO_SCRIPT_LIST_SELECT = `
  id, vendedor_id, vendedor_nombre, vehicle_id, semana_tipo, guion_tipo, objecion_tipo,
  guion_titulo, guion_objetivo, texto_hablado, guion_escenas,
  texto_guion, palabras_count, status, facebook_post_id, fecha_generacion, fecha_publicacion,
  created_at, updated_at, vehicle_data,
  inventoryoracle:inventoryoracle (brand, model, year, color, img_main_url)
`
