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

export async function openPhoneChat(phone: string): Promise<void> {
  const cleanPhone = phone.replace(/[^0-9]/g, '')

  // 1. Native WA Web Link Element Click
  let helperLink = document.getElementById('wku-nav-link-helper') as HTMLAnchorElement | null
  if (!helperLink) {
    helperLink = document.createElement('a')
    helperLink.id = 'wku-nav-link-helper'
    helperLink.style.display = 'none'
    document.body.appendChild(helperLink)
  }
  helperLink.setAttribute('href', `https://web.whatsapp.com/send?phone=${cleanPhone}`)
  helperLink.click()

  // 2. Fallback via DOM manipulation if composer doesn't open in 1.2 seconds
  setTimeout(async () => {
    const composer = document.querySelector('footer div[contenteditable="true"]')
    if (!composer) {
      const newChatBtn = (
        document.querySelector('button[aria-label="New chat"]') ||
        document.querySelector('button[aria-label="Chat baru"]') ||
        document.querySelector('span[data-icon="chat"]')?.closest('button') ||
        document.querySelector('span[data-icon="new-chat-outline"]')?.closest('button')
      ) as HTMLElement | null

      if (newChatBtn) {
        newChatBtn.click()
        await new Promise(r => setTimeout(r, 400))
        let searchInput = (
          document.querySelector('div[contenteditable="true"][data-tab="3"]') ||
          document.querySelector('#side div[contenteditable="true"]') ||
          document.querySelector('[data-testid="chat-list-search"]') ||
          document.querySelector('div[contenteditable="true"]')
        ) as HTMLElement | null

        if (searchInput) {
          searchInput.focus()
          document.execCommand('selectAll', false)
          document.execCommand('delete', false)
          document.execCommand('insertText', false, cleanPhone)
          searchInput.dispatchEvent(new InputEvent('input', { bubbles: true }))

          await new Promise(r => setTimeout(r, 800))
          const firstResult = (
            document.querySelector('#pane-side [role="listitem"]') ||
            document.querySelector('#side [data-testid="chat-list-item"]') ||
            document.querySelector('[data-testid="cell-frame-container"]')
          ) as HTMLElement | null

          if (firstResult) {
            firstResult.click()
          }
        }
      }
    }
  }, 1200)
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
    debouncedCheck()
  })

  observer.observe(document.body, { childList: true, subtree: true })

  setInterval(() => {
    checkAndAutoReply()
  }, 5000)
}


