import type { InboxContactItem } from '../types'
import { getCRMContacts, getGrabbedContacts } from './storage'
import { formatPhoneNumber } from './helpers'

/**
 * Pindai dan kumpulkan daftar kontak & nomor WhatsApp dari:
 * 1. Obrolan yang sedang aktif/terbuka di WhatsApp Web (#main)
 * 2. Daftar obrolan inbox di panel kiri (#pane-side / #side)
 * 3. Database CRM Kontak pengguna (tersimpan di storage)
 * 4. Hasil ekstraksi grup (Group Grabber)
 */
export async function scanInboxChatsAndContacts(): Promise<InboxContactItem[]> {
  const result: InboxContactItem[] = []
  const seenPhones = new Set<string>()

  // 1. Ambil kontak dari database CRM
  try {
    const crmContacts = await getCRMContacts()
    for (const c of crmContacts) {
      const clean = formatPhoneNumber(c.phone || '')
      if (clean && clean.length >= 8 && !seenPhones.has(clean)) {
        seenPhones.add(clean)
        result.push({
          id: `crm_${c.id || clean}`,
          name: c.name || clean,
          phone: clean,
          source: 'crm',
          lastMessage: c.stage ? `Stage: ${c.stage.toUpperCase()}` : (c.notes || undefined)
        })
      }
    }
  } catch (e) {
    console.warn('[AMAN CHAT] Error loading CRM contacts:', e)
  }

  // 2. Ambil kontak dari Group Grabber (jika ada)
  try {
    const grabbed = await getGrabbedContacts()
    for (const g of grabbed) {
      const clean = formatPhoneNumber(g.phone || '')
      if (clean && clean.length >= 8 && !seenPhones.has(clean)) {
        seenPhones.add(clean)
        result.push({
          id: `grab_${g.id || clean}`,
          name: g.name || clean,
          phone: clean,
          source: 'grabber',
          lastMessage: `Grup: ${g.groupName || 'WhatsApp Group'}`
        })
      }
    }
  } catch (e) {
    console.warn('[AMAN CHAT] Error loading grabbed contacts:', e)
  }

  // 3. Pindai obrolan inbox langsung dari DOM WhatsApp Web (#pane-side)
  try {
    const sidePane = document.querySelector('#pane-side') || document.querySelector('#side')
    if (sidePane) {
      // Ambil semua elemen baris chat
      const chatRows = Array.from(sidePane.querySelectorAll(
        '[data-testid="chat-list-item"], div[role="listitem"], div[data-testid="cell-frame-container"]'
      )) as HTMLElement[]

      for (const row of chatRows) {
        // Abaikan grup WhatsApp, komunitas, dan channel
        const isGroup = Boolean(
          row.querySelector('[data-icon="default-group"]') ||
          row.querySelector('[data-testid="default-group"]') ||
          row.querySelector('span[data-testid="avatar-group"]') ||
          row.querySelector('[data-icon="community"]') ||
          row.querySelector('[data-icon="channel-filled"]') ||
          row.querySelector('[data-icon="newsletter"]') ||
          row.querySelector('[data-icon="broadcast"]')
        )
        if (isGroup) continue

        // Ambil elemen judul / nama chat
        const titleEl = row.querySelector('span[title]') ||
                        row.querySelector('div[data-testid="cell-frame-title"] span') ||
                        row.querySelector('div[role="gridcell"] span[title]') ||
                        row.querySelector('span[dir="auto"]')
        const rawTitle = titleEl?.getAttribute('title') || titleEl?.textContent?.trim() || ''
        if (!rawTitle) continue

        const titleDigits = rawTitle.replace(/[^0-9]/g, '')
        let detectedPhone = ''
        let contactName = rawTitle

        // Jika judul sendiri adalah nomor telepon (misal: +62 812-3456-7890)
        if (titleDigits.length >= 8 && (rawTitle.startsWith('+') || rawTitle.startsWith('08') || rawTitle.startsWith('62') || /^[0-9\s\-()]+$/.test(rawTitle))) {
          detectedPhone = formatPhoneNumber(rawTitle)
        }

        // Cek URL avatar untuk parameter JID pengguna: u=628xxx%40c.us
        const img = row.querySelector('img')
        const imgSrc = img?.getAttribute('src') || ''
        if (!detectedPhone && imgSrc) {
          const m = imgSrc.match(/([0-9]{8,16})(@c\.us|%40c\.us)/) || imgSrc.match(/[?&]u=([0-9]{8,16})/i)
          if (m && m[1]) {
            detectedPhone = formatPhoneNumber(m[1])
          }
        }

        // Cek atribut data-id (false_628xxx@c.us_...)
        if (!detectedPhone) {
          const dataId = row.getAttribute('data-id') || row.querySelector('[data-id]')?.getAttribute('data-id') || ''
          const m = dataId.match(/([0-9]{8,16})@c\.us/)
          if (m && m[1]) {
            detectedPhone = formatPhoneNumber(m[1])
          }
        }

        // Cek snippet pesan terakhir untuk info ringkas
        const snippetEl = row.querySelector('[data-testid="last-msg-status"]') ||
                          row.querySelector('div[data-testid="cell-frame-secondary"]') ||
                          row.querySelector('span[dir="ltr"]')
        const snippet = snippetEl?.textContent?.trim() || ''

        // Jika nomor belum terdeteksi dari DOM, cocokkan dengan nama di database CRM/Grabber
        if (!detectedPhone) {
          const matched = result.find(r => r.name.toLowerCase() === rawTitle.toLowerCase())
          if (matched) {
            detectedPhone = matched.phone
          }
        }

        if (detectedPhone && detectedPhone.length >= 8) {
          if (!seenPhones.has(detectedPhone)) {
            seenPhones.add(detectedPhone)
            result.unshift({
              id: `inbox_${detectedPhone}`,
              name: contactName !== detectedPhone ? contactName : '',
              phone: detectedPhone,
              source: 'inbox',
              lastMessage: snippet || undefined,
              avatarUrl: imgSrc || undefined
            })
          } else {
            // Update nama kontak jika sebelumnya kosong atau hanya nomor
            const existing = result.find(r => r.phone === detectedPhone)
            if (existing && contactName && contactName !== detectedPhone && (!existing.name || existing.name === existing.phone)) {
              existing.name = contactName
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('[AMAN CHAT] Error scanning inbox DOM:', e)
  }

  // 4. Periksa obrolan yang sedang aktif di layar utama WhatsApp Web (#main header)
  try {
    const mainHeader = document.querySelector('#main header')
    if (mainHeader) {
      const isGroup = Boolean(
        mainHeader.querySelector('[data-icon="default-group"]') ||
        mainHeader.querySelector('[data-testid="default-group"]') ||
        mainHeader.querySelector('span[data-testid="avatar-group"]') ||
        mainHeader.querySelector('[data-icon="community"]')
      )

      if (!isGroup) {
        const headerTitleEl = mainHeader.querySelector('[title]') || mainHeader.querySelector('span[dir="auto"]')
        const headerText = headerTitleEl?.getAttribute('title') || headerTitleEl?.textContent?.trim() || ''
        const digits = headerText.replace(/[^0-9]/g, '')
        if (digits.length >= 8) {
          const clean = formatPhoneNumber(digits)
          if (!seenPhones.has(clean)) {
            seenPhones.add(clean)
            result.unshift({
              id: `active_${clean}`,
              name: headerText !== digits ? headerText : '',
              phone: clean,
              source: 'active_chat',
              lastMessage: 'Chat Aktif Terbuka'
            })
          }
        }
      }
    }
  } catch (e) {
    console.warn('[AMAN CHAT] Error reading active chat header:', e)
  }

  return result
}
