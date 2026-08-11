import { createApp, type App } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import { initAutoReplyObserver } from '../utils/waAutomation'
import { sidebarState, toggleSidebarState, openSidebar as openSidebarState, closeSidebar } from '../utils/sidebarState'
import { debounce } from '../utils/helpers'
import '../content/styles.scss'

let sidebarContainer: HTMLElement | null = null
let sidebarApp: App<Element> | null = null

function injectScript(): void {
  // Content scripts can't call chrome.scripting themselves, so we ask the
  // background service worker to inject the MAIN-world script for us.
  // (See src/inject/index.ts for why this replaced the old <script src>
  // approach.)
  chrome.runtime.sendMessage({ action: 'injectMainWorld' }, (response) => {
    if (chrome.runtime.lastError || !response?.success) {
      console.error('[AMAN CHAT] Main-world injection failed:', chrome.runtime.lastError)
    }
  })
}

function createSidebar(): void {
  if (sidebarContainer) return

  sidebarContainer = document.createElement('div')
  sidebarContainer.id = 'aman-chat-sidebar'
  sidebarContainer.className = 'aman-chat-container'
  document.body.appendChild(sidebarContainer)

  sidebarApp = createApp(Sidebar)
  sidebarApp.mount(sidebarContainer)
}

function toggleSidebar(): void {
  if (!sidebarContainer) {
    createSidebar()
    openSidebarState()
    return
  }

  toggleSidebarState()
}

import { watch } from 'vue'

const CHAT_ICON_SVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
`

const CLOSE_ICON_SVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
`

function updateToggleButtonUI(isOpen: boolean): void {
  const btn = document.getElementById('ac-toggle-btn')
  if (!btn) return

  if (isOpen) {
    btn.classList.add('is-open')
    btn.innerHTML = CLOSE_ICON_SVG
    btn.title = 'Tutup AMAN CHAT (Alt+A)'
  } else {
    btn.classList.remove('is-open')
    btn.innerHTML = CHAT_ICON_SVG
    btn.title = 'Buka AMAN CHAT (Alt+A)'
  }
}

function createToggleButton(): void {
  if (document.getElementById('ac-toggle-btn')) return

  const btn = document.createElement('button')
  btn.id = 'ac-toggle-btn'
  btn.className = 'ac-toggle-btn'
  btn.addEventListener('click', toggleSidebar)
  document.body.appendChild(btn)

  updateToggleButtonUI(sidebarState.isOpen)

  watch(() => sidebarState.isOpen, (isOpen) => {
    updateToggleButtonUI(isOpen)
  })
}

function applyPrivacyStyles(privacy: Record<string, boolean> | undefined): void {
  let styleEl = document.getElementById('ac-privacy-styles') as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'ac-privacy-styles'
    document.head.appendChild(styleEl)
  }

  if (!privacy) {
    styleEl.textContent = ''
    return
  }

  let css = ''

  if (privacy.blurChats) {
    css += `
      #pane-side [role="listitem"],
      [data-testid="chat-list-item"] {
        filter: blur(6px) !important;
        transition: filter 0.2s ease !important;
      }
      #pane-side [role="listitem"]:hover,
      [data-testid="chat-list-item"]:hover {
        filter: blur(0) !important;
      }
    `
  }

  if (privacy.blurPreviews) {
    css += `
      #pane-side [role="listitem"] span[title],
      #pane-side [data-testid="chat-list-item"] span,
      #pane-side [data-testid="last-msg-status"] {
        filter: blur(8px) !important;
        transition: filter 0.2s ease !important;
      }
      #pane-side [role="listitem"]:hover span[title],
      #pane-side [data-testid="chat-list-item"]:hover span {
        filter: blur(0) !important;
      }
    `
  }

  if (privacy.blurAvatars) {
    css += `
      #pane-side img,
      header img,
      [data-testid="default-user"],
      [data-testid="default-group"],
      img[src*="pp"],
      img[src*="user"],
      img[src*="dyn"] {
        filter: blur(8px) !important;
        transition: filter 0.2s ease !important;
      }
      #pane-side img:hover,
      header img:hover {
        filter: blur(0) !important;
      }
    `
  }

  if (privacy.blurMessages) {
    css += `
      div[class*="message-in"] .copyable-text,
      div[class*="message-out"] .copyable-text,
      [data-id] .selectable-text,
      .message-in span.selectable-text,
      .message-out span.selectable-text {
        filter: blur(8px) !important;
        transition: filter 0.2s ease !important;
      }
      div[class*="message-in"]:hover .copyable-text,
      div[class*="message-out"]:hover .copyable-text,
      [data-id]:hover .selectable-text {
        filter: blur(0) !important;
      }
    `
  }

  if (privacy.blurMedia) {
    css += `
      [data-testid="image-thumb"],
      img[src*="blob:"],
      video,
      canvas,
      [data-testid="media-canvas"] {
        filter: blur(12px) !important;
        transition: filter 0.2s ease !important;
      }
      [data-testid="image-thumb"]:hover,
      video:hover {
        filter: blur(0) !important;
      }
    `
  }

  styleEl.textContent = css
}

let inactivityTimer: ReturnType<typeof setTimeout> | null = null
let isLocked = false
let currentPin = ''
let inactivityTimeoutMs = 5 * 60 * 1000

function createLockScreen() {
  if (document.getElementById('ac-lock-screen')) return

  const lockScreen = document.createElement('div')
  lockScreen.id = 'ac-lock-screen'
  lockScreen.innerHTML = `
    <div class="ac-lock-content">
      <div class="ac-lock-icon">🔒</div>
      <h2 class="ac-lock-title">Aman Chat - Layar Terkunci</h2>
      <p class="ac-lock-desc">Masukkan 4 digit PIN untuk membuka WhatsApp Web Anda.</p>
      <input type="password" id="ac-pin-input" maxlength="4" placeholder="••••" />
      <div class="ac-lock-error" id="ac-pin-error" style="display: none;">PIN salah, coba lagi!</div>
      <button id="ac-unlock-btn" class="ac-btn primary">Buka Kunci</button>
      <button id="ac-forgot-pin-btn" class="ac-btn danger sm" style="margin-top: 15px;">Lupa PIN / Reset</button>
    </div>
  `
  document.body.appendChild(lockScreen)

  const pinInput = document.getElementById('ac-pin-input') as HTMLInputElement
  const unlockBtn = document.getElementById('ac-unlock-btn')
  const forgotBtn = document.getElementById('ac-forgot-pin-btn')
  const errorMsg = document.getElementById('ac-pin-error')

  pinInput?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement
    target.value = target.value.replace(/[^0-9]/g, '').slice(0, 4)
    if (errorMsg) errorMsg.style.display = 'none'
  })

  pinInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') unlockBtn?.click()
  })

  unlockBtn?.addEventListener('click', () => {
    if (pinInput?.value === currentPin) {
      unlockScreen()
    } else {
      if (errorMsg) errorMsg.style.display = 'block'
      pinInput.value = ''
      pinInput.focus()
    }
  })

  forgotBtn?.addEventListener('click', () => {
    const license = prompt('Masukkan Kode Lisensi Premium Anda untuk reset PIN.\\nJika Anda pengguna gratis (atau lupa lisensi), ketik "HARD RESET" untuk mereset ekstensi (SEMUA DATA AKAN HILANG!).')

    if (license === 'HARD RESET') {
      if (confirm('PERINGATAN: Semua data Aman Chat (Auto-reply, Templates, Setting Privasi) akan dihapus. Lanjutkan?')) {
        chrome.storage.local.clear(() => {
          alert('Data berhasil di-reset.')
          window.location.reload()
        })
      }
    } else if (license) {
      chrome.storage.local.get(['wku_license_key'], (res) => {
        if (res.wku_license_key === license.trim().toUpperCase()) {
          chrome.storage.local.get(['wku_privacy'], (privRes) => {
            const priv = (privRes.wku_privacy as Record<string, any>) || {}
            priv.pinLockEnabled = false
            priv.pinCode = ''
            chrome.storage.local.set({ wku_privacy: priv }, () => {
              alert('PIN berhasil direset. Silakan buat PIN baru di menu Pengaturan.')
              unlockScreen()
            })
          })
        } else {
          alert('Kode Lisensi tidak cocok atau tidak valid.')
        }
      })
    }
  })
}

function lockScreen() {
  if (isLocked) return
  isLocked = true
  closeSidebar()

  createLockScreen()
  const ls = document.getElementById('ac-lock-screen')
  if (ls) {
    ls.style.display = 'flex'
    setTimeout(() => {
      const pinInput = document.getElementById('ac-pin-input') as HTMLInputElement
      if (pinInput) {
        pinInput.value = ''
        pinInput.focus()
      }
    }, 100)
  }
}

function unlockScreen() {
  isLocked = false
  const ls = document.getElementById('ac-lock-screen')
  if (ls) ls.style.display = 'none'
  resetInactivityTimer()
}

// We use a custom reset function without debounce for the initial trigger,
// but we throttle the actual reset logic to avoid performance issues
// while ensuring perfectly continuous activity still resets the timer.
let lastActivityTime = Date.now()

const checkInactivity = setInterval(() => {
  if (isLocked || inactivityTimeoutMs <= 0 || !currentPin) return

  if (Date.now() - lastActivityTime > inactivityTimeoutMs) {
    lockScreen()
  }
}, 1000)

function resetInactivityTimer() {
  if (isLocked) return
  lastActivityTime = Date.now()
}

function setupInactivityLock(privacy: Record<string, any> | undefined) {
  if (!privacy) return

  currentPin = privacy.pinLockEnabled ? privacy.pinCode : ''
  inactivityTimeoutMs = (privacy.inactivityTimeout || 5) * 60 * 1000

  // Start initial timer
  resetInactivityTimer()
}

function initActivityListeners() {
  const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart']
  events.forEach(event => {
    document.addEventListener(event, resetInactivityTimer, { passive: true })
  })
}

function setupPrivacyBlur(): void {
  chrome.storage.local.get(['wku_privacy'], (result: Record<string, any>) => {
    applyPrivacyStyles(result.wku_privacy as Record<string, boolean>)
    setupInactivityLock(result.wku_privacy as Record<string, any> | undefined)
  })

  chrome.storage.onChanged.addListener((changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName === 'local' && changes.wku_privacy) {
      applyPrivacyStyles(changes.wku_privacy.newValue as Record<string, boolean>)
      setupInactivityLock(changes.wku_privacy.newValue as Record<string, any> | undefined)
    }
  })
}

function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((
    message: { action: string; messages?: unknown[] },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    switch (message.action) {
      case 'toggleSidebar':
        toggleSidebar()
        sendResponse({ success: true })
        break

      case 'getOpenStatus':
        sendResponse({ isOpen: sidebarState.isOpen })
        break

      case 'sendScheduledMessages':
        if (message.messages) {
          handleScheduledMessages(message.messages)
        }
        sendResponse({ success: true })
        break
    }
    return false
  })
}

function handleScheduledMessages(messages: unknown[]): void {
  console.log('[AMAN CHAT] Processing scheduled messages:', messages.length)
}

function init(): void {
  if (!window.location.href.includes('web.whatsapp.com')) return

  injectScript()

  const checkReady = setInterval(() => {
    if (document.querySelector('#app') || document.querySelector('[data-testid="chat-list"]')) {
      clearInterval(checkReady)
      createToggleButton()
      setupPrivacyBlur()
      setupMessageListener()
      initActivityListeners()
      initAutoReplyObserver()
      console.log('[AMAN CHAT] Content script initialized')
    }
  }, 500)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
