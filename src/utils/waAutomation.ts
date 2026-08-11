import {
  getAutoReplyEnabled,
  getAutoReplyMode,
  getAutoReplyRules,
  getAutoReplyAdvancedSettings,
  setAnalytics,
  getAnalytics,
  isExtensionValid
} from './storage'
import { formatTimestamp, debounce } from './helpers'
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

    // Mark as processed so we don't reply multiple times
    rememberMsgId(msgId)

    // Extract text content
    const textEl = lastMsgNode.querySelector('.selectable-text') ||
                   lastMsgNode.querySelector('.copyable-text') ||
                   lastMsgNode.querySelector('span[dir="ltr"]') ||
                   lastMsgNode.querySelector('span[dir="rtl"]')

    if (!textEl || !textEl.textContent) return
    const incomingText = textEl.textContent.trim().toLowerCase()

    const settings = await getAutoReplyAdvancedSettings()

    // 1. Cooldown Check
    if (isContactInCooldown(chatKey, settings.cooldownMinutes)) {
      console.log(`[AMAN CHAT] Auto-reply skipped for "${chatKey}" (Cooldown active)`)
      return
    }

    let replyText = ''

    // 2. Working Hours Check
    if (settings.useWorkingHours && !isWithinWorkingHours(settings)) {
      if (settings.outOfHoursReply) {
        replyText = settings.outOfHoursReply
      } else {
        console.log(`[AMAN CHAT] Auto-reply skipped (Outside working hours)`)
        return
      }
    } else {
      // Within Working Hours -> Evaluate Rules or Mode
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

        // Default Reply Fallback
        if (!replyText && settings.defaultReplyEnabled && settings.defaultReplyText) {
          replyText = settings.defaultReplyText
        }
      }
    }

    if (replyText) {
      console.log(`[AMAN CHAT] Smart Auto-replying to "${incomingText}" with "${replyText}"`)
      updateContactCooldown(chatKey)
      await new Promise(res => setTimeout(res, 800))
      await sendRealMessage(replyText, 'instant')

      const analytics = await getAnalytics()
      analytics.autoRepliesTriggered += 1
      await setAnalytics(analytics)
    }
  })
}

export async function openPhoneChat(phone: string): Promise<void> {
  const cleanPhone = phone.replace(/[^0-9]/g, '')

  // 1. Native WA Web Link Element Click (Interacted natively by WhatsApp Web React Router without page reload)
  let helperLink = document.getElementById('wku-nav-link-helper') as HTMLAnchorElement | null
  if (!helperLink) {
    helperLink = document.createElement('a')
    helperLink.id = 'wku-nav-link-helper'
    helperLink.style.display = 'none'
    document.body.appendChild(helperLink)
  }

  helperLink.setAttribute('href', `https://web.whatsapp.com/send?phone=${cleanPhone}`)
  helperLink.click()

  // 2. Fallback: Search phone number in left sidebar if composer doesn't open within 1.2 seconds
  setTimeout(async () => {
    const composer = document.querySelector('footer div[contenteditable="true"]')
    if (!composer) {
      let searchInput = (
        document.querySelector('#side div[contenteditable="true"]') ||
        document.querySelector('[data-testid="chat-list-search"]') ||
        document.querySelector('#side input[type="text"]')
      ) as HTMLElement | null

      if (!searchInput) {
        const newChatBtn = (
          document.querySelector('span[data-icon="chat"]')?.closest('button') ||
          document.querySelector('span[data-icon="new-chat-outline"]')?.closest('button') ||
          document.querySelector('button[aria-label="New chat"]') ||
          document.querySelector('button[aria-label="Chat baru"]')
        ) as HTMLElement | null

        if (newChatBtn) {
          newChatBtn.click()
          await new Promise(r => setTimeout(r, 400))
          searchInput = (
            document.querySelector('div[contenteditable="true"][data-tab="3"]') ||
            document.querySelector('#side div[contenteditable="true"]') ||
            document.querySelector('div[contenteditable="true"]')
          ) as HTMLElement | null
        }
      }

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
      // 1. Check for Invalid Number Popup Modal
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

          // Click OK/Dismiss button on modal
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

      // 2. Check for Composer Input Box
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

      // 3. Timeout check
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

  // Look for Send Button
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
    // Fallback: Dispatch Enter Key
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

export async function runRealBroadcast(
  numbers: string[],
  message1: string,
  message2: string | undefined,
  useTwoMessages: boolean,
  minInterval: number,
  maxInterval: number,
  typingMode: 'instant' | 'character',
  onProgress: (status: { index: number; total: number; log: string; done?: boolean }) => void
): Promise<void> {
  isBroadcastRunning = true
  isBroadcastPaused = false

  onProgress({
    index: 0,
    total: numbers.length,
    log: `[${formatTimestamp()}] --- Memulai Broadcast Real WhatsApp (${numbers.length} penerima) ---`
  })

  let successCount = 0
  let failedCount = 0

  for (let i = 0; i < numbers.length; i++) {
    if (!isBroadcastRunning) {
      onProgress({
        index: i,
        total: numbers.length,
        log: `[${formatTimestamp()}] Broadcast Di-hentikan oleh pengguna.`
      })
      return
    }

    while (isBroadcastPaused) {
      await new Promise(r => setTimeout(r, 1000))
      if (!isBroadcastRunning) return
    }

    const targetPhone = numbers[i]
    const currentMsg = useTwoMessages && i % 2 === 1 && message2 ? message2 : message1

    onProgress({
      index: i,
      total: numbers.length,
      log: `[${formatTimestamp()}] Opening chat untuk ${targetPhone}...`
    })

    await openPhoneChat(targetPhone)
    const readyResult = await waitForChatReadyOrError(12000)

    if (!readyResult.success) {
      failedCount++
      const reasonText = readyResult.reason === 'invalid_number' ? 'Nomor tidak terdaftar di WA' : 'Timeout membuka chat'
      onProgress({
        index: i + 1,
        total: numbers.length,
        log: `[${formatTimestamp()}] ❌ ${targetPhone}: ${reasonText}`
      })
    } else {
      await new Promise(r => setTimeout(r, 500))
      const sent = await sendRealMessage(currentMsg, typingMode)

      if (sent) {
        successCount++
        onProgress({
          index: i + 1,
          total: numbers.length,
          log: `[${formatTimestamp()}] ✅ Kirim ke ${targetPhone} BERHASIL!`
        })
      } else {
        failedCount++
        onProgress({
          index: i + 1,
          total: numbers.length,
          log: `[${formatTimestamp()}] ❌ Kirim ke ${targetPhone} GAGAL (Button Kirim Tidak Ditemukan)`
        })
      }
    }

    // Delay before next number (except last)
    if (i < numbers.length - 1) {
      const delaySec = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval
      onProgress({
        index: i + 1,
        total: numbers.length,
        log: `[${formatTimestamp()}] Menunggu jeda ${delaySec} detik...`
      })
      await new Promise(r => setTimeout(r, delaySec * 1000))
    }
  }

  isBroadcastRunning = false

  // Update real analytics
  const analytics = await getAnalytics()
  analytics.totalSent += numbers.length
  analytics.totalSuccess += successCount
  analytics.totalFailed += failedCount
  analytics.campaignsCount += 1
  await setAnalytics(analytics)

  onProgress({
    index: numbers.length,
    total: numbers.length,
    log: `[${formatTimestamp()}] 🎉 Kampanye Broadcast Selesai! (Sukses: ${successCount}, Gagal: ${failedCount})`,
    done: true
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

export function initAutoReplyObserver(): void {
  // 1. DOM Mutation Observer (debounced so rapid bursts of WhatsApp's own
  //    DOM churn only trigger one check instead of dozens).
  const observer = new MutationObserver(() => {
    debouncedCheck()
  })

  observer.observe(document.body, { childList: true, subtree: true })

  // 2. Low-frequency safety-net poll, in case a relevant mutation is missed
  setInterval(() => {
    checkAndAutoReply()
  }, 5000)
}
