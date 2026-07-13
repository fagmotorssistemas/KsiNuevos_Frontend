/**
 * Resuelve ffmpeg/ffprobe en el servidor Node (Windows winget, PATH, o env).
 * El dev server de Next no hereda PATH recién actualizado hasta reiniciar;
 * este módulo busca la instalación de winget directamente.
 */

import { execFile } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export type FfmpegBinaries = {
  ffmpeg: string
  ffprobe: string
}

let cached: FfmpegBinaries | null | undefined

function siblingFfprobe(ffmpegPath: string): string {
  const dir = path.dirname(ffmpegPath)
  const name = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'
  return path.join(dir, name)
}

function findBinInTree(dir: string, fileName: string, depth = 0): string | null {
  if (depth > 5 || !fs.existsSync(dir)) return null
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isFile() && entry.name.toLowerCase() === fileName.toLowerCase()) {
        return full
      }
      if (entry.isDirectory()) {
        const found = findBinInTree(full, fileName, depth + 1)
        if (found) return found
      }
    }
  } catch {
    /* best-effort */
  }
  return null
}

function findWingetFfmpegOnWindows(): string | null {
  if (process.platform !== 'win32') return null
  const localApp = process.env.LOCALAPPDATA
  if (!localApp) return null

  const packagesDir = path.join(localApp, 'Microsoft', 'WinGet', 'Packages')
  if (!fs.existsSync(packagesDir)) return null

  try {
    for (const entry of fs.readdirSync(packagesDir)) {
      if (!/ffmpeg/i.test(entry)) continue
      const found = findBinInTree(path.join(packagesDir, entry), 'ffmpeg.exe')
      if (found) return found
    }
  } catch {
    /* best-effort */
  }
  return null
}

async function tryResolveFromPath(command: string): Promise<string | null> {
  try {
    const bin = process.platform === 'win32' ? 'where.exe' : 'which'
    const { stdout } = await execFileAsync(bin, [command], {
      timeout: 8000,
      windowsHide: true,
    })
    const line = stdout.trim().split(/\r?\n/)[0]?.trim()
    if (line && fs.existsSync(line)) return line
  } catch {
    /* not on PATH */
  }
  return null
}

function pairIfValid(ffmpeg: string, ffprobeOverride?: string): FfmpegBinaries | null {
  const ffprobe = ffprobeOverride?.trim() || siblingFfprobe(ffmpeg)
  if (fs.existsSync(ffmpeg) && fs.existsSync(ffprobe)) {
    return { ffmpeg, ffprobe }
  }
  return null
}

/** Devuelve rutas absolutas a ffmpeg/ffprobe, o null si no hay binarios. */
export async function resolveFfmpegBinaries(): Promise<FfmpegBinaries | null> {
  if (cached !== undefined) return cached

  const candidates: string[] = []
  if (process.env.FFMPEG_PATH?.trim()) candidates.push(process.env.FFMPEG_PATH.trim())

  const winget = findWingetFfmpegOnWindows()
  if (winget) candidates.push(winget)

  const fromPath = await tryResolveFromPath(process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
  if (fromPath) candidates.push(fromPath)

  for (const ffmpeg of candidates) {
    const pair = pairIfValid(ffmpeg, process.env.FFPROBE_PATH)
    if (pair) {
      cached = pair
      return pair
    }
  }

  cached = null
  return null
}

export function resetFfmpegPathCache(): void {
  cached = undefined
}
