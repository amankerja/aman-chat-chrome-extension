import { getAutoReplyEnabled, getAutoReplyMode, getAutoReplyRules, setAnalytics, getAnalytics } from './storage'
import { formatTimestamp } from './helpers'

export async function openPhoneChat(phone: string): Promise<void> {
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  const currentUrl = window.location.href

  // Create an anchor link to trigger WhatsApp Web internal SPA router
  const link = document.createElement('a')
  link.href = `https://web.whatsapp.com/send?phone=${cleanPhone}`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()

  // Fallback if URL doesn't update within 500ms
  setTimeout(() => {
    if (!window.location.href.includes(cleanPhone)) {
      window.location.href = `https://web.whatsapp.com/send?phone=${cleanPhone}`
    }
  }, 500)
}

export interface ChatReadyResult {
  success: boolean
  reason?: 'invalid_number' | 'timeout'
}

export function waitForChatReadyOrError(timeoutMs: number = 10000): Promise<ChatReadyResult> {
  return new Promise((resolve) => {
    const startTime = Date.now()

    const interval = setInterval(() => {
      // 1. Check for Invalid Number Popup Modal
      const dialog = document.querySelector('div[role="dialog"]') || document.querySelector('[data-testid="popup-contents"]')
      if (dialog) {
        const text = dialog.textContent || ''
        if (
          text.includes('tidak valid') ||
          text.includes('invalid') ||
          text.includes('tidak terdaftar') ||
          text.includes('not on WhatsApp')
        ) {
          clearInterval(interval)

          // Click OK/Dismiss button on modal
          const okBtn = dialog.querySelector('button') || dialog.querySelector('div[role="button"]')
          if (okBtn) (okBtn as HTMLElement).click()

          resolve({ success: false, reason: 'invalid_number' })
          return
        }
      }

      // 2. Check for Composer Input Box
      const input = document.querySelector('footer div[contenteditable="true"]') ||
                    document.querySelector('[data-testid="conversation-compose-box-input"]') ||
                    document.querySelector('div[contenteditable="true"][data-tab="10"]')

      if (input && (input as HTMLElement).offsetParent !== null) {
        clearInterval(interval)
        resolve({ success: true })
        return
      }

      // 3. Timeout check
      if (Date.now() - startTime >= timeoutMs) {
        clearInterval(interval)
        resolve({ success: false, reason: 'timeout' })
      }
    }, 400)
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

// Auto Reply Observer
export function initAutoReplyObserver(): void {
  const observer = new MutationObserver(async (mutations) => {
    const enabled = await getAutoReplyEnabled()
    if (!enabled) return

    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (!(node instanceof HTMLElement)) continue

        const isIncomingMsg = node.matches('[class*="message-in"]') || node.querySelector('[class*="message-in"]')
        if (isIncomingMsg) {
          const textEl = node.querySelector('.selectable-text') || node.querySelector('[dir="ltr"]')
          if (!textEl || !textEl.textContent) continue

          const incomingText = textEl.textContent.trim().toLowerCase()
          const mode = await getAutoReplyMode()
          const rules = await getAutoReplyRules()

          let replyText = ''

          if (mode === 'all') {
            replyText = rules[0]?.reply || 'Halo! Pesan Anda telah kami terima.'
          } else {
            for (const r of rules) {
              if (!r.active) continue
              const keywords = r.keywords.split(',').map(k => k.trim().toLowerCase())
              if (keywords.some(k => k && incomingText.includes(k))) {
                replyText = r.reply
                break
              }
            }
          }

          if (replyText) {
            console.log('[AMAN CHAT] Auto replying to:', incomingText, '->', replyText)
            await new Promise(res => setTimeout(res, 1000))
            await sendRealMessage(replyText, 'instant')

            const analytics = await getAnalytics()
            analytics.autoRepliesTriggered += 1
            await setAnalytics(analytics)
          }
        }
      }
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
}
