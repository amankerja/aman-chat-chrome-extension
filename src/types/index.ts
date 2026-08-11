export interface Template {
  id: string
  name: string
  text: string
  category?: string
}

export type MatchType = 'contains' | 'exact' | 'starts_with' | 'regex'

export interface AutoReplyRule {
  id: string
  keywords: string
  reply: string
  active: boolean
  matchType?: MatchType
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

export interface CustomTab {
  id: string
  name: string
  filter?: string
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
