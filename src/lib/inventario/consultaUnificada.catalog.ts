export type ApiCatalogGroup = {
  source: string
  title: string
  note?: string
  items: { endpoint: string; fields: string[] }[]
}

/** Catálogo de campos que las APIs pueden devolver (documentación). No implica que cada consulta los llame todos. */
export const UNIFIED_API_CATALOG: ApiCatalogGroup[] = [
  {
    source: 'EcuadorAPI',
    title: 'Persona (Registro Civil)',
    items: [
      {
        endpoint: 'GET /cedulas/{cedula}',
        fields: [
          'id (cédula)',
          'full_name',
          'first_name',
          'last_name',
          'birth_date',
          'age',
          'gender',
          'marital_status',
          'nationality',
          'profession',
          'education',
          'father_name',
          'mother_name',
          'spouse',
          'death_date',
          'birth_place.province / canton / parish',
        ],
      },
      {
        endpoint: 'GET /cedulas/search?name=',
        fields: ['id', 'full_name (coincidencias por nombre)'],
      },
    ],
  },
  {
    source: 'EcuadorAPI',
    title: 'Vehículo',
    items: [
      {
        endpoint: 'GET /placas/{placa}',
        fields: [
          'plate',
          'owner.full_name / id / type',
          'camv_cpn',
          'brand',
          'model',
          'year',
          'country',
          'color',
          'color_secondary',
          'engine_cc',
          'vehicle_class',
          'service',
          'canton',
          'last_paid_year',
          'last_registration_date',
          'registration_expiry_date',
          'fetched_at',
        ],
      },
      {
        endpoint: 'GET /placas/{placa}/propietario',
        fields: ['plate', 'owner.full_name / id / type', 'available'],
      },
      {
        endpoint: 'GET /placas/{placa}/matriculacion',
        fields: ['estado de matrícula', 'fechas de vigencia', 'último pago'],
      },
      {
        endpoint: 'GET /placas/{placa}/pendientes/sri',
        fields: ['total', 'matricula', 'revision', 'items (tipo, monto, años, descripción)'],
      },
      {
        endpoint: 'GET /placas/{placa}/pendientes/amt',
        fields: ['total AMT Quito', 'items de tasas municipales'],
      },
      {
        endpoint: 'GET /placas/{placa}/pendientes/atm',
        fields: ['pendientes ATM Guayaquil'],
      },
      {
        endpoint: 'GET /placas/{placa}/pagos',
        fields: ['historial de pagos', 'summary.transfers', 'owners_estimate'],
      },
      {
        endpoint: 'GET /placas/{placa}/duenos',
        fields: ['owners_estimate', 'historial de titulares'],
      },
    ],
  },
  {
    source: 'EcuadorAPI',
    title: 'Multas, licencia y empresa',
    items: [
      {
        endpoint: 'GET /multas/{placa|cedula}',
        fields: [
          'type (placa|cedula)',
          'total_pending',
          'pending_count',
          'owner_id',
          'citations: entity, citation_number, issue_date, notification_date, payment_deadline, points, fine, total, article, infraction, status (pending|paid|appealed|annulled|agreement)',
        ],
      },
      {
        endpoint: 'GET /licencias/{cedula}',
        fields: ['full_name', 'licenses[].type / description', 'has_debt', 'has_block', 'pending_procedures'],
      },
      {
        endpoint: 'GET /cedulas/{cedula}/puntos',
        fields: ['puntos de licencia (sobre 30)', 'historial de descuentos y recuperaciones'],
      },
      {
        endpoint: 'GET /rucs/{ruc}',
        fields: ['razón social', 'estado', 'tipo de contribuyente', 'actividad', 'establecimientos'],
      },
    ],
  },
  {
    source: 'Consultas.ec',
    title: 'Persona, empresa, vehículo y multas',
    items: [
      {
        endpoint: 'GET /persona/{cedula}',
        fields: ['nombre completo', 'fecha de nacimiento', 'sexo', 'estado civil', 'lugar de nacimiento'],
      },
      {
        endpoint: 'GET /empresa/{ruc}',
        fields: [
          'razón social',
          'estado',
          'tipo de contribuyente',
          'régimen',
          'actividad económica',
          'representante legal',
          'dirección',
        ],
      },
      {
        endpoint: 'GET /vehiculo/{placa}',
        fields: ['marca', 'modelo', 'año', 'tipo', 'color', 'propietario registrado'],
      },
      {
        endpoint: 'GET /multas/{placa|cedula}',
        fields: ['total pendiente', 'valor', 'infracción', 'fecha', 'límite de pago', 'estado'],
      },
    ],
  },
  {
    source: 'Consultas.ec',
    title: 'Procesos judiciales (Función Judicial / eSATJE)',
    note: 'Esta es la única fuente de juicios. El diálogo pide /juicios y muestra todos los campos que venga en el JSON (causa, acción, rol, estado, fecha, resolución, judicatura, etc.).',
    items: [
      {
        endpoint: 'GET /juicios/{cedula|ruc}',
        fields: [
          'nombre del titular',
          'N° de causa',
          'tipo de acción',
          'fecha',
          'rol (actor / demandado)',
          'estado',
          'resolución / sentencia (si la fuente la envía)',
          'cualquier otro campo que eSATJE entregue en el JSON',
        ],
      },
    ],
  },
  {
    source: 'Consultas.ec',
    title: 'Informes 360',
    items: [
      {
        endpoint: 'GET /informe/{cedula}',
        fields: [
          'resumen',
          'identidad (Registro Civil)',
          'actividad económica (SRI)',
          'procesos judiciales',
          'multas de tránsito',
          'secciones_cobradas',
          'sin_verificar',
          'certificado',
        ],
      },
      {
        endpoint: 'GET /informe/empresa/{ruc}',
        fields: [
          'estado tributario (SRI)',
          'procesos judiciales',
          'supercias: situación legal, tipo de compañía, capital, representante, domicilio',
        ],
      },
      {
        endpoint: 'GET /fetchdata?name=',
        fields: ['cédula a partir del nombre'],
      },
    ],
  },
]
