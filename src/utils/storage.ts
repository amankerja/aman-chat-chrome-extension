import type {
  Template,
  AutoReplyRule,
  AutoReplySettings,
  CRMContact,
  PrivacySettings,
  FollowUpTask,
  Analytics,
  CustomTab,
  BroadcastState
} from '../types'

const STORAGE_KEYS = {
  PRIVACY: 'wku_privacy',
  TEMPLATES: 'wku_templates',
  AUTOREPLY_RULES: 'wku_autoreply_rules',
  AUTOREPLY_ENABLED: 'wku_autoreply_enabled',
  AUTOREPLY_MODE: 'wku_autoreply_mode',
  AUTOREPLY_SETTINGS: 'wku_autoreply_settings',
  CRM_CONTACTS: 'wku_crm_contacts',
  BROADCAST_STATE: 'wku_broadcast_state',
  FOLLOWUP_TASKS: 'wku_followup_tasks',
  ANALYTICS: 'wku_analytics',
  CUSTOM_TABS: 'wku_custom_tabs',
  LICENSE_KEY: 'wku_license_key',
  IS_PREMIUM: 'wku_is_premium'
} as const

const DEFAULT_TEMPLATES: Template[] = [
  { id: '1', name: 'Sapaan Pelanggan', text: 'Halo, terima kasih telah menghubungi kami. Ada yang bisa kami bantu?', category: 'greeting' },
  { id: '2', name: 'Mohon Ditunggu', text: 'Baik, mohon tunggu sebentar ya kak, sedang kami proses.', category: 'response' },
  { id: '3', name: 'Info Rekening', text: 'Pembayaran dapat ditransfer ke rekening BCA 123456789 a.n AMAN CHAT.', category: 'payment' },
  { id: '4', name: 'Template Offline', text: 'Halo! Mohon maaf saat ini kami sedang offline. Pesan Anda akan kami balas segera.', category: 'offline' }
]

const DEFAULT_PRIVACY: PrivacySettings = {
  blurChats: false,
  blurPreviews: false,
  blurAvatars: false,
  blurMessages: false,
  blurMedia: false
}

const DEFAULT_ANALYTICS: Analytics = {
  totalSent: 0,
  totalSuccess: 0,
  totalFailed: 0,
  autoRepliesTriggered: 0,
  campaignsCount: 0
}

const DEFAULT_AUTOREPLY_SETTINGS: AutoReplySettings = {
  enabled: false,
  mode: 'keywords',
  cooldownMinutes: 5,
  useWorkingHours: false,
  workingHoursStart: '08:00',
  workingHoursEnd: '17:00',
  workingDays: [1, 2, 3, 4, 5],
  outOfHoursReply: 'Halo! Terima kasih telah menghubungi kami. Saat ini kami sedang di luar jam kerja (Senin - Jumat, 08:00 - 17:00). Pesan Anda akan kami balas secepatnya pada jam kerja berikutnya.',
  defaultReplyEnabled: false,
  defaultReplyText: 'Mohon maaf, pesan Anda belum dapat diproses secara otomatis. Tim kami akan segera merespons.'
}

export function isExtensionValid(): boolean {
  try {
    return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id
  } catch {
    return false
  }
}

function getStorage<T>(key: string, defaultValue: T): Promise<T> {
  return new Promise((resolve) => {
    if (!isExtensionValid() || !chrome.storage?.local) {
      resolve(defaultValue)
      return
    }
    try {
      chrome.storage.local.get([key], (result: Record<string, T>) => {
        if (chrome.runtime?.lastError) {
          resolve(defaultValue)
        } else {
          resolve(result && result[key] !== undefined ? result[key] : defaultValue)
        }
      })
    } catch {
      resolve(defaultValue)
    }
  })
}

function setStorage<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    if (!isExtensionValid() || !chrome.storage?.local) {
      resolve()
      return
    }
    try {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve()
      })
    } catch {
      resolve()
    }
  })
}

export function getPrivacySettings(): Promise<PrivacySettings> {
  return getStorage<PrivacySettings>(STORAGE_KEYS.PRIVACY, DEFAULT_PRIVACY)
}

export function setPrivacySettings(settings: PrivacySettings): Promise<void> {
  return setStorage<PrivacySettings>(STORAGE_KEYS.PRIVACY, settings)
}

export function getTemplates(): Promise<Template[]> {
  return getStorage<Template[]>(STORAGE_KEYS.TEMPLATES, DEFAULT_TEMPLATES)
}

export function setTemplates(templates: Template[]): Promise<void> {
  return setStorage<Template[]>(STORAGE_KEYS.TEMPLATES, templates)
}

export function getAutoReplyRules(): Promise<AutoReplyRule[]> {
  return getStorage<AutoReplyRule[]>(STORAGE_KEYS.AUTOREPLY_RULES, [])
}

export function setAutoReplyRules(rules: AutoReplyRule[]): Promise<void> {
  return setStorage<AutoReplyRule[]>(STORAGE_KEYS.AUTOREPLY_RULES, rules)
}

export function getAutoReplyEnabled(): Promise<boolean> {
  return getStorage<boolean>(STORAGE_KEYS.AUTOREPLY_ENABLED, false)
}

export function setAutoReplyEnabled(enabled: boolean): Promise<void> {
  return setStorage<boolean>(STORAGE_KEYS.AUTOREPLY_ENABLED, enabled)
}

export function getAutoReplyMode(): Promise<'all' | 'keywords'> {
  return getStorage<'all' | 'keywords'>(STORAGE_KEYS.AUTOREPLY_MODE, 'keywords')
}

export function setAutoReplyMode(mode: 'all' | 'keywords'): Promise<void> {
  return setStorage<'all' | 'keywords'>(STORAGE_KEYS.AUTOREPLY_MODE, mode)
}

export function getAutoReplyAdvancedSettings(): Promise<AutoReplySettings> {
  return getStorage<AutoReplySettings>(STORAGE_KEYS.AUTOREPLY_SETTINGS, DEFAULT_AUTOREPLY_SETTINGS)
}

export function setAutoReplyAdvancedSettings(settings: AutoReplySettings): Promise<void> {
  return setStorage<AutoReplySettings>(STORAGE_KEYS.AUTOREPLY_SETTINGS, settings)
}

export function getCRMContacts(): Promise<CRMContact[]> {
  return getStorage<CRMContact[]>(STORAGE_KEYS.CRM_CONTACTS, [])
}

export function setCRMContacts(contacts: CRMContact[]): Promise<void> {
  return setStorage<CRMContact[]>(STORAGE_KEYS.CRM_CONTACTS, contacts)
}

export function getBroadcastState(): Promise<BroadcastState | null> {
  return getStorage<BroadcastState | null>(STORAGE_KEYS.BROADCAST_STATE, null)
}

export function setBroadcastState(state: BroadcastState | null): Promise<void> {
  return setStorage<BroadcastState | null>(STORAGE_KEYS.BROADCAST_STATE, state)
}

export function getFollowUpTasks(): Promise<FollowUpTask[]> {
  return getStorage<FollowUpTask[]>(STORAGE_KEYS.FOLLOWUP_TASKS, [])
}

export function setFollowUpTasks(tasks: FollowUpTask[]): Promise<void> {
  return setStorage<FollowUpTask[]>(STORAGE_KEYS.FOLLOWUP_TASKS, tasks)
}

export function getAnalytics(): Promise<Analytics> {
  return getStorage<Analytics>(STORAGE_KEYS.ANALYTICS, DEFAULT_ANALYTICS)
}

export function setAnalytics(analytics: Analytics): Promise<void> {
  return setStorage<Analytics>(STORAGE_KEYS.ANALYTICS, analytics)
}

export function getCustomTabs(): Promise<CustomTab[]> {
  return getStorage<CustomTab[]>(STORAGE_KEYS.CUSTOM_TABS, [])
}

export function setCustomTabs(tabs: CustomTab[]): Promise<void> {
  return setStorage<CustomTab[]>(STORAGE_KEYS.CUSTOM_TABS, tabs)
}

export function getLicenseKey(): Promise<string | null> {
  return getStorage<string | null>(STORAGE_KEYS.LICENSE_KEY, null)
}

export function setLicenseKey(key: string | null): Promise<void> {
  return setStorage<string | null>(STORAGE_KEYS.LICENSE_KEY, key)
}

export function getIsPremium(): Promise<boolean> {
  return getStorage<boolean>(STORAGE_KEYS.IS_PREMIUM, false)
}

export function setIsPremium(isPremium: boolean): Promise<void> {
  return setStorage<boolean>(STORAGE_KEYS.IS_PREMIUM, isPremium)
}

export async function initializeStorage(): Promise<void> {
  const privacy = await getPrivacySettings()
  await setPrivacySettings(privacy)
  const templates = await getTemplates()
  await setTemplates(templates)
  const analytics = await getAnalytics()
  await setAnalytics(analytics)
}

export { STORAGE_KEYS, DEFAULT_TEMPLATES, DEFAULT_PRIVACY, DEFAULT_ANALYTICS }
