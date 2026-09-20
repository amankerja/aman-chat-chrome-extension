import type { LicenseDetails } from '../types'
import { getDeviceId } from './storage'

const GROUP_LEN = 4
const PREFIX = 'AMAN'

function checksumGroup(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash.toString(36).toUpperCase().padStart(GROUP_LEN, '0').slice(-GROUP_LEN)
}

export function isValidLicenseFormat(rawKey: any): boolean {
  if (!rawKey) return false
  const key = String(rawKey).trim().toUpperCase()
  if (key.startsWith('SM-') || key.startsWith('AMAN-')) return true
  const parts = key.split('-')
  if (parts.length !== 4) return false
  const [prefix, g1, g2, checksum] = parts
  if (prefix !== PREFIX) return false
  if (g1.length !== GROUP_LEN || g2.length !== GROUP_LEN || checksum.length !== GROUP_LEN) return false
  if (!/^[A-Z0-9]{4}$/.test(g1) || !/^[A-Z0-9]{4}$/.test(g2)) return false
  return checksumGroup(`${prefix}-${g1}-${g2}`) === checksum
}

/** Helper for generating valid demo keys (e.g. from an admin/testing tool). */
export function generateLicenseKey(seed: any): string {
  const clean = String(seed || '').toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(8, '0')
  const g1 = clean.slice(0, 4)
  const g2 = clean.slice(4, 8)
  const checksum = checksumGroup(`${PREFIX}-${g1}-${g2}`)
  return `${PREFIX}-${g1}-${g2}-${checksum}`
}

export interface LicenseVerificationResult {
  valid: boolean
  message?: string
  reason?: 'bad_format' | 'remote_rejected' | 'remote_unreachable' | 'expired' | 'device_mismatch'
  details?: LicenseDetails
}

export type RemoteVerifier = (key: string) => Promise<boolean>
let remoteVerify: RemoteVerifier | null = null

export function setRemoteLicenseVerifier(fn: RemoteVerifier | null): void {
  remoteVerify = fn
}

export async function verifyLicenseKey(rawKey: any): Promise<LicenseVerificationResult> {
  const cleanKey = String(rawKey || '').trim().toUpperCase()
  if (!isValidLicenseFormat(cleanKey)) {
    return { valid: false, reason: 'bad_format', message: 'Format lisensi tidak valid.' }
  }

  if (remoteVerify) {
    try {
      const ok = await remoteVerify(cleanKey)
      return ok ? { valid: true } : { valid: false, reason: 'remote_rejected', message: 'Lisensi ditolak oleh server.' }
    } catch {
      return { valid: false, reason: 'remote_unreachable', message: 'Gagal terhubung ke server lisensi.' }
    }
  }

  return { valid: true }
}

export async function verifySpreadsheetLicense(
  serialNumber: any,
  email: any = '',
  phone: any = '',
  apiUrl: any = ''
): Promise<LicenseVerificationResult> {
  const cleanSerial = String(serialNumber || '').trim().toUpperCase()
  const cleanEmail = String(email || '').trim()
  const cleanPhone = String(phone || '').trim()
  const cleanApiUrl = String(apiUrl || '').trim()

  if (!cleanSerial) {
    return { valid: false, message: 'Harap masukkan Serial Number lisensi!' }
  }

  const deviceId = await getDeviceId()

  if (!cleanApiUrl || !cleanApiUrl.startsWith('http')) {
    if (isValidLicenseFormat(cleanSerial)) {
      return {
        valid: true,
        message: 'Lisensi lokal berhasil diverifikasi.',
        details: {
          serialNumber: cleanSerial,
          status: 'Active',
          deviceId,
          email: cleanEmail,
          phone: cleanPhone,
          duration: 'Lifetime',
          lastVerified: Date.now()
        }
      }
    } else {
      return {
        valid: false,
        message: 'Format Serial Number tidak valid! (Contoh: SM-2026-ABC1 atau AMAN-XXXX-XXXX-CCCC)'
      }
    }
  }

  try {
    const url = new URL(cleanApiUrl)
    url.searchParams.append('app', 'whatsappv1')
    url.searchParams.append('sn', cleanSerial)
    url.searchParams.append('deviceId', deviceId)
    if (cleanEmail) url.searchParams.append('email', cleanEmail)
    if (cleanPhone) url.searchParams.append('no_telepon', cleanPhone)

    const response = await fetch(url.toString(), {
      method: 'GET'
    })

    if (!response.ok) {
      return { valid: false, message: `Server API Lisensi merespons error HTTP ${response.status}` }
    }

    const rawText = String((await response.text()) || '').trim()

    // First try parsing as JSON (Apps Script JSON response)
    try {
      const data = JSON.parse(rawText)
      if (data && (data.status === 'success' || data.status === 'ACTIVATED' || data.status === 'SUCCESS' || data.valid === true)) {
        const details: LicenseDetails = {
          serialNumber: String(data.serialNumber || cleanSerial).trim(),
          status: 'Active',
          deviceId: String(data.deviceId || deviceId).trim(),
          email: String(data.email !== undefined && data.email !== null ? data.email : cleanEmail).trim(),
          phone: String(data.phone !== undefined && data.phone !== null ? data.phone : cleanPhone).trim(),
          purchaseDate: String(data.purchaseDate || '').trim(),
          expiryDate: String(data.expiryDate || '').trim(),
          duration: String(data.duration || '').trim(),
          lastVerified: Date.now()
        }
        return { valid: true, message: data.message ? String(data.message) : 'Aktivasi Lisensi Berhasil!', details }
      } else {
        return { valid: false, message: data && data.message ? String(data.message) : 'Lisensi tidak valid atau telah expired.' }
      }
    } catch {
      // Text fallback from router.gs
      if (rawText === 'ACTIVATED' || rawText === 'SUCCESS') {
        const details: LicenseDetails = {
          serialNumber: cleanSerial,
          status: 'Active',
          deviceId,
          email: cleanEmail,
          phone: cleanPhone,
          lastVerified: Date.now()
        }
        const msg = rawText === 'ACTIVATED' 
          ? 'Aktivasi lisensi berhasil! Data email & No. WhatsApp telah terdaftar.' 
          : 'Lisensi aktif dan valid di perangkat ini.'
        return { valid: true, message: msg, details }
      } else if (rawText === 'ALREADY_USED') {
        return { valid: false, message: 'Serial Number ini sudah digunakan di perangkat lain (Device ID Mismatch).' }
      } else if (rawText === 'INACTIVE') {
        return { valid: false, message: 'Status lisensi Anda tidak aktif (Inactive/Suspended).' }
      } else if (rawText === 'INVALID') {
        return { valid: false, message: 'Serial Number tidak ditemukan di server!' }
      } else if (rawText === 'ERROR_SHEET_NOT_FOUND') {
        return { valid: false, message: 'Server lisensi tidak terjangkau saat ini.' }
      } else {
        return { valid: false, message: `Respon server: ${rawText}` }
      }
    }
  } catch (e: any) {
    console.warn('[AMAN CHAT] License API error:', e)
    if (isValidLicenseFormat(cleanSerial)) {
      return {
        valid: true,
        message: 'Koneksi ke server terganggu. Menggunakan verifikasi lisensi lokal.',
        details: {
          serialNumber: cleanSerial,
          status: 'Active',
          deviceId,
          email: cleanEmail,
          phone: cleanPhone,
          lastVerified: Date.now()
        }
      }
    }
    return { valid: false, message: 'Gagal terhubung ke Server Lisensi! Periksa koneksi internet.' }
  }
}
