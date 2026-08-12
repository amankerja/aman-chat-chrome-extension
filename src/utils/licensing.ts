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

export function isValidLicenseFormat(rawKey: string): boolean {
  const key = rawKey.trim().toUpperCase()
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
export function generateLicenseKey(seed: string): string {
  const clean = seed.toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(8, '0')
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

export async function verifyLicenseKey(rawKey: string): Promise<LicenseVerificationResult> {
  if (!isValidLicenseFormat(rawKey)) {
    return { valid: false, reason: 'bad_format', message: 'Format lisensi tidak valid.' }
  }

  if (remoteVerify) {
    try {
      const ok = await remoteVerify(rawKey.trim().toUpperCase())
      return ok ? { valid: true } : { valid: false, reason: 'remote_rejected', message: 'Lisensi ditolak oleh server.' }
    } catch {
      return { valid: false, reason: 'remote_unreachable', message: 'Gagal terhubung ke server lisensi.' }
    }
  }

  return { valid: true }
}

export async function verifySpreadsheetLicense(
  serialNumber: string,
  apiUrl: string
): Promise<LicenseVerificationResult> {
  const cleanSerial = serialNumber.trim().toUpperCase()
  if (!cleanSerial) {
    return { valid: false, message: 'Harap masukkan Serial Number lisensi!' }
  }

  const deviceId = await getDeviceId()

  if (!apiUrl || !apiUrl.startsWith('http')) {
    if (isValidLicenseFormat(cleanSerial)) {
      return {
        valid: true,
        message: 'Lisensi lokal berhasil diverifikasi.',
        details: {
          serialNumber: cleanSerial,
          status: 'Active',
          deviceId,
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
    const url = new URL(apiUrl)
    url.searchParams.append('action', 'verify')
    url.searchParams.append('serial', cleanSerial)
    url.searchParams.append('device_id', deviceId)
    url.searchParams.append('sheet', 'WHATSAPP-V1')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })

    if (!response.ok) {
      return { valid: false, message: `Server API Lisensi merespons error ${response.status}` }
    }

    const data = await response.json()
    if (data.status === 'success' || data.valid === true) {
      const details: LicenseDetails = {
        serialNumber: data.serialNumber || cleanSerial,
        status: data.status || 'Active',
        deviceId: data.deviceId || deviceId,
        email: data.email || '',
        phone: data.phone || '',
        purchaseDate: data.purchaseDate || '',
        expiryDate: data.expiryDate || '',
        duration: data.duration || '',
        lastVerified: Date.now()
      }
      return { valid: true, message: data.message || 'Lisensi Google Spreadsheet Aktif!', details }
    } else {
      return { valid: false, message: data.message || 'Lisensi tidak valid atau telah expired.' }
    }
  } catch (e: any) {
    console.warn('[AMAN CHAT] License Spreadsheet API error:', e)
    if (isValidLicenseFormat(cleanSerial)) {
      return {
        valid: true,
        message: 'Koneksi ke server lisensi terganggu. Menggunakan lisensi lokal.',
        details: {
          serialNumber: cleanSerial,
          status: 'Active',
          deviceId,
          lastVerified: Date.now()
        }
      }
    }
    return { valid: false, message: 'Gagal terhubung ke Google Apps Script Spreadsheet API!' }
  }
}
