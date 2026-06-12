import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'iconos-videos-edicion'
const PATH = 'flash-destello.svg'

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">` +
  '<defs>' +
  '<radialGradient id="flash" cx="50%" cy="50%" r="60%">' +
  '<stop offset="0%" stop-color="#FFE94A" stop-opacity="1"/>' +
  '<stop offset="60%" stop-color="#FF8C00" stop-opacity="1"/>' +
  '<stop offset="100%" stop-color="#FF4500" stop-opacity="0.8"/>' +
  '</radialGradient>' +
  '</defs>' +
  '<rect width="1080" height="1920" fill="url(#flash)"/>' +
  '</svg>'

async function main() {
  const buffer = Buffer.from(svg, 'utf8')

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(PATH, buffer, {
      contentType: 'image/svg+xml',
      upsert: true,
    })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(PATH)

  console.log('✅ SVG subido. URL pública:')
  console.log(data.publicUrl)
  console.log('\nAgregar al .env y a Vercel:')
  console.log(`FLASH_SVG_URL=${data.publicUrl}`)
}

main().catch(console.error)
