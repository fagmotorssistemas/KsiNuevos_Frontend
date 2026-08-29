import { redirect } from 'next/navigation'
import { PUBLIC_PATHS } from '@/lib/nav/publicPaths'

export default function LegacyHomeRedirect() {
  redirect(PUBLIC_PATHS.home)
}
