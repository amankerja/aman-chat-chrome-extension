import type { GrabbedContact } from '../types'
import { formatPhoneNumber, isValidPhoneNumber, formatDate, downloadCSV, delay } from './helpers'
import { getIsPremium, getGroupGrabberUsage, incrementGroupGrabberUsage, setGrabbedContacts, getGrabbedContacts } from './storage'

export interface ActiveGroupInfo {
  isGroup: boolean
  groupName: string
  memberPreview?: string
  estimatedCount?: number
}

export interface DetectedGroupItem {
  id: string
  name: string
}

export function detectActiveGroup(): ActiveGroupInfo {
  const main = document.querySelector('#main')
  if (!main) {
    return { isGroup: false, groupName: '' }
  }

  const header = main.querySelector('header')
  if (!header) {
    return { isGroup: false, groupName: '' }
  }

  const titleEl = header.querySelector('span[title]') || header.querySelector('span[dir="auto"]')
  const groupName = titleEl?.getAttribute('title') || titleEl?.textContent?.trim() || ''

  const hasGroupIcon = Boolean(
    header.querySelector('[data-icon="default-group"]') ||
    header.querySelector('[data-testid="default-group"]') ||
    header.querySelector('[data-testid="avatar"]')
  )

  const spans = Array.from(header.querySelectorAll('span[title]'))
  let memberPreview = ''
  for (const span of spans) {
    const titleVal = span.getAttribute('title') || ''
    if (titleVal && titleVal !== groupName && (titleVal.includes(',') || /peserta|participant|anggota/i.test(titleVal))) {
      memberPreview = titleVal
      break
    }
  }

  if (!memberPreview) {
    const textNodes = Array.from(header.querySelectorAll('span[dir="auto"], div[role="button"] span'))
    for (const node of textNodes) {
      const text = node.textContent?.trim() || ''
      if (text && text !== groupName && (text.includes(',') || /peserta|participant|anggota/i.test(text))) {
        memberPreview = text
        break
      }
    }
  }

  const isGroup = hasGroupIcon || Boolean(memberPreview && (memberPreview.includes(',') || /peserta|participant/i.test(memberPreview)))

  return {
    isGroup,
    groupName: groupName || (isGroup ? 'Grup WhatsApp' : ''),
    memberPreview
  }
}

export function parseContactsFromText(text: string, groupName: string): GrabbedContact[] {
  if (!text) return []

  const parts = text.split(/[,;•\n]/).map(p => p.trim()).filter(Boolean)
  const results: GrabbedContact[] = []
  const seenNumbers = new Set<string>()

  for (const part of parts) {
    if (/^(kamu|you)$/i.test(part)) continue

    const digitsOnly = part.replace(/[^0-9]/g, '')
    if (digitsOnly.length >= 8 && digitsOnly.length <= 16) {
      const cleanPhone = formatPhoneNumber(part)
      if (isValidPhoneNumber(cleanPhone) && !seenNumbers.has(cleanPhone)) {
        seenNumbers.add(cleanPhone)
        results.push({
          id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
          name: part.startsWith('+') || part.startsWith('0') || part.startsWith('62') ? 'Anggota Grup' : part,
          phone: cleanPhone,
          groupName,
          grabbedAt: formatDate(Date.now())
        })
      }
    }
  }

  return results
}

export async function grabContactsFromActiveGroup(onProgress?: (msg: string) => void): Promise<{
  contacts: GrabbedContact[]
  addedCount: number
  limitReached: boolean
  remainingQuota: number
  totalAllowed: number
}> {
  const isPro = await getIsPremium()
  const totalAllowed = isPro ? 1000 : 50
  const usage = await getGroupGrabberUsage()
  const currentUsage = usage.count
  let remainingQuota = Math.max(0, totalAllowed - currentUsage)

  if (remainingQuota <= 0) {
    return {
      contacts: [],
      addedCount: 0,
      limitReached: true,
      remainingQuota: 0,
      totalAllowed
    }
  }

  const activeGroup = detectActiveGroup()
  if (!activeGroup.isGroup) {
    throw new Error('Silakan buka salah satu grup di WhatsApp Web terlebih dahulu.')
  }

  onProgress?.('Menganalisis anggota grup dari WhatsApp Web...')

  const extractedMap = new Map<string, GrabbedContact>()

  if (activeGroup.memberPreview) {
    const fromSubtitle = parseContactsFromText(activeGroup.memberPreview, activeGroup.groupName)
    for (const c of fromSubtitle) {
      extractedMap.set(c.phone, c)
    }
  }

  onProgress?.('Membuka detail info grup...')
  const mainHeader = document.querySelector('#main header') as HTMLElement | null
  const headerClickTarget = (mainHeader?.querySelector('div[role="button"]') || mainHeader) as HTMLElement | null
  headerClickTarget?.click()
  await delay(800)

  const drawer = document.querySelector('[data-testid="chat-info-drawer"], [data-testid="drawer-right"], div#app div[tabindex="-1"], aside')
  if (drawer) {
    const seeMoreButtons = Array.from(drawer.querySelectorAll('div[role="button"], button'))
    const seeMore = seeMoreButtons.find(b => /lihat semua|view all|peserta lainnya|more/i.test(b.textContent || '')) as HTMLElement | null
    if (seeMore) {
      seeMore.click()
      await delay(600)
    }

    const scrollContainers = Array.from(document.querySelectorAll('div[tabindex="-1"], [data-testid="chat-info-drawer"], section, div[role="region"]'))
    const scrollable = scrollContainers.find(el => el.scrollHeight > el.clientHeight) as HTMLElement | null

    const maxScrollSteps = 6
    for (let step = 0; step < maxScrollSteps; step++) {
      onProgress?.(`Memindai daftar kontak (${extractedMap.size} nomor ditemukan)...`)

      const rows = Array.from(document.querySelectorAll('[data-testid="cell-frame-container"], [role="listitem"], div[data-testid^="contact-"]'))
      for (const row of rows) {
        const titleSpans = Array.from(row.querySelectorAll('span[title], span[dir="auto"]'))
        let name = ''
        let rawPhone = ''

        for (const sp of titleSpans) {
          const val = sp.getAttribute('title') || sp.textContent?.trim() || ''
          const match = val.match(/(?:\+62|62|08)[0-9\s\-]{7,18}/)
          if (match) {
            rawPhone = match[0]
          } else if (!name && val && !/admin|peserta|owner|kamu|you/i.test(val)) {
            name = val
          }
        }

        if (rawPhone) {
          const cleanPhone = formatPhoneNumber(rawPhone)
          if (isValidPhoneNumber(cleanPhone) && !extractedMap.has(cleanPhone)) {
            extractedMap.set(cleanPhone, {
              id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
              name: name || 'Anggota Grup',
              phone: cleanPhone,
              groupName: activeGroup.groupName,
              grabbedAt: formatDate(Date.now())
            })
          }
        }
      }

      if (extractedMap.size >= remainingQuota) break
      if (scrollable) {
        scrollable.scrollTop += 320
        await delay(250)
      } else {
        break
      }
    }
  }

  const allFound = Array.from(extractedMap.values())
  if (allFound.length === 0) {
    throw new Error('Tidak ada kontak dengan nomor telepon yang terdeteksi dari grup ini.')
  }

  const existingContacts = await getGrabbedContacts()
  const existingPhones = new Set(existingContacts.map(c => c.phone))
  const newContacts = allFound.filter(c => !existingPhones.has(c.phone))

  const countToTake = Math.min(newContacts.length, remainingQuota)
  const contactsToAdd = newContacts.slice(0, countToTake)

  if (contactsToAdd.length > 0) {
    const updated = [...contactsToAdd, ...existingContacts]
    await setGrabbedContacts(updated)
    await incrementGroupGrabberUsage(contactsToAdd.length)
  }

  remainingQuota = Math.max(0, remainingQuota - contactsToAdd.length)

  return {
    contacts: contactsToAdd,
    addedCount: contactsToAdd.length,
    limitReached: remainingQuota <= 0,
    remainingQuota,
    totalAllowed
  }
}

export function detectAllGroupsInChatList(): DetectedGroupItem[] {
  const sidePane = document.querySelector('#pane-side') || document.querySelector('#side')
  if (!sidePane) return []

  const chatRows = Array.from(sidePane.querySelectorAll('[data-testid="chat-list-item"], div[role="listitem"]'))
  const groups: DetectedGroupItem[] = []
  const seenNames = new Set<string>()

  for (const row of chatRows) {
    const isGroup = Boolean(
      row.querySelector('[data-icon="default-group"]') ||
      row.querySelector('[data-testid="default-group"]') ||
      row.querySelector('span[data-testid="avatar-group"]')
    )

    if (isGroup) {
      const titleEl = row.querySelector('span[title]') || row.querySelector('span[dir="auto"]')
      const name = titleEl?.getAttribute('title') || titleEl?.textContent?.trim() || ''
      if (name && !seenNames.has(name)) {
        seenNames.add(name)
        groups.push({
          id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          name
        })
      }
    }
  }

  return groups
}

export async function openGroupByTitle(groupName: string): Promise<boolean> {
  const sidePane = document.querySelector('#pane-side') || document.querySelector('#side')
  if (!sidePane) return false

  const chatRows = Array.from(sidePane.querySelectorAll('[data-testid="chat-list-item"], div[role="listitem"]'))
  for (const row of chatRows) {
    const titleEl = row.querySelector('span[title]') || row.querySelector('span[dir="auto"]')
    const name = titleEl?.getAttribute('title') || titleEl?.textContent?.trim() || ''
    if (name.toLowerCase() === groupName.toLowerCase()) {
      (row as HTMLElement).click()
      await delay(800)
      return true
    }
  }
  return false
}

export function exportContactsToCSV(contacts: GrabbedContact[], customName?: string): void {
  if (contacts.length === 0) return

  const header = ['No', 'Nama', 'Nomor WhatsApp', 'Grup WhatsApp', 'Waktu Grab']
  const escapeCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`

  const rows = contacts.map((c, i) => [
    i + 1,
    escapeCsv(c.name),
    escapeCsv(c.phone),
    escapeCsv(c.groupName),
    escapeCsv(c.grabbedAt)
  ].join(','))

  const csvContent = [header.join(','), ...rows].join('\r\n')
  const dateStr = new Date().toISOString().slice(0, 10)
  const safeTitle = (customName || 'kontak_group').replace(/[^a-zA-Z0-9_-]/g, '_')
  downloadCSV(csvContent, `${safeTitle}_${dateStr}.csv`)
}
