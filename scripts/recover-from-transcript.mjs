import fs from 'fs'

const p =
  'C:/Users/User/.cursor/projects/c-Users-User-Documents-programacion-KsiNuevos-Frontend/agent-transcripts/e6d2e0f9-98e5-4d4e-8bc8-d8944e54bbe7/e6d2e0f9-98e5-4d4e-8bc8-d8944e54bbe7.jsonl'
const outDir = 'C:/Users/User/Documents/programacion/KsiNuevos_Frontend'

const targets = [
  'subtitle-screen-text.ts',
  'video-script-resolve.ts',
  'guion-sequence.ts',
]

const lines = fs.readFileSync(p, 'utf8').split('\n')
const found = new Set()

for (const line of lines) {
  if (!line.trim()) continue
  let o
  try {
    o = JSON.parse(line)
  } catch {
    continue
  }
  const content = o.message?.content
  if (!Array.isArray(content)) continue
  for (const c of content) {
    if (c.type !== 'tool_use' || c.name !== 'Write') continue
    const path = c.input?.path?.replace(/\\/g, '/')
    if (!path) continue
    for (const t of targets) {
      if (path.endsWith(t)) {
        const dest = `${outDir}/src/lib/videos/${t}`
        fs.writeFileSync(dest, c.input.contents)
        found.add(t)
        console.log('recovered', t, c.input.contents.length)
      }
    }
  }
}

console.log('missing:', targets.filter((t) => !found.has(t)))
