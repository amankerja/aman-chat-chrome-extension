import { createApp, type App } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import { initAutoReplyObserver } from '../utils/waAutomation'
import { sidebarState, toggleSidebarState, openSidebar as openSidebarState } from '../utils/sidebarState'
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

function setupPrivacyBlur(): void {
  chrome.storage.local.get(['wku_privacy'], (result: Record<string, Record<string, boolean>>) => {
    applyPrivacyStyles(result.wku_privacy)
  })

  chrome.storage.onChanged.addListener((changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName === 'local' && changes.wku_privacy) {
      applyPrivacyStyles(changes.wku_privacy.newValue as Record<string, boolean>)
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
