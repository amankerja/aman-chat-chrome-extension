export interface Template {
  id: string
  name: string
  text: string
  category?: string
}

export type MatchType = 'contains' | 'exact' | 'startsWith' | 'starts_with' | 'regex'

export interface AutoReplyRule {
  id: string
  keywords: string
  reply: string
  active: boolean
  matchType?: MatchType
}

export interface AutoReplySchedule {
  enabled: boolean
  /** 0-23 */
  startHour: number
  /** 0-23 */
  endHour: number
  outsideHoursReply: string
}

export interface AutoReplyAdvancedSettings {
  schedule: AutoReplySchedule
  defaultReplyEnabled: boolean
  defaultReply: string
  /** Minimum minutes before auto-replying to the same chat again. */
  cooldownMinutes: number
}

export interface AutoReplySettings {
  enabled: boolean
  mode: 'all' | 'keywords'
  cooldownMinutes: number
  useWorkingHours: boolean
  workingHoursStart: string
  workingHoursEnd: string
  workingDays: number[]
  outOfHoursReply: string
  defaultReplyEnabled: boolean
  defaultReplyText: string
}

export interface CRMContact {
  id: string
  name: string
  phone: string
  stage: 'lead' | 'prospect' | 'customer' | 'churned'
  source: string
  tags: string[]
  notes: string
  lastUpdated: string
}

export interface BroadcastState {
  status: 'idle' | 'sending' | 'paused' | 'completed'
  numbers: string[]
  currentIndex: number
  message: string
  message2?: string
  useTwoMessages: boolean
  minInterval: number
  maxInterval: number
  logs: string[]
  attachment?: File
  numberStatuses?: NumberStatus[]
  typingMode: 'character' | 'instant'
  /** How many times to retry a number that times out / fails before giving up. */
  maxRetries?: number
  /** Insert a longer cooldown every N sends to look less bot-like. */
  batchCooldownEvery?: number
  batchCooldownSeconds?: number
  /** Numbers that failed on the most recent run, for a quick "retry failed only". */
  failedNumbers?: string[]
  /** True if this run was interrupted (tab/page reloaded) mid-broadcast. */
  interrupted?: boolean
  useBatching?: boolean
  batchSize?: number
  batchDelayMinutes?: number
  enableSpintax?: boolean
}

export interface NumberStatus {
  number: string
  status: 'pending' | 'sent' | 'failed' | 'not_registered'
  timestamp?: number
}

export interface PrivacySettings {
  blurChats: boolean
  blurPreviews: boolean
  blurAvatars: boolean
  blurMessages: boolean
  blurMedia: boolean
  pinLockEnabled?: boolean
  pinCode?: string
  inactivityTimeout?: number
}

export interface FollowUpTask {
  id: string
  contact: string
  text: string
  timestamp: number
  status: 'pending' | 'completed'
  dueDate?: number
}

export interface Analytics {
  totalSent: number
  totalSuccess: number
  totalFailed: number
  autoRepliesTriggered: number
  campaignsCount: number
}

export interface DailyStat {
  /** 'YYYY-MM-DD' in the user's local timezone */
  date: string
  sent: number
  success: number
  failed: number
  autoReplies: number
}

export interface CustomTab {
  id: string
  name: string
  filter?: string
}

export interface LicenseDetails {
  serialNumber: string
  status: 'Active' | 'Expired' | 'Revoked' | 'Inactive' | string
  deviceId?: string
  email?: string
  phone?: string
  purchaseDate?: string
  expiryDate?: string
  duration?: string
  lastVerified?: number
}

export interface ExtensionState {
  privacy: PrivacySettings
  templates: Template[]
  autoReplyRules: AutoReplyRule[]
  crmContacts: CRMContact[]
  broadcastState: BroadcastState
  followUpTasks: FollowUpTask[]
  analytics: Analytics
  customTabs: CustomTab[]
  autoReplyEnabled: boolean
  autoReplyMode: 'all' | 'keywords'
  isPremium: boolean
  licenseKey?: string
  licenseDetails?: LicenseDetails
}

export interface WhatsAppSelectors {
  chatHeader: string
  chatRow: string
  messageInput: string
  sendButton: string
  chatList: string
  messageIn: string
  messageOut: string
}

export const WA_SELECTORS: WhatsAppSelectors = {
  chatHeader: 'header',
  chatRow: '[data-testid="chat-list-item"]',
  messageInput: '[data-testid="conversation-compose-box-input"]',
  sendButton: '[data-testid="compose-btn-send"]',
  chatList: '#side',
  messageIn: '[class*="message-in"]',
  messageOut: '[class*="message-out"]'
}

