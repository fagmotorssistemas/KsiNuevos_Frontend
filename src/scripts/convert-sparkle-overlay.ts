import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import { execSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as os from 'os'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const INPUT_URL = 'https://enfqumrstqefbxtwsslq.supabase.co/storage/v1/object/public/brillitos-edicion-video/Sky_With_Sparkling_Stars_On_Alpha_Loop_preview_1989974.mp4'
const OUTPUT_BUCKET = 'brillitos-edicion-video'
const OUTPUT_PATH = 'sparkle-overlay-alpha.mov'

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const tmpDir = os.tmpdir()
  const inputFile = path.join(tmpDir, 'sparkle-input.mp4')
  const outputFile = path.join(tmpDir, 'sparkle-alpha.mov')

  // 1. Descargar MP4
  console.log('Descargando MP4...')
  const res = await fetch(INPUT_URL)
  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(inputFile, buffer)
  console.log(`MP4 descargado: ${buffer.length} bytes`)

  // 2. Convertir con FFmpeg
  // colorkey elimina el negro (fondo) y lo hace transparente
  // qtrle es el codec de QuickTime con canal alfa
  console.log('Convirtiendo con FFmpeg...')
  // Intentar ffmpeg del PATH primero, si falla usar ruta completa
  const ffmpegBin = process.env.FFMPEG_PATH || 'ffmpeg'
  const ffmpegCmd = [
    `"${ffmpegBin}" -y`,
    `-i "${inputFile}"`,
    `-vf "colorkey=0x000000:0.3:0.1"`,
    `-c:v qtrle`,
    `-an`,
    `"${outputFile}"`
  ].join(' ')

  execSync(ffmpegCmd, { stdio: 'inherit' })
  console.log('Conversión completada')

  // 3. Subir MOV a Supabase Storage
  console.log('Subiendo MOV a Supabase Storage...')
  const movBuffer = fs.readFileSync(outputFile)
  const { error } = await supabase.storage
    .from(OUTPUT_BUCKET)
    .upload(OUTPUT_PATH, movBuffer, {
      contentType: 'video/quicktime',
      upsert: true,
    })

  if (error) {
    throw new Error(`Error subiendo MOV: ${error.message}`)
  }

  // 4. Obtener URL pública
  const { data } = supabase.storage
    .from(OUTPUT_BUCKET)
    .getPublicUrl(OUTPUT_PATH)

  console.log('\n✅ LISTO. URL del MOV con transparencia:')
  console.log(data.publicUrl)
  console.log('\nCopia esta URL y pégala en .env como:')
  console.log(`SPARKLE_OVERLAY_URL=${data.publicUrl}`)

  // Limpiar archivos temporales
  fs.unlinkSync(inputFile)
  fs.unlinkSync(outputFile)
}

main().catch(console.error)
