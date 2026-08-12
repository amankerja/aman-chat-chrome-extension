import {
  getAutoReplyEnabled,
  getAutoReplyMode,
  getAutoReplyRules,
  getAutoReplyAdvancedSettings,
  getAutoReplyAdvanced,
  setAnalytics,
  getAnalytics,
  isExtensionValid,
  bumpDailyStat
} from './storage'
import { formatTimestamp, debounce, parseSpintax } from './helpers'
import type { AutoReplyRule, AutoReplySettings } from '../types'

const MAX_TRACKED_IDS = 300
const processedMsgIds = new Set<string>()
let lastChatKey: string | null = null
const contactCooldownMap = new Map<string, number>()

function rememberMsgId(id: string): void {
  processedMsgIds.add(id)
  if (processedMsgIds.size > MAX_TRACKED_IDS) {
    const oldest = processedMsgIds.values().next().value
    if (oldest !== undefined) processedMsgIds.delete(oldest)
  }
}

function getCurrentChatKey(): string | null {
  const header = document.querySelector('header [title]') || document.querySelector('#main header')
  const label = header?.textContent?.trim()
  return label ? label.slice(0, 100) : null
}

function getIncomingMessageNodes(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll('div.message-in, [class*="message-in"], div[data-id^="false_"]')
  ) as HTMLElement[]
}

function getMsgId(node: HTMLElement): string {
  return node.getAttribute('data-id') ||
    node.getAttribute('data-message-id') ||
    (node.textContent || '').slice(-50)
}

function matchesRuleKeyword(incomingText: string, rule: AutoReplyRule): boolean {
  if (!rule.active) return false
  const matchType = rule.matchType || 'contains'
  const keywords = rule.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)

  if (keywords.length === 0) return false

  return keywords.some(k => {
    switch (matchType) {
      case 'exact':
        return incomingText === k
      case 'startsWith':
      case 'starts_with':
        return incomingText.startsWith(k)
      case 'regex':
        try {
          return new RegExp(k, 'i').test(incomingText)
        } catch {
          return incomingText.includes(k)
        }
      case 'contains':
      default:
        return incomingText.includes(k)
    }
  })
}

function applyReplyVariables(text: string): string {
  const now = new Date()
  const hour = now.getHours()
  const sapaan = hour < 11 ? 'Pagi' : hour < 15 ? 'Siang' : hour < 19 ? 'Sore' : 'Malam'
  const jam = `${String(hour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return text.replace(/\{sapaan\}/gi, sapaan).replace(/\{jam\}/gi, jam)
}

function isWithinWorkingHours(settings: AutoReplySettings): boolean {
  if (!settings.useWorkingHours) return true

  const now = new Date()
  const day = now.getDay() // 0 = Sun, 1 = Mon ... 6 = Sat

  if (!settings.workingDays.includes(day)) {
    return false
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const [startH, startM] = (settings.workingHoursStart || '08:00').split(':').map(Number)
  const startMinutes = (startH || 0) * 60 + (startM || 0)

  const [endH, endM] = (settings.workingHoursEnd || '17:00').split(':').map(Number)
  const endMinutes = (endH || 0) * 60 + (endM || 0)

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes
}

function isWithinScheduleHours(startHour: number, endHour: number): boolean {
  const hour = new Date().getHours()
  if (startHour === endHour) return true
  if (startHour < endHour) return hour >= startHour && hour < endHour
  return hour >= startHour || hour < endHour
}

function isContactInCooldown(chatKey: string, cooldownMinutes: number): boolean {
  if (cooldownMinutes <= 0) return false
  const lastReplyTime = contactCooldownMap.get(chatKey)
  if (!lastReplyTime) return false

  const elapsedMs = Date.now() - lastReplyTime
  const cooldownMs = cooldownMinutes * 60 * 1000
  return elapsedMs < cooldownMs
}

function updateContactCooldown(chatKey: string): void {
  contactCooldownMap.set(chatKey, Date.now())
}

export function checkAndAutoReply(): void {
  if (!isExtensionValid()) return

  getAutoReplyEnabled().then(async (enabled) => {
    if (!enabled) return

    const incomingNodes = getIncomingMessageNodes()
    if (incomingNodes.length === 0) return

    const chatKey = getCurrentChatKey()
    if (!chatKey) return

    if (chatKey !== lastChatKey) {
      lastChatKey = chatKey
      for (const node of incomingNodes) {
        rememberMsgId(getMsgId(node))
      }
      return
    }

    const lastMsgNode = incomingNodes[incomingNodes.length - 1]
    const msgId = getMsgId(lastMsgNode)

    if (processedMsgIds.has(msgId)) return

    rememberMsgId(msgId)

    const textEl = lastMsgNode.querySelector('.selectable-text') ||
                   lastMsgNode.querySelector('.copyable-text') ||
                   lastMsgNode.querySelector('span[dir="ltr"]') ||
                   lastMsgNode.querySelector('span[dir="rtl"]')

    if (!textEl || !textEl.textContent) return
    const incomingText = textEl.textContent.trim().toLowerCase()

    const settings = await getAutoReplyAdvancedSettings()
    const advanced = await getAutoReplyAdvanced()

    const cooldownMin = settings.cooldownMinutes || advanced.cooldownMinutes || 3
    if (isContactInCooldown(chatKey, cooldownMin)) {
      console.log(`[AMAN CHAT] Auto-reply skipped for "${chatKey}" (Cooldown active)`)
      return
    }

    let replyText = ''

    if (advanced.schedule?.enabled && !isWithinScheduleHours(advanced.schedule.startHour, advanced.schedule.endHour)) {
      replyText = advanced.schedule.outsideHoursReply
    } else if (settings.useWorkingHours && !isWithinWorkingHours(settings)) {
      if (settings.outOfHoursReply) {
        replyText = settings.outOfHoursReply
      } else {
        console.log(`[AMAN CHAT] Auto-reply skipped (Outside working hours)`)
        return
      }
    } else {
      const rules = await getAutoReplyRules()
      const mode = await getAutoReplyMode()

      if (mode === 'all') {
        replyText = rules[0]?.reply || 'Halo! Pesan Anda telah kami terima.'
      } else {
        for (const r of rules) {
          if (matchesRuleKeyword(incomingText, r)) {
            replyText = r.reply
            break
          }
        }

        if (!replyText && (settings.defaultReplyEnabled || advanced.defaultReplyEnabled)) {
          replyText = settings.defaultReplyText || advanced.defaultReply || ''
        }
      }
    }

    if (replyText) {
      replyText = applyReplyVariables(replyText)
      console.log(`[AMAN CHAT] Smart Auto-replying to "${incomingText}" with "${replyText}"`)
      updateContactCooldown(chatKey)
      await new Promise(res => setTimeout(res, 800))
      await sendRealMessage(replyText, 'instant')

      const analytics = await getAnalytics()
      analytics.autoRepliesTriggered += 1
      await setAnalytics(analytics)
      await bumpDailyStat({ autoReplies: 1 })
    }
  })
}

function isElementVisible(el: HTMLElement): boolean {
  if (!el) return false
  if (el.id === 'aman-chat-sidebar' || el.closest('#aman-chat-sidebar')) return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
  const rect = el.getBoundingClientRect()
  return (rect.width > 0 || rect.height > 0 || el.offsetParent !== null)
}

function findWaSearchInput(): HTMLElement | null {
  // Strategy 1: Specific Lexical, drawer, and data-tab WhatsApp Web search selectors
  const specificSelectors = [
    'div[contenteditable="true"][data-lexical-editor="true"]',
    'div[data-animate-drawer-title="true"] div[contenteditable="true"]',
    'div[data-animate-drawer-title="true"] p.selectable-text',
    'div[data-animate-drawer-title="true"] [role="textbox"]',
    'div[data-testid="drawer-left"] div[contenteditable="true"]',
    'div[data-testid="drawer-left"] p.selectable-text',
    'div[data-testid="drawer-left"] [role="textbox"]',
    'div[data-testid="chat-list-search"] div[contenteditable="true"]',
    'div[data-testid="chat-list-search"] p.selectable-text',
    'div[data-testid="chat-list-search"] [role="textbox"]',
    'div[contenteditable="true"][data-tab="3"]',
    'div[contenteditable="true"][data-tab="2"]',
    'div[contenteditable="true"][data-tab="1"]',
    'div[contenteditable="true"][role="textbox"]',
    'div[role="textbox"][contenteditable="true"]',
    '#side div[contenteditable="true"]',
    '#side p.selectable-text',
    '#side [role="textbox"]',
    'div[contenteditable="true"][title*="Search"]',
    'div[contenteditable="true"][title*="Cari"]',
    'p.selectable-text.copyable-text',
    'div[contenteditable="true"]'
  ]

  for (const sel of specificSelectors) {
    const elements = Array.from(document.querySelectorAll(sel)) as HTMLElement[]
    for (const el of elements) {
      if (isElementVisible(el) && !el.closest('#main') && !el.closest('footer') && !el.closest('#aman-chat-sidebar')) {
        return el
      }
    }
  }

  // Strategy 2: Search by placeholder or title text ("Search name or number", "Search", "Cari")
  const placeholderCandidates = Array.from(document.querySelectorAll(
    '[placeholder*="Search"], [placeholder*="Cari"], ' +
    '[title*="Search"], [title*="Cari"], ' +
    '[aria-label*="Search"], [aria-label*="Cari"]'
  )) as HTMLElement[]

  for (const el of placeholderCandidates) {
    if (isElementVisible(el) && !el.closest('#main') && !el.closest('footer') && !el.closest('#aman-chat-sidebar')) {
      const target = (el.getAttribute('contenteditable') === 'true' || el.tagName === 'INPUT' || el.getAttribute('role') === 'textbox')
        ? el
        : (el.querySelector('div[contenteditable="true"], p.selectable-text, input, [role="textbox"]') as HTMLElement | null)
      if (target && isElementVisible(target)) {
        return target
      }
      return el
    }
  }

  // Strategy 3: Search icon proximity in left side/drawer
  const searchIcons = Array.from(document.querySelectorAll(
    '#side [data-icon="search"], ' +
    'div[data-animate-drawer-title="true"] [data-icon="search"], ' +
    'div[data-testid="drawer-left"] [data-icon="search"], ' +
    '[data-icon="search"]'
  )) as HTMLElement[]

  for (const icon of searchIcons) {
    if (isElementVisible(icon) && !icon.closest('#main') && !icon.closest('#aman-chat-sidebar')) {
      const container = icon.closest('div[role="region"], div[data-animate-drawer-title="true"], #side, div[data-testid="drawer-left"]') || icon.parentElement?.parentElement
      if (container) {
        const input = container.querySelector('div[contenteditable="true"], p.selectable-text, [role="textbox"], input') as HTMLElement | null
        if (input && isElementVisible(input) && !input.closest('#main') && !input.closest('#aman-chat-sidebar')) {
          return input
        }
      }
    }
  }

  // Strategy 4: Fallback - any editable or input element in left panel outside #main / #aman-chat-sidebar / footer
  const allEditables = Array.from(document.querySelectorAll(
    'div[contenteditable="true"], p.selectable-text, [role="textbox"], input[type="text"]'
  )) as HTMLElement[]

  for (const el of allEditables) {
    if (isElementVisible(el) && !el.closest('#main') && !el.closest('footer') && !el.closest('#aman-chat-sidebar')) {
      return el
    }
  }

  return null
}

async function typeIntoSearchInput(searchInput: HTMLElement, text: string): Promise<void> {
  searchInput.focus()
  await new Promise(r => setTimeout(r, 50))

  if (searchInput.tagName === 'INPUT') {
    (searchInput as HTMLInputElement).value = text
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    searchInput.dispatchEvent(new Event('change', { bubbles: true }))
    return
  }

  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(searchInput)
  selection?.removeAllRanges()
  selection?.addRange(range)

  const inserted = document.execCommand('insertText', false, text)
  if (!inserted || !searchInput.textContent?.includes(text)) {
    searchInput.innerText = text
    searchInput.textContent = text
  }

  searchInput.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }))
  searchInput.dispatchEvent(new Event('change', { bubbles: true }))
  searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', bubbles: true }))
  searchInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', code: 'KeyA', bubbles: true }))
}

export function dismissReloadCallsModal(): boolean {
  const dialogs = document.querySelectorAll('div[role="dialog"], div[data-animate-modal-body="true"], [data-testid="popup-contents"]')
  for (const dialog of Array.from(dialogs)) {
    const text = (dialog.textContent || '').toLowerCase()
    if (
      text.includes('reload to restore calls') ||
      text.includes('muat ulang untuk memulihkan panggilan') ||
      text.includes('calling couldn\'t start') ||
      text.includes('panggilan tidak dapat dimulai')
    ) {
      console.log('[AMAN CHAT] Auto-dismissing "Reload to restore calls" popup.')
      const buttons = Array.from(dialog.querySelectorAll('button, div[role="button"]')) as HTMLElement[]
      const notNowBtn = buttons.find(b => {
        const btnText = (b.textContent || '').toLowerCase().trim()
        return (
          btnText.includes('not now') ||
          btnText.includes('bukan sekarang') ||
          btnText.includes('batal') ||
          btnText.includes('cancel') ||
          btnText.includes('nanti')
        )
      })

      if (notNowBtn) {
        notNowBtn.click()
        return true
      }

      const closeBtn = (
        dialog.querySelector('span[data-icon="x"]')?.closest('button, div[role="button"]') ||
        dialog.querySelector('button[aria-label="Close"]') ||
        dialog.querySelector('button[aria-label="Tutup"]')
      ) as HTMLElement | null

      if (closeBtn) {
        closeBtn.click()
        return true
      }
    }
  }
  return false
}

export async function openPhoneChat(phone: string): Promise<void> {
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  if (!cleanPhone) return

  dismissReloadCallsModal()

  // 0. Check if the chat for this phone is already open in composer
  const activeHeader = document.querySelector('header [title]') || document.querySelector('#main header')
  if (activeHeader && activeHeader.textContent?.replace(/[^0-9]/g, '').includes(cleanPhone)) {
    console.log(`[AMAN CHAT] Chat for ${cleanPhone} is already open.`)
    return
  }

  // Step 1: Check if search input is ALREADY open/visible (e.g. New chat drawer is open)
  let searchInput = findWaSearchInput()

  if (!searchInput) {
    const triggerBtn = (
      document.querySelector('button[aria-label="New chat"]') ||
      document.querySelector('button[aria-label="Chat baru"]') ||
      document.querySelector('button[aria-label="Chat Baru"]') ||
      document.querySelector('button[aria-label*="Search"]') ||
      document.querySelector('button[aria-label*="Cari"]') ||
      document.querySelector('[data-testid="chat-list-search"]') ||
      document.querySelector('span[data-icon="chat"]')?.closest('button') ||
      document.querySelector('span[data-icon="new-chat-outline"]')?.closest('button') ||
      document.querySelector('span[data-icon="search"]')?.closest('button') ||
      document.querySelector('#side header')
    ) as HTMLElement | null

    if (triggerBtn) {
      triggerBtn.click()
      await new Promise(r => setTimeout(r, 300))
    }
  }

  // Step 2: Poll up to 25 times (3.75s) for search input
  for (let attempt = 0; attempt < 25; attempt++) {
    searchInput = findWaSearchInput()
    if (searchInput) break
    await new Promise(r => setTimeout(r, 150))
  }

  if (!searchInput) {
    const sideSearchIcon = document.querySelector('#side [data-icon="search"]')?.closest('div') as HTMLElement | null
    if (sideSearchIcon) {
      sideSearchIcon.click()
      await new Promise(r => setTimeout(r, 300))
      searchInput = findWaSearchInput()
    }
  }

  if (!searchInput) {
    console.error('[AMAN CHAT] Could not find WhatsApp search input element.')
    return
  }

  // Step 3: Type phone number into search input
  await typeIntoSearchInput(searchInput, cleanPhone)

  // Step 4: Wait for search result list item to appear and click it
  let resultClicked = false
  for (let attempt = 0; attempt < 25; attempt++) {
    await new Promise(r => setTimeout(r, 150))
    dismissReloadCallsModal()

    const searchResults = Array.from(document.querySelectorAll(
      '#pane-side [role="listitem"], ' +
      '#side [role="listitem"], ' +
      'div[data-animate-drawer-title="true"] [role="listitem"], ' +
      '[data-testid="chat-list-item"], ' +
      '[data-testid="cell-frame-container"], ' +
      'div[role="button"][data-testid^="cell-frame"], ' +
      'div[data-animate-drawer-title="true"] div[role="button"], ' +
      '#pane-side div[role="button"][tabindex="0"], ' +
      '#side div[role="button"][tabindex="0"]'
    )) as HTMLElement[]

    for (const item of searchResults) {
      if (isElementVisible(item)) {
        item.click()
        resultClicked = true
        console.log(`[AMAN CHAT] Clicked contact search result for ${cleanPhone}`)
        break
      }
    }

    if (resultClicked) break

    // Fallback: look for any element containing the cleanPhone digits
    const drawerOrSide = document.querySelector('div[data-animate-drawer-title="true"]') || document.querySelector('#pane-side') || document.querySelector('#side')
    if (drawerOrSide) {
      const candidates = Array.from(drawerOrSide.querySelectorAll('div[role="button"], [role="listitem"], span[title]')) as HTMLElement[]
      const match = candidates.find(el => {
        if (!isElementVisible(el)) return false
        const t = (el.textContent || '').replace(/[^0-9]/g, '')
        return t.includes(cleanPhone) || (cleanPhone.length >= 7 && t.includes(cleanPhone.slice(-7)))
      })

      if (match) {
        const clickTarget = match.closest('div[role="button"]') || match.closest('[role="listitem"]') || match
        ;(clickTarget as HTMLElement).click()
        resultClicked = true
        console.log(`[AMAN CHAT] Clicked matched text result for ${cleanPhone}`)
        break
      }
    }
  }

  if (!resultClicked) {
    console.warn(`[AMAN CHAT] No search result clicked for number: ${cleanPhone}`)
  }
}

export interface ChatReadyResult {
  success: boolean
  reason?: 'invalid_number' | 'timeout'
}

export function waitForChatReadyOrError(timeoutMs: number = 12000): Promise<ChatReadyResult> {
  return new Promise((resolve) => {
    const startTime = Date.now()

    const interval = setInterval(() => {
      const dialog = (
        document.querySelector('div[role="dialog"]') ||
        document.querySelector('[data-testid="popup-contents"]') ||
        document.querySelector('div[data-animate-modal-body]')
      )

      if (dialog) {
        const text = (dialog.textContent || '').toLowerCase()
        if (
          text.includes('tidak valid') ||
          text.includes('invalid') ||
          text.includes('tidak terdaftar') ||
          text.includes('not on whatsapp') ||
          text.includes('tautan tidak valid')
        ) {
          clearInterval(interval)
          const okBtn = (
            dialog.querySelector('button') ||
            dialog.querySelector('div[role="button"]') ||
            document.querySelector('button[aria-label="OK"]') ||
            document.querySelector('div[data-testid="popup-controls"] button')
          ) as HTMLElement | null

          if (okBtn) okBtn.click()

          resolve({ success: false, reason: 'invalid_number' })
          return
        }
      }

      const input = (
        document.querySelector('footer div[contenteditable="true"]') ||
        document.querySelector('[data-testid="conversation-compose-box-input"]') ||
        document.querySelector('div[contenteditable="true"][data-tab="10"]')
      ) as HTMLElement | null

      if (input && input.offsetParent !== null) {
        clearInterval(interval)
        resolve({ success: true })
        return
      }

      if (Date.now() - startTime >= timeoutMs) {
        clearInterval(interval)
        resolve({ success: false, reason: 'timeout' })
      }
    }, 350)
  })
}

export async function sendRealMessage(text: string, typingMode: 'instant' | 'character' = 'instant'): Promise<boolean> {
  const input = (
    document.querySelector('footer div[contenteditable="true"]') ||
    document.querySelector('[data-testid="conversation-compose-box-input"]') ||
    document.querySelector('div[contenteditable="true"][data-tab="10"]')
  ) as HTMLElement | null

  if (!input) {
    console.error('[AMAN CHAT] Composer input element not found!')
    return false
  }

  input.focus()

  if (typingMode === 'character') {
    for (const char of text) {
      document.execCommand('insertText', false, char)
      const delay = Math.floor(Math.random() * 30) + 15
      await new Promise(r => setTimeout(r, delay))
    }
  } else {
    document.execCommand('insertText', false, text)
  }

  input.dispatchEvent(new InputEvent('input', { bubbles: true }))
  await new Promise(r => setTimeout(r, 300))

  const sendBtn = (
    document.querySelector('[data-testid="compose-btn-send"]') ||
    document.querySelector('button[aria-label="Kirim"]') ||
    document.querySelector('button[aria-label="Send"]') ||
    document.querySelector('span[data-icon="send"]')?.closest('button')
  ) as HTMLElement | null

  if (sendBtn) {
    sendBtn.click()
    return true
  } else {
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true
    })
    input.dispatchEvent(enterEvent)
    return true
  }
}

// Global state for real broadcast runner
let isBroadcastRunning = false
let isBroadcastPaused = false

export function isBroadcastActuallyRunning(): boolean {
  return isBroadcastRunning
}

export interface BroadcastProgress {
  index: number
  total: number
  log: string
  done?: boolean
  failedNumbers?: string[]
}

export interface BroadcastRunOptions {
  numbers: string[]
  message1: string
  message2?: string
  useTwoMessages: boolean
  minInterval: number
  maxInterval: number
  typingMode: 'instant' | 'character'
  maxRetries?: number
  batchCooldownEvery?: number
  batchCooldownSeconds?: number
  useBatching?: boolean
  batchSize?: number
  batchDelayMinutes?: number
  enableSpintax?: boolean
  startIndex?: number
  onProgress: (status: BroadcastProgress) => void
}

export async function runRealBroadcast(
  optionsOrNumbers: BroadcastRunOptions | string[],
  message1?: string,
  message2?: string,
  useTwoMessages?: boolean,
  minInterval?: number,
  maxInterval?: number,
  typingMode?: 'instant' | 'character',
  onProgressCb?: (status: BroadcastProgress) => void,
  extraOptions?: {
    useBatching?: boolean
    batchSize?: number
    batchDelayMinutes?: number
    enableSpintax?: boolean
  }
): Promise<void> {
  let opts: BroadcastRunOptions

  if (Array.isArray(optionsOrNumbers)) {
    opts = {
      numbers: optionsOrNumbers,
      message1: message1 || '',
      message2,
      useTwoMessages: !!useTwoMessages,
      minInterval: minInterval || 3,
      maxInterval: maxInterval || 7,
      typingMode: typingMode || 'instant',
      useBatching: extraOptions?.useBatching,
      batchSize: extraOptions?.batchSize,
      batchDelayMinutes: extraOptions?.batchDelayMinutes,
      enableSpintax: extraOptions?.enableSpintax ?? true,
      onProgress: onProgressCb || (() => {})
    }
  } else {
    opts = optionsOrNumbers
  }

  const {
    numbers, message1: msg1, message2: msg2, useTwoMessages: useTwo,
    minInterval: minInt, maxInterval: maxInt, typingMode: mode,
    maxRetries = 1, batchCooldownEvery = 0, batchCooldownSeconds = 30,
    useBatching = false, batchSize = 10, batchDelayMinutes = 2,
    enableSpintax = true, onProgress
  } = opts

  const startIndex = opts.startIndex || 0

  isBroadcastRunning = true
  isBroadcastPaused = false

  const failedNumbers: string[] = []
  let successCount = 0
  let failedCount = 0

  onProgress({
    index: startIndex,
    total: numbers.length,
    log: `[${formatTimestamp()}] --- ${startIndex > 0 ? 'Melanjutkan' : 'Memulai'} Broadcast Real WhatsApp (${numbers.length} penerima) ---`
  })

  for (let i = startIndex; i < numbers.length; i++) {
    if (!isBroadcastRunning) {
      onProgress({
        index: i,
        total: numbers.length,
        log: `[${formatTimestamp()}] Broadcast Di-hentikan oleh pengguna.`,
        failedNumbers
      })
      return
    }

    while (isBroadcastPaused) {
      await new Promise(r => setTimeout(r, 1000))
      if (!isBroadcastRunning) return
    }

    const targetPhone = numbers[i]
    let currentMsg = useTwo && i % 2 === 1 && msg2 ? msg2 : msg1
    if (enableSpintax) {
      currentMsg = parseSpintax(currentMsg)
    }

    let attempt = 0
    let delivered = false
    let lastFailReason = ''

    while (attempt <= maxRetries && !delivered) {
      if (attempt > 0) {
        onProgress({
          index: i,
          total: numbers.length,
          log: `[${formatTimestamp()}] 🔁 Mencoba ulang ${targetPhone} (percobaan ${attempt + 1}/${maxRetries + 1})...`
        })
        await new Promise(r => setTimeout(r, 1500))
      } else {
        onProgress({
          index: i,
          total: numbers.length,
          log: `[${formatTimestamp()}] Opening chat untuk ${targetPhone}...`
        })
      }

      await openPhoneChat(targetPhone)
      if (!isBroadcastRunning) return
      const readyResult = await waitForChatReadyOrError(12000)

      if (!isBroadcastRunning) return

      if (!readyResult.success) {
        if (readyResult.reason === 'invalid_number') {
          lastFailReason = 'Nomor tidak terdaftar di WA'
          break
        }
        lastFailReason = 'Timeout membuka chat'
        attempt++
        continue
      }

      await new Promise(r => setTimeout(r, 500))
      if (!isBroadcastRunning) return

      const sent = await sendRealMessage(currentMsg, mode)

      if (sent) {
        delivered = true
      } else {
        lastFailReason = 'Button Kirim tidak ditemukan'
        attempt++
      }
    }

    if (!isBroadcastRunning) return

    if (delivered) {
      successCount++
      onProgress({
        index: i + 1,
        total: numbers.length,
        log: `[${formatTimestamp()}] ✅ Kirim ke ${targetPhone} BERHASIL!`
      })
      await bumpDailyStat({ sent: 1, success: 1 })
    } else {
      failedCount++
      failedNumbers.push(targetPhone)
      onProgress({
        index: i + 1,
        total: numbers.length,
        log: `[${formatTimestamp()}] ❌ ${targetPhone}: ${lastFailReason}`,
        failedNumbers: [...failedNumbers]
      })
      await bumpDailyStat({ sent: 1, failed: 1 })
    }

    if (useBatching && (i + 1) % batchSize === 0 && i < numbers.length - 1) {
      onProgress({
        index: i + 1,
        total: numbers.length,
        log: `[${formatTimestamp()}] ☕ Batch ${Math.floor((i + 1) / batchSize)} selesai (${i + 1} pesan). Istirahat ${batchDelayMinutes} menit...`
      })

      const totalBatchWaitMs = batchDelayMinutes * 60 * 1000
      const batchStartTime = Date.now()

      while (Date.now() - batchStartTime < totalBatchWaitMs) {
        if (!isBroadcastRunning) return
        while (isBroadcastPaused) {
          await new Promise(r => setTimeout(r, 1000))
          if (!isBroadcastRunning) return
        }
        await new Promise(r => setTimeout(r, 1000))
      }
    } else if (i < numbers.length - 1) {
      const sentSoFar = i - startIndex + 1
      if (batchCooldownEvery > 0 && sentSoFar % batchCooldownEvery === 0) {
        onProgress({
          index: i + 1,
          total: numbers.length,
          log: `[${formatTimestamp()}] ⏸ Jeda tambahan ${batchCooldownSeconds} detik setelah ${batchCooldownEvery} pesan (mengurangi risiko diblokir)...`
        })
        await new Promise(r => setTimeout(r, batchCooldownSeconds * 1000))
      } else {
        const delaySec = Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt
        onProgress({
          index: i + 1,
          total: numbers.length,
          log: `[${formatTimestamp()}] Menunggu jeda acak ${delaySec} detik...`
        })
        await new Promise(r => setTimeout(r, delaySec * 1000))
      }
    }
  }

  isBroadcastRunning = false

  const analytics = await getAnalytics()
  analytics.totalSent += (numbers.length - startIndex)
  analytics.totalSuccess += successCount
  analytics.totalFailed += failedCount
  analytics.campaignsCount += 1
  await setAnalytics(analytics)

  onProgress({
    index: numbers.length,
    total: numbers.length,
    log: `[${formatTimestamp()}] 🎉 Kampanye Broadcast Selesai! (Sukses: ${successCount}, Gagal: ${failedCount})`,
    done: true,
    failedNumbers
  })
}

export function pauseRealBroadcast(): void {
  isBroadcastPaused = true
}

export function resumeRealBroadcast(): void {
  isBroadcastPaused = false
}

export function stopRealBroadcast(): void {
  isBroadcastRunning = false
  isBroadcastPaused = false
}

const debouncedCheck = debounce(() => checkAndAutoReply(), 400)
let isAutoReplyObserverInit = false

export function initAutoReplyObserver(): void {
  if (isAutoReplyObserverInit) return
  isAutoReplyObserverInit = true

  const observer = new MutationObserver(() => {
    dismissReloadCallsModal()
    debouncedCheck()
  })

  observer.observe(document.body, { childList: true, subtree: true })

  setInterval(() => {
    dismissReloadCallsModal()
    checkAndAutoReply()
  }, 3000)
}


