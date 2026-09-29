import { getCRMStages, getCRMContacts, setCRMContacts } from '../utils/storage'
import { formatPhoneNumber, formatDate } from '../utils/helpers'
import { openSidebar as openSidebarState } from '../utils/sidebarState'
import type { CRMContact, CRMStage } from '../types'

let menuContainer: HTMLElement | null = null
let toastContainer: HTMLElement | null = null

function showCrmToast(message: string): void {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.id = 'ac-crm-toast-container'
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 1000000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    `
    document.body.appendChild(toastContainer)
  }

  const toast = document.createElement('div')
  toast.style.cssText = `
    background: #0f172a;
    color: #ffffff;
    font-size: 0.78rem;
    font-weight: 500;
    padding: 8px 14px;
    border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 8px;
    border-left: 4px solid #2563eb;
    pointer-events: auto;
    font-family: system-ui, -apple-system, sans-serif;
    animation: acFadeIn 0.2s ease;
  `
  toast.textContent = message
  toastContainer.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transition = 'opacity 0.3s ease'
    setTimeout(() => toast.remove(), 300)
  }, 3500)
}

function removeContextMenu(): void {
  if (menuContainer) {
    menuContainer.remove()
    menuContainer = null
  }
}

function extractContactFromElement(el: HTMLElement): { name: string; phone: string } | null {
  const isMainHeader = Boolean(el.closest('#main header') || el.matches('#main header'))

  if (isMainHeader) {
    const titleEl = el.querySelector('[title]') || el.querySelector('span[dir="auto"]')
    const rawName = titleEl?.getAttribute('title') || titleEl?.textContent?.trim() || ''
    if (!rawName) return null

    const digits = rawName.replace(/[^0-9]/g, '')
    let phone = ''
    if (digits.length >= 8) {
      phone = formatPhoneNumber(digits)
    }
    return { name: rawName, phone }
  }

  // Row in chat list
  const isGroup = Boolean(
    el.querySelector('[data-icon="default-group"]') ||
    el.querySelector('[data-testid="default-group"]') ||
    el.querySelector('span[data-testid="avatar-group"]') ||
    el.querySelector('[data-icon="community"]') ||
    el.querySelector('[data-icon="channel-filled"]') ||
    el.querySelector('[data-icon="newsletter"]')
  )
  if (isGroup) return null

  const titleEl = el.querySelector('span[title]') ||
                  el.querySelector('div[data-testid="cell-frame-title"] span') ||
                  el.querySelector('div[role="gridcell"] span[title]') ||
                  el.querySelector('span[dir="auto"]')
  const rawTitle = titleEl?.getAttribute('title') || titleEl?.textContent?.trim() || ''
  if (!rawTitle) return null

  const titleDigits = rawTitle.replace(/[^0-9]/g, '')
  let phone = ''
  if (titleDigits.length >= 8 && (rawTitle.startsWith('+') || rawTitle.startsWith('08') || rawTitle.startsWith('62') || /^[0-9\s\-()]+$/.test(rawTitle))) {
    phone = formatPhoneNumber(rawTitle)
  }

  const img = el.querySelector('img')
  const src = img?.getAttribute('src') || ''
  if (!phone && src) {
    const m = src.match(/([0-9]{8,16})(@c\.us|%40c\.us)/) || src.match(/[?&]u=([0-9]{8,16})/i)
    if (m && m[1]) {
      phone = formatPhoneNumber(m[1])
    }
  }

  if (!phone) {
    const dataId = el.getAttribute('data-id') || el.querySelector('[data-id]')?.getAttribute('data-id') || ''
    const m = dataId.match(/([0-9]{8,16})@c\.us/)
    if (m && m[1]) {
      phone = formatPhoneNumber(m[1])
    }
  }

  return { name: rawTitle, phone }
}

async function renderCrmContextMenu(x: number, y: number, contact: { name: string; phone: string }): Promise<void> {
  removeContextMenu()

  const stages: CRMStage[] = await getCRMStages()
  const contacts: CRMContact[] = await getCRMContacts()

  // Match contact by phone (if available) or by name
  let existingContact = contacts.find(c => {
    if (contact.phone && c.phone === contact.phone) return true
    if (contact.name && c.name.toLowerCase() === contact.name.toLowerCase()) return true
    return false
  })

  // If phone wasn't detected from DOM but was in CRM:
  if (!contact.phone && existingContact) {
    contact.phone = existingContact.phone
  }

  menuContainer = document.createElement('div')
  menuContainer.id = 'ac-crm-context-menu'
  menuContainer.className = 'ac-crm-context-menu'
  menuContainer.style.cssText = `
    position: fixed;
    top: ${y}px;
    left: ${x}px;
    z-index: 999999;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
    width: 220px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 0.75rem;
    color: #0f172a;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    box-sizing: border-box;
  `

  // Contact info header
  const header = document.createElement('div')
  header.style.cssText = `
    padding: 6px 8px 6px;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 4px;
  `
  const nameEl = document.createElement('div')
  nameEl.style.cssText = 'font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.78rem;'
  nameEl.textContent = contact.name || 'Kontak WhatsApp'

  const phoneEl = document.createElement('div')
  phoneEl.style.cssText = 'font-size: 0.68rem; color: #64748b; font-family: monospace; margin-top: 1px;'
  phoneEl.textContent = contact.phone || 'Nomor HP dari chat'

  header.appendChild(nameEl)
  header.appendChild(phoneEl)
  menuContainer.appendChild(header)

  // Label section
  const labelEl = document.createElement('div')
  labelEl.style.cssText = 'font-size: 0.66rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; padding: 2px 8px; letter-spacing: 0.03em;'
  labelEl.textContent = 'Pindahkan ke Stage CRM:'
  menuContainer.appendChild(labelEl)

  // Stage items
  for (const st of stages) {
    const item = document.createElement('div')
    item.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.12s ease;
    `
    item.addEventListener('mouseenter', () => { item.style.background = '#f1f5f9' })
    item.addEventListener('mouseleave', () => { item.style.background = 'transparent' })

    const left = document.createElement('div')
    left.style.cssText = 'display: flex; align-items: center; gap: 8px;'

    const dot = document.createElement('span')
    dot.style.cssText = `
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: ${st.color || '#2563eb'};
      display: inline-block;
      flex-shrink: 0;
    `

    const stageName = document.createElement('span')
    stageName.style.cssText = 'font-weight: 600; color: #1e293b; font-size: 0.74rem;'
    stageName.textContent = st.name

    left.appendChild(dot)
    left.appendChild(stageName)
    item.appendChild(left)

    if (existingContact && existingContact.stage === st.id) {
      const activeMark = document.createElement('span')
      activeMark.style.cssText = 'font-size: 0.65rem; color: #15803d; font-weight: 700; background: #dcfce7; padding: 1px 5px; border-radius: 9999px;'
      activeMark.textContent = '✓ Aktif'
      item.appendChild(activeMark)
    }

    item.addEventListener('click', async (e) => {
      e.stopPropagation()
      removeContextMenu()

      const currentContacts = await getCRMContacts()
      const cleanPhone = contact.phone || formatPhoneNumber(contact.name) || Date.now().toString()

      let target = currentContacts.find(c => {
        if (contact.phone && c.phone === contact.phone) return true
        if (contact.name && c.name.toLowerCase() === contact.name.toLowerCase()) return true
        return false
      })

      if (target) {
        target.stage = st.id
        if (!target.name && contact.name) target.name = contact.name
        if (!target.phone && contact.phone) target.phone = contact.phone
        target.lastUpdated = formatDate(Date.now())
      } else {
        target = {
          id: Date.now().toString(),
          name: contact.name || cleanPhone,
          phone: cleanPhone,
          stage: st.id,
          source: 'Klik Kanan Chat',
          tags: [],
          notes: '',
          lastUpdated: formatDate(Date.now())
        }
        currentContacts.unshift(target)
      }

      await setCRMContacts(currentContacts)
      showCrmToast(`✓ "${target.name}" dimasukkan ke stage ${st.name}!`)
    })

    menuContainer.appendChild(item)
  }

  // Divider
  const divider = document.createElement('div')
  divider.style.cssText = 'height: 1px; background: #f1f5f9; margin: 4px 0;'
  menuContainer.appendChild(divider)

  // Manage CRM action
  const manageItem = document.createElement('div')
  manageItem.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    color: #2563eb;
    font-weight: 600;
    font-size: 0.72rem;
  `
  manageItem.addEventListener('mouseenter', () => { manageItem.style.background = '#eff6ff' })
  manageItem.addEventListener('mouseleave', () => { manageItem.style.background = 'transparent' })
  manageItem.innerHTML = '⚙️ Buka CRM & Kelola Stage'
  manageItem.addEventListener('click', (e) => {
    e.stopPropagation()
    removeContextMenu()
    openSidebarState()
    window.postMessage({ type: 'AMAN_CHAT_NAVIGATE', tab: 'crm' }, '*')
  })
  menuContainer.appendChild(manageItem)

  document.body.appendChild(menuContainer)

  // Adjust position if overflow
  const rect = menuContainer.getBoundingClientRect()
  if (rect.right > window.innerWidth) {
    menuContainer.style.left = `${window.innerWidth - rect.width - 12}px`
  }
  if (rect.bottom > window.innerHeight) {
    menuContainer.style.top = `${window.innerHeight - rect.height - 12}px`
  }
}

export function initCrmContextMenu(): void {
  document.addEventListener('contextmenu', (e: MouseEvent) => {
    const target = e.target as HTMLElement | null
    if (!target) return

    // Ignore if inside sidebar or existing modal
    if (target.closest('#aman-chat-sidebar') || target.closest('.ac-modal-overlay') || target.closest('#ac-crm-context-menu')) {
      return
    }

    const chatRow = target.closest(
      '#pane-side [role="listitem"], ' +
      '#pane-side [data-testid="chat-list-item"], ' +
      '#pane-side div[data-testid="cell-frame-container"], ' +
      '#pane-side div[role="row"], ' +
      '#side [role="listitem"], ' +
      '#main header'
    ) as HTMLElement | null

    if (!chatRow) {
      removeContextMenu()
      return
    }

    const contact = extractContactFromElement(chatRow)
    if (!contact || !contact.name) {
      removeContextMenu()
      return
    }

    e.preventDefault()
    e.stopPropagation()
    renderCrmContextMenu(e.clientX, e.clientY, contact)
  }, true)

  document.addEventListener('click', (e: MouseEvent) => {
    if (!menuContainer) return
    const target = e.target as HTMLElement | null
    if (target && !target.closest('#ac-crm-context-menu')) {
      removeContextMenu()
    }
  })

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      removeContextMenu()
    }
  })

  window.addEventListener('scroll', () => {
    removeContextMenu()
  }, true)
}
