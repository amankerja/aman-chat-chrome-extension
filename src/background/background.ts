import { initializeStorage, DEFAULT_TEMPLATES } from '../utils/storage'

chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  console.log('[AMAN CHAT] Extension installed:', details.reason, 'v3.0.0')

  if (details.reason === 'install') {
    chrome.storage.local.set({
      wku_privacy: {
        blurChats: false,
        blurPreviews: false,
        blurAvatars: false,
        blurMessages: false,
        blurMedia: false
      },
      wku_templates: DEFAULT_TEMPLATES,
      wku_analytics: {
        totalSent: 0,
        totalSuccess: 0,
        totalFailed: 0,
        autoRepliesTriggered: 0,
        campaignsCount: 0
      },
      wku_onboarding_done: false
    })

    initializeStorage()
  }

  chrome.contextMenus.create({
    id: 'wku-send-whatsapp',
    title: '📱 Kirim WhatsApp ke nomor ini',
    contexts: ['selection']
  })

  chrome.alarms.create('wku-schedule-check', { periodInMinutes: 0.5 })
})

chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData) => {
  if (info.menuItemId === 'wku-send-whatsapp') {
    const phone = (info.selectionText || '').replace(/[^0-9+]/g, '')
    if (phone && phone.length >= 8) {
      const cleanPhone = phone.replace(/^\+/, '')
      chrome.tabs.create({ url: `https://web.whatsapp.com/send?phone=${cleanPhone}` })
    }
  }
})

chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
  if (tab.url?.includes('web.whatsapp.com')) {
    try {
      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' })
      }
    } catch {
      if (tab.id) {
        chrome.tabs.reload(tab.id)
      }
    }
  } else {
    chrome.tabs.create({ url: 'https://web.whatsapp.com/' })
  }
})

chrome.runtime.onMessage.addListener((
  message: { action: string; data?: Record<string, unknown>; phone?: string; title?: string; message?: string; key?: string; value?: unknown },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => {
  switch (message.action) {
    case 'ping':
      sendResponse({ status: 'pong', version: '3.0.0' })
      break

    case 'getAnalytics':
      chrome.storage.local.get(['wku_analytics'], (result: Record<string, unknown>) => {
        sendResponse(result.wku_analytics || {
          totalSent: 0,
          totalSuccess: 0,
          totalFailed: 0,
          autoRepliesTriggered: 0,
          campaignsCount: 0
        })
      })
      return true

    case 'updateAnalytics':
      chrome.storage.local.set({ wku_analytics: message.data }, () => {
        sendResponse({ success: true })
      })
      return true

    case 'openChat':
      if (message.phone) {
        const phone = message.phone.replace(/[^0-9]/g, '')
        chrome.tabs.create({ url: `https://web.whatsapp.com/send?phone=${phone}` })
      }
      break

    case 'showNotification':
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: message.title || 'AMAN CHAT',
        message: message.message || ''
      })
      break

    case 'getStorage':
      if (message.key) {
        const key = message.key
        chrome.storage.local.get([key], (result: Record<string, unknown>) => {
          sendResponse(result[key])
        })
      } else {
        sendResponse(undefined)
      }
      return true

    case 'setStorage':
      if (message.key) {
        chrome.storage.local.set({ [message.key]: message.value }, () => {
          sendResponse({ success: true })
        })
      }
      return true
  }

  return false
})

chrome.alarms.onAlarm.addListener((alarm: chrome.alarms.Alarm) => {
  if (alarm.name === 'wku-schedule-check') {
    checkScheduledMessages()
  }
})

function checkScheduledMessages(): void {
  chrome.storage.local.get(['wku_scheduled_messages'], (result: Record<string, unknown>) => {
    const messages = (result.wku_scheduled_messages || []) as Array<{ scheduledTime: number }>
    const now = Date.now()

    const dueMessages = messages.filter((m) => m.scheduledTime <= now)

    if (dueMessages.length > 0) {
      chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs: chrome.tabs.Tab[]) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'sendScheduledMessages',
            messages: dueMessages
          })
        }
      })

      const remaining = messages.filter((m) => m.scheduledTime > now)
      chrome.storage.local.set({ wku_scheduled_messages: remaining })
    }
  })
}
