import type { MarketingDevRequestInput, MarketingDevRequestType } from '@/types/marketing-dev-requests'

const KEY = 'ksi-marketing-dev-request-draft'

export type DevRequestPageTab = 'list' | 'new'

export type DevRequestDraft = {
  tab: DevRequestPageTab
  step: number
  requestType: MarketingDevRequestType
  form: MarketingDevRequestInput
  updatedAt: number
}

export type DevRequestListPrefs = {
  statusFilter: string
  mineOnly: boolean
  search: string
}

const LIST_KEY = 'ksi-marketing-dev-request-list-prefs'

function canUseStorage() {
  return typeof window !== 'undefined'
}

export function loadDevRequestDraft(): DevRequestDraft | null {
  if (!canUseStorage()) return null
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DevRequestDraft
    if (!parsed?.form) return null
    return parsed
  } catch {
    return null
  }
}

export function hasActiveDraft(): boolean {
  const d = loadDevRequestDraft()
  if (!d || d.tab !== 'new') return false
  return d.step > 1 || Boolean(d.form.title?.trim()) || Boolean(d.form.description?.trim())
}

export function saveDevRequestDraft(draft: DevRequestDraft) {
  if (!canUseStorage()) return
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...draft, updatedAt: Date.now() }))
  } catch {
    /* quota */
  }
}

export function clearDevRequestDraft() {
  if (!canUseStorage()) return
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function loadListPrefs(): DevRequestListPrefs | null {
  if (!canUseStorage()) return null
  try {
    const raw = sessionStorage.getItem(LIST_KEY)
    return raw ? (JSON.parse(raw) as DevRequestListPrefs) : null
  } catch {
    return null
  }
}

export function saveListPrefs(prefs: DevRequestListPrefs) {
  if (!canUseStorage()) return
  try {
    sessionStorage.setItem(LIST_KEY, JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}

export function getEnvironmentInfo(): string | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null
  return `${navigator.userAgent} · ${window.innerWidth}×${window.innerHeight}`
}

export function defaultForm(pathname = ''): MarketingDevRequestInput {
  return {
    target_module: 'marketing',
    request_type: 'bug',
    priority: 'medium',
    title: '',
    description: '',
    page_url: pathname || null,
    environment_info: getEnvironmentInfo(),
  }
}
