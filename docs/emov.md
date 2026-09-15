# Integración EMOV en inventario

EMOV se consulta desde Contraste oficial, el registro automático de vehículos y el informe IA. Los resultados se presentan por concepto en Multas y en la columna EMOV. No se muestra un botón independiente de consulta, descarga JSON ni fecha de consulta EMOV.

## Configuración de Vercel

Variables de entorno del servidor (sin prefijo `NEXT_PUBLIC_`):

- `EMOV_API_URL`: dirección HTTPS de la API del scraper. Sin `/consultas` al final.
- `EMOV_API_KEY`: la misma clave de al menos 32 caracteres configurada en DigitalOcean.

Configurar para el entorno de prueba/producción correspondiente y desplegar de
nuevo. No se necesitan tablas nuevas ni migraciones de Supabase. Se reutiliza la
sesión existente y el permiso de acceso a `/inventario`.

La API del scraper se prepara en el proyecto Python separado. No basta con subir
este frontend: hay que arrancar esa API y configurar una dirección HTTPS pública.
Para desarrollo local se permite `http://127.0.0.1:8001`; en Vercel localhost
no apunta al Droplet. La URL pública no puede ser la dirección del túnel SSH local.

## Contrato de la API Python

Todas las llamadas salvo `/health` usan `x-api-key` y `x-user-id` (UUID de Supabase).
Vercel obtiene el usuario desde la sesión validada, no desde parámetros del cliente.
La API debe comprobar la propiedad de la consulta al leer estado o resultado.

- `POST /consultas`, `{ "tipo": "placa_chasis_ramv", "valor": "ABC1234" }`:
  responde 202 con `{ id, valor, estado, ... }`. Si hay una consulta activa del
  mismo usuario, devuelve esa consulta con 200 para poder retomarla.
- `GET /consultas/{id}`: estado.
- `GET /consultas/{id}/resultado`: JSON original; 409 mientras no esté completo.

Estados: `pendiente`, `en_proceso`, `esperando_intervencion`, `completada`, `error`.
`esperando_intervencion` significa que venció la espera inicial; puede haber un
CAPTCHA o una respuesta lenta. No afirma haber detectado un CAPTCHA.

La interfaz consulta el estado cada tres segundos, sin mantener una petición de
Vercel abierta durante la ejecución de Selenium. Un fallo de red permite
**Reintentar seguimiento**, sin crear otra consulta. Los resultados se muestran por
concepto; no hay botón ni descarga automática de JSON.

El registro automático de vehículos y «Consultar nuevamente» en Contraste oficial
inician también EMOV. El historial guarda el identificador de la consulta y su
estado. Al visualizarlo se actualiza desde la cola persistente en DigitalOcean,
sin repetir el scraper. Las consultas siguen ejecutándose si se cierra la página.
La actualización del historial utiliza `SUPABASE_SERVICE_ROLE_KEY`, exclusivamente
en servidor, después de comprobar sesión, permisos y acceso al registro.

Multas muestra todos los conceptos EMOV (incluidos revisión y rodaje). La columna
EMOV del contraste y del informe completo mantiene la fuente separada. El subtotal
SRI/ANT/AMT no incorpora EMOV porque puede haber obligaciones duplicadas entre fuentes.
Un error, una consulta pendiente o un resultado ausente nunca significan saldo cero.

El informe IA espera hasta ocho minutos por EMOV antes de analizar los documentos;
si continúa pendiente, el informe lo declara sin verificar. Incluye el desglose y
fecha en el contexto de documentos y en la síntesis. «Informe ATM» es un documento
independiente de «Informe AMT», con carga, estado y análisis de sus archivos.

## Comprobación tras desplegar

1. Usuario sin sesión: `/api/emov` debe rechazar con 401.
2. Usuario sin permiso de inventario: debe rechazar con 403.
3. Entrar a Reporte de Documentación: SATJE y consulta unificada mantienen su flujo.
4. Consultar una placa conocida: ver espera y resultados por concepto, sin descarga JSON.
5. Verificar que otro usuario no puede leer el ID de esa consulta.
6. Si EMOV pide CAPTCHA: el operador lo resuelve mediante el navegador remoto
   existente. No se publica noVNC ni su contraseña en el frontend.

Los conceptos son el resumen de cobros de EMOV (por ejemplo MULTAS RTV), no el
detalle individual de cada citación. No se suman a los resultados de otras fuentes.
