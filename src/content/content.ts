import { createApp, type App } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import '../content/styles.scss'

let sidebarContainer: HTMLElement | null = null
let sidebarApp: App<Element> | null = null
let isOpen = false

function injectScript(): void {
  const script = document.createElement('script')
  script.src = chrome.runtime.getURL('src/inject/index.ts')
  script.onload = () => script.remove()
  ;(document.head || document.documentElement).appendChild(script)
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
    isOpen = true
    return
  }

  isOpen = !isOpen
  const sidebar = sidebarContainer.querySelector('.ac-sidebar')
  if (sidebar) {
    sidebar.classList.toggle('is-open', isOpen)
  }
}

function createToggleButton(): void {
  if (document.getElementById('ac-toggle-btn')) return

  const btn = document.createElement('button')
  btn.id = 'ac-toggle-btn'
  btn.className = 'ac-toggle-btn'
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `
  btn.title = 'Buka AMAN CHAT'
  btn.addEventListener('click', toggleSidebar)
  document.body.appendChild(btn)
}

function setupPrivacyBlur(): void {
  chrome.storage.local.get(['wku_privacy'], (result: Record<string, Record<string, boolean>>) => {
    const privacy = result.wku_privacy
    if (!privacy) return

    const style = document.createElement('style')
    let css = ''

    if (privacy.blurChats) {
      css += '[data-testid="chat-list-item"] { filter: blur(8px); transition: filter 0.3s; }'
      css += '[data-testid="chat-list-item"]:hover { filter: blur(0); }'
    }

    if (privacy.blurAvatars) {
      css += '[data-testid="default-group"], [data-testid="default-user"], img[src*="pp"] { filter: blur(8px); }'
    }

    if (privacy.blurMessages) {
      css += '[class*="message-"] [dir="ltr"] { filter: blur(8px); transition: filter 0.3s; }'
      css += '[class*="message-"]:hover [dir="ltr"] { filter: blur(0); }'
    }

    if (privacy.blurMedia) {
      css += '[data-testid="image-thumb"], video { filter: blur(12px); }'
    }

    if (css) {
      style.textContent = css
      style.id = 'ac-privacy-styles'
      document.head.appendChild(style)
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
        sendResponse({ isOpen })
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
      console.log('[AMAN CHAT] Content script initialized')
    }
  }, 500)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
