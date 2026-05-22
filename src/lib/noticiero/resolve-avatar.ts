import { NOTICIERO_AVATARS } from '@/app/marketing/noticiero/config/avatars'

export type NoticieroAvatarConfig = (typeof NOTICIERO_AVATARS)[number]

/** Resuelve avatar y voz: si hay avatar_id, la voz sale siempre del catálogo fijo. */
export function resolveHeyGenAvatarAndVoice(
  avatarId?: string | null,
  voiceId?: string | null
): { avatarId: string; voiceId: string } {
  const trimmedAvatar = avatarId?.trim()
  if (trimmedAvatar) {
    const found = NOTICIERO_AVATARS.find((a) => a.id === trimmedAvatar)
    if (found) {
      return { avatarId: found.id, voiceId: found.voice_id }
    }
  }

  const envAvatar = process.env.HEYGEN_AVATAR_ID?.trim()
  const envVoice = process.env.HEYGEN_VOICE_ID?.trim()
  if (envAvatar && envVoice) {
    return { avatarId: envAvatar, voiceId: envVoice }
  }

  const fallback = NOTICIERO_AVATARS[0]
  const resolvedAvatar = trimmedAvatar || fallback.id
  const resolvedVoice = voiceId?.trim() || fallback.voice_id
  return { avatarId: resolvedAvatar, voiceId: resolvedVoice }
}
