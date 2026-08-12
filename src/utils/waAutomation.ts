import {
  getAutoReplyEnabled,
  getAutoReplyMode,
  getAutoReplyRules,
  getAutoReplyAdvancedSettings,
  getAutoReplyAdvanced,
  setAnalytics,
  getAnalytics,
  isExtensionValid,
  bumpDailyStat,
  addErrorLog
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
  const header = document.querySelector('#main header [title]') ||
                 document.querySelector('#main header span[dir="auto"]') ||
                 document.querySelector('#main header') ||
                 document.querySelector('header [title]')
  const label = header?.textContent?.trim()
  return label ? label.slice(0, 100) : null
}

function getIncomingMessageNodes(): HTMLElement[] {
  const selectors = [
    '#main div.message-in',
    '#main [class*="message-in"]',
    '#main div[data-id^="false_"]',
    '#main div[data-id*="false_"]',
    'div.message-in',
    '[class*="message-in"]',
    'div[data-id^="false_"]'
  ]
  const nodes: HTMLElement[] = []
  const seen = new Set<HTMLElement>()

  for (const sel of selectors) {
    const list = Array.from(document.querySelectorAll(sel)) as HTMLElement[]
    for (const node of list) {
      if (!seen.has(node)) {
        seen.add(node)
        nodes.push(node)
      }
    }
  }
  return nodes
}

function getMsgId(node: HTMLElement, indexInChat: number = 0): string {
  const container = node.closest('[data-id]') || node
  const dataId = container.getAttribute('data-id') || container.getAttribute('data-message-id')
  if (dataId) return dataId

  const text = (node.textContent || '').trim()
  return `${lastChatKey || 'chat'}_idx${indexInChat}_${text.slice(-40)}`
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

    const chatKey = getCurrentChatKey()
    if (!chatKey) return

    const incomingNodes = getIncomingMessageNodes()
    if (incomingNodes.length === 0) return

    const isNewChat = chatKey !== lastChatKey
    if (isNewChat) {
      lastChatKey = chatKey
      // Mark older incoming messages except the last one as remembered
      for (let i = 0; i < incomingNodes.length - 1; i++) {
        rememberMsgId(getMsgId(incomingNodes[i], i))
      }
    }

    const lastIdx = incomingNodes.length - 1
    const lastMsgNode = incomingNodes[lastIdx]
    const msgId = getMsgId(lastMsgNode, lastIdx)

    if (processedMsgIds.has(msgId)) return

    // Check if the last message in chat container (#main) is an incoming message
    const allMsgNodes = Array.from(document.querySelectorAll('#main div.message-in, #main div.message-out, #main [class*="message-in"], #main [class*="message-out"]')) as HTMLElement[]
    if (allMsgNodes.length > 0) {
      const globalLastMsg = allMsgNodes[allMsgNodes.length - 1]
      const isGlobalLastIncoming = globalLastMsg.classList.contains('message-in') ||
                                   globalLastMsg.className.includes('message-in') ||
                                   globalLastMsg.getAttribute('data-id')?.startsWith('false_') ||
                                   globalLastMsg === lastMsgNode ||
                                   lastMsgNode.contains(globalLastMsg)

      if (!isGlobalLastIncoming) {
        rememberMsgId(msgId)
        return
      }
    }

    const textEl = lastMsgNode.querySelector('.selectable-text') ||
                   lastMsgNode.querySelector('.copyable-text') ||
                   lastMsgNode.querySelector('span[dir="ltr"]') ||
                   lastMsgNode.querySelector('span[dir="rtl"]') ||
                   lastMsgNode

    if (!textEl || !textEl.textContent) return
    const incomingText = textEl.textContent.trim().toLowerCase()
    if (!incomingText) return

    const settings = await getAutoReplyAdvancedSettings()
    const advanced = await getAutoReplyAdvanced()

    const cooldownMin = settings.cooldownMinutes || advanced.cooldownMinutes || 3
    if (isContactInCooldown(chatKey, cooldownMin)) {
      console.log(`[AMAN CHAT] Auto-reply skipped for "${chatKey}" (Cooldown active ${cooldownMin}m)`)
      rememberMsgId(msgId)
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
        rememberMsgId(msgId)
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
      console.log(`[AMAN CHAT] 🤖 Smart Auto-replying to "${incomingText}" with "${replyText}"`)
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

function isInstallerOrDownloadElement(el: HTMLElement): boolean {
  if (!el) return false
  const text = (el.textContent || '').toLowerCase()
  if (
    text.includes('whatsapp for windows') ||
    text.includes('chat history on the app') ||
    text.includes('get whatsapp') ||
    text.includes('dapatkan whatsapp') ||
    text.includes('download whatsapp') ||
    text.includes('unduh whatsapp') ||
    text.includes('whatsapp_installer') ||
    text.includes('installer.exe')
  ) {
    return true
  }

  const href = el.getAttribute('href') || el.querySelector('a')?.getAttribute('href') || ''
  if (href.toLowerCase().includes('download') || href.toLowerCase().includes('installer')) {
    return true
  }

  return false
}

function isElementVisible(el: HTMLElement): boolean {
  if (!el) return false
  if (el.id === 'aman-chat-sidebar' || el.closest('#aman-chat-sidebar')) return false
  if (isInstallerOrDownloadElement(el) || el.closest('a[href*="download"]')) return false
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

  // 1. Select all and clear existing search text first
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(searchInput)
  selection?.removeAllRanges()
  selection?.addRange(range)

  document.execCommand('selectAll', false)
  document.execCommand('delete', false)
  if (searchInput.textContent) {
    searchInput.innerText = ''
    searchInput.textContent = ''
  }

  searchInput.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'deleteContentBackward' }))
  searchInput.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'deleteContentBackward' }))

  await new Promise(r => setTimeout(r, 50))

  // 2. Insert text via ClipboardEvent ('paste') for Lexical compatibility + execCommand fallback
  try {
    const dt = new DataTransfer()
    dt.setData('text/plain', text)
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true
    })
    searchInput.dispatchEvent(pasteEvent)
  } catch (e) {
    console.warn('[AMAN CHAT] Clipboard paste event error:', e)
  }

  searchInput.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }))
  const inserted = document.execCommand('insertText', false, text)
  if (!inserted || !searchInput.textContent?.includes(text)) {
    searchInput.innerText = text
    searchInput.textContent = text
  }

  searchInput.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }))
  searchInput.dispatchEvent(new Event('change', { bubbles: true }))
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
      const okBtn = (
        dialog.querySelector('button[aria-label="OK"]') ||
        dialog.querySelector('button[aria-label="Not now"]') ||
        dialog.querySelector('button[aria-label="Bukan sekarang"]') ||
        dialog.querySelector('button')
      ) as HTMLElement | null

      if (okBtn) {
        okBtn.click()
        return true
      }
    }
  }
  return false
}

export async function openPhoneChat(phone: string): Promise<void> {
  const rawDigits = phone.replace(/[^0-9]/g, '')
  if (!rawDigits) return

  // Automatically normalize local Indonesian number 08xxx to 628xxx for WA Web compatibility
  const cleanPhone = rawDigits.startsWith('0') ? '62' + rawDigits.slice(1) : rawDigits
  const significantDigits = rawDigits.replace(/^0+/, '').replace(/^62+/, '')
  const targetSuffix = cleanPhone.length >= 7 ? cleanPhone.slice(-7) : cleanPhone

  dismissReloadCallsModal()

  // 0. Check if the chat for this phone is already open in composer
  const activeHeader = document.querySelector('header [title]') || document.querySelector('#main header')
  if (activeHeader) {
    const headerDigits = activeHeader.textContent?.replace(/[^0-9]/g, '') || ''
    if (headerDigits.includes(cleanPhone) || (significantDigits.length >= 6 && headerDigits.includes(significantDigits))) {
      console.log(`[AMAN CHAT] Chat for ${cleanPhone} is already open.`)
      return
    }
  }

  // METHOD 1: Native Anchor Link Click (Triggers WhatsApp Web's internal link handler)
  try {
    let link = document.getElementById('aman-chat-direct-link') as HTMLAnchorElement | null
    if (!link) {
      link = document.createElement('a')
      link.id = 'aman-chat-direct-link'
      link.style.display = 'none'
      document.body.appendChild(link)
    }
    link.href = `https://web.whatsapp.com/send?phone=${cleanPhone}`
    link.click()

    const fastComposer = await pollForElement(findComposerInput, 2000, 100)
    if (fastComposer) {
      console.log(`[AMAN CHAT] Successfully opened chat for ${cleanPhone} via Native Link Click.`)
      return
    }
  } catch (err) {
    console.warn('[AMAN CHAT] Native link click failed:', err)
  }

  // METHOD 2: DOM UI Search Fallback with Lexical Paste & Expanded Search Candidates
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
      searchInput = findWaSearchInput()
    }
  }

  if (searchInput) {
    await typeIntoSearchInput(searchInput, cleanPhone)
    await new Promise(r => setTimeout(r, 450))

    let resultClicked = false

    for (let attempt = 0; attempt < 35; attempt++) {
      await new Promise(r => setTimeout(r, 150))
      dismissReloadCallsModal()

      const searchContainers = Array.from(document.querySelectorAll(
        'div[data-animate-drawer-title="true"], ' +
        'div[data-testid="drawer-left"], ' +
        'div[data-testid="chat-list-search"], ' +
        '#pane-side, ' +
        '#side'
      )) as HTMLElement[]

      for (const container of searchContainers) {
        if (!isElementVisible(container) || container.closest('#main')) continue

        const candidateElements = Array.from(container.querySelectorAll(
          '[role="listitem"], ' +
          '[data-testid], ' +
          'div[role="button"], ' +
          'div[tabindex], ' +
          'span[title], ' +
          'p, div'
        )) as HTMLElement[]

        for (const el of candidateElements) {
          if (!isElementVisible(el) || isInstallerOrDownloadElement(el) || el.closest('#main')) continue

          const itemText = (el.textContent || '').replace(/[^0-9]/g, '')
          if (!itemText) continue

          // MULTI-FORMAT MATCH: Check cleanPhone, rawDigits, significantDigits, or targetSuffix!
          if (
            itemText.includes(cleanPhone) ||
            itemText.includes(rawDigits) ||
            (significantDigits.length >= 6 && itemText.includes(significantDigits)) ||
            (targetSuffix.length >= 6 && itemText.includes(targetSuffix))
          ) {
            const clickTarget = (
              el.closest('[role="listitem"]') ||
              el.closest('div[role="button"]') ||
              el.closest('div[tabindex]') ||
              el.closest('div[data-testid]') ||
              el
            ) as HTMLElement

            if (clickTarget && isElementVisible(clickTarget) && !isInstallerOrDownloadElement(clickTarget)) {
              clickTarget.click()
              resultClicked = true
              console.log(`[AMAN CHAT] Clicked matched search result element for ${cleanPhone}`)
              break
            }
          }
        }

        if (resultClicked) break
      }

      if (resultClicked) break
    }

    if (!resultClicked) {
      console.warn(`[AMAN CHAT] No matching search result clicked for number: ${cleanPhone}`)
      await addErrorLog(`[SEARCH WARN] Kontak / nomor ${cleanPhone} (asal: ${rawDigits}) tidak ditemukan di hasil pencarian.`)
    }
  }
}

// --- Message composer helpers -------------------------------------------------
// NOTE: findWaSearchInput() above already had to grow several fallback
// selectors (including data-lexical-editor="true") because WhatsApp Web
// keeps changing its DOM/attribute names. The message composer box was
// still only matched by 3 rigid selectors, so whenever WA renamed/restructured
// the compose box the same way it did the search box, openPhoneChat() could
// still find and click a contact, but sendRealMessage() would never find the
// composer or send button — every broadcast send would fail. These helpers
// give the composer the same resilience the search box already has.

function findComposerInput(): HTMLElement | null {
  const selectors = [
    'footer div[contenteditable="true"][data-lexical-editor="true"]',
    'div[data-testid="conversation-compose-box-input"]',
    '[data-testid="conversation-compose-box-input"]',
    'footer div[aria-placeholder][contenteditable="true"]',
    'div[aria-placeholder][contenteditable="true"]',
    'footer div[contenteditable="true"][role="textbox"]',
    'footer div[contenteditable="true"]',
    '#main footer div[contenteditable="true"]',
    '#main div[contenteditable="true"][data-tab]'
  ]

  for (const sel of selectors) {
    const elements = Array.from(document.querySelectorAll(sel)) as HTMLElement[]
    for (const el of elements) {
      if (isElementVisible(el) && !el.closest('#aman-chat-sidebar')) {
        return el
      }
    }
  }
  return null
}

function isButtonDisabled(btn: HTMLElement): boolean {
  if ((btn as HTMLButtonElement).disabled) return true
  if (btn.getAttribute('aria-disabled') === 'true') return true
  return false
}

function findSendButton(): HTMLElement | null {
  const footer = document.querySelector('#main footer') || document.querySelector('footer')
  if (!footer) return null

  const iconOrButtonSelectors = [
    '[data-testid="compose-btn-send"]',
    'button[aria-label="Kirim"]',
    'button[aria-label="Send"]',
    'span[data-icon="send"]',
    'span[data-icon="wds-ic-send-filled"]',
    'span[data-icon="wds-ic-send-outline"]',
    'span[data-icon="send-light"]',
    'span[data-icon="send-filled"]'
  ]

  for (const sel of iconOrButtonSelectors) {
    const el = footer.querySelector(sel) as HTMLElement | null
    if (!el) continue
    const btn = (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button')
      ? el
      : (el.closest('button, div[role="button"]') as HTMLElement | null)
    if (btn && isElementVisible(btn) && !btn.closest('#aman-chat-sidebar')) {
      return btn
    }
  }

  // Fallback: take the last enabled button in footer (almost always send button after typing)
  const buttons = Array.from(footer.querySelectorAll('button, div[role="button"]')) as HTMLElement[]
  const usable = buttons.filter(b => isElementVisible(b) && !isButtonDisabled(b) && !b.closest('#aman-chat-sidebar'))
  if (usable.length > 0) return usable[usable.length - 1]

  return null
}

async function pollForElement(finder: () => HTMLElement | null, timeoutMs: number, intervalMs = 50): Promise<HTMLElement | null> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const el = finder()
    if (el) return el
    await new Promise(r => setTimeout(r, intervalMs))
  }
  return finder()
}

async function pollForCondition(check: () => boolean, timeoutMs: number, intervalMs = 50): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (check()) return true
    await new Promise(r => setTimeout(r, intervalMs))
  }
  return check()
}

export interface ChatReadyResult {
  success: boolean
  reason?: 'invalid_number' | 'timeout'
}

export function waitForChatReadyOrError(timeoutMs: number = 5000): Promise<ChatReadyResult> {
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
          text.includes("isn't on whatsapp") ||
          text.includes('is not on whatsapp') ||
          text.includes("isn't on") ||
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

      const input = findComposerInput()

      if (input) {
        clearInterval(interval)
        resolve({ success: true })
        return
      }

      if (Date.now() - startTime >= timeoutMs) {
        clearInterval(interval)
        resolve({ success: false, reason: 'timeout' })
      }
    }, 100)
  })
}

export async function sendRealMessage(text: string, typingMode: 'instant' | 'character' = 'instant'): Promise<boolean> {
  // Fast poll for composer input in footer
  const input = await pollForElement(findComposerInput, 2500, 50)

  if (!input) {
    console.error('[AMAN CHAT] Composer input element not found!')
    await addErrorLog('[COMPOSER ERROR] Kotak penulisan pesan (footer composer) tidak ditemukan.')
    return false
  }

  input.focus()
  await new Promise(r => setTimeout(r, 50))

  // Fast clear leftover content
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(input)
  selection?.removeAllRanges()
  selection?.addRange(range)

  document.execCommand('selectAll', false)
  document.execCommand('delete', false)
  if (input.textContent) {
    input.textContent = ''
  }

  await new Promise(r => setTimeout(r, 50))

  if (typingMode === 'character') {
    for (const char of text) {
      document.execCommand('insertText', false, char)
      const delay = Math.floor(Math.random() * 20) + 10
      await new Promise(r => setTimeout(r, delay))
    }
  } else {
    // Single insertion via ClipboardEvent ('paste') for Lexical
    try {
      const dt = new DataTransfer()
      dt.setData('text/plain', text)
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true
      })
      input.dispatchEvent(pasteEvent)
    } catch (e) {
      console.warn('[AMAN CHAT] Composer paste event error:', e)
    }

    await new Promise(r => setTimeout(r, 60))

    // Fallback: if paste did not populate composer, use execCommand ONCE
    if (!input.textContent || input.textContent.trim() === '') {
      document.execCommand('insertText', false, text)
    }
  }

  input.dispatchEvent(new Event('change', { bubbles: true }))
  await new Promise(r => setTimeout(r, 100))

  const sendBtn = await pollForElement(findSendButton, 800, 40)

  if (sendBtn && !isButtonDisabled(sendBtn)) {
    sendBtn.click()
  } else {
    for (const type of ['keydown', 'keypress', 'keyup'] as const) {
      input.dispatchEvent(new KeyboardEvent(type, {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
      }))
    }
  }

  const cleared = await pollForCondition(() => !input.textContent || input.textContent.trim() === '', 1000, 50)
  if (!cleared) {
    console.warn('[AMAN CHAT] Send may have failed — composer still has text after send attempt.')
    await addErrorLog('[SEND WARN] Pesan kemungkinan belum terkirim — kotak input pesan masih terisi setelah ditekan Kirim.')
  }
  return cleared
}

// Global state for real broadcast runner
let isBroadcastRunning = false
let isBroadcastPaused = false

export function isBroadcastActuallyRunning(): boolean {
  return isBroadcastRunning
}

export interface RecipientItem {
  phone: string
  name?: string
  email?: string
}

export interface BroadcastProgress {
  index: number
  total: number
  log: string
  done?: boolean
  failedNumbers?: string[]
}

export interface BroadcastRunOptions {
  numbers: (string | RecipientItem)[]
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
  optionsOrNumbers: BroadcastRunOptions | (string | RecipientItem)[],
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
    maxRetries = 0, batchCooldownEvery = 0, batchCooldownSeconds = 30,
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

    const item = numbers[i]
    const targetPhone = typeof item === 'string' ? item : item.phone
    const recipientName = typeof item === 'string' ? '' : (item.name || '')
    const recipientEmail = typeof item === 'string' ? '' : (item.email || '')

    let currentMsg = useTwo && i % 2 === 1 && msg2 ? msg2 : msg1
    if (enableSpintax) {
      currentMsg = parseSpintax(currentMsg)
    }

    // Dynamic variable replacement: supports {nama}, [nama], \bnama\b, {name}, [name], \bname\b, {email}, [email], {nomor}, [nomor], {phone}
    currentMsg = currentMsg
      .replace(/\{nama\}|\[nama\]|\bnama\b|\{name\}|\[name\]|\bname\b/gi, recipientName || '')
      .replace(/\{email\}|\[email\]|\bemail\b/gi, recipientEmail || '')
      .replace(/\{nomor\}|\[nomor\]|\{phone\}|\[phone\]/gi, targetPhone || '')
      .replace(/  +/g, ' ')
      .replace(/ ,/g, ',')

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
          log: `[${formatTimestamp()}] ⏸ Jeda tambahan ${batchCooldownSeconds} detik setelah ${batchCooldownEvery} pesan (rate control batching)...`
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

let isProcessingUnreadQueue = false

export async function processUnreadChatsQueue(): Promise<void> {
  if (isBroadcastRunning || isProcessingUnreadQueue) return
  const enabled = await getAutoReplyEnabled()
  if (!enabled) return

  const unreadBadges = Array.from(document.querySelectorAll('#side [data-testid="icon-unread-count"], #side span[aria-label*="unread"], #side span[aria-label*="belum dibaca"], #side [class*="unread"]')) as HTMLElement[]
  if (unreadBadges.length === 0) return

  const targetBadge = unreadBadges[0]
  const chatRow = (targetBadge.closest('[data-testid="chat-list-item"]') || targetBadge.closest('div[role="listitem"]') || targetBadge.closest('div[tabindex]')) as HTMLElement | null

  if (chatRow && isElementVisible(chatRow)) {
    isProcessingUnreadQueue = true
    try {
      console.log('[AMAN CHAT] 📩 Auto Reply Queue: Membuka chat belum dibaca secara otomatis...')
      chatRow.click()
      await new Promise(r => setTimeout(r, 600))
      checkAndAutoReply()
    } finally {
      setTimeout(() => { isProcessingUnreadQueue = false }, 1500)
    }
  }
}

const debouncedCheck = debounce(() => {
  checkAndAutoReply()
  processUnreadChatsQueue()
}, 400)
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
    processUnreadChatsQueue()
  }, 3000)
}


